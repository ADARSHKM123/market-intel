import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const sourceLabels = {
  hackernews: 'Hacker News',
  youtube: 'YouTube',
  devto: 'Dev.to',
  github_trending: 'GitHub Trending',
  producthunt: 'Product Hunt',
};

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [directResult, setDirectResult] = useState(null);
  const [clusterResult, setClusterResult] = useState(null);

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => api.get('/admin/jobs').then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/db-stats').then((r) => r.data.data),
  });

  const triggerMutation = useMutation({
    mutationFn: (source) => api.post(`/admin/scrape/${source}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }),
  });

  const directScrapeMutation = useMutation({
    mutationFn: (source) => api.post(`/admin/scrape-direct/${source}`),
    onSuccess: (res) => {
      setDirectResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const clusterMutation = useMutation({
    mutationFn: () => api.post('/admin/cluster-direct'),
    onSuccess: (res) => {
      setClusterResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (jobsLoading || statsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin</h2>

      {/* Manual Scrape Triggers */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium mb-1">Manual Scrape (via Queue)</h3>
        <p className="text-xs text-muted-foreground mb-3">Requires Redis. Jobs run in background.</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(sourceLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => triggerMutation.mutate(key)}
              disabled={triggerMutation.isPending}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Direct Scrape (no Redis) */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium mb-1">Direct Scrape (no Redis)</h3>
        <p className="text-xs text-muted-foreground mb-3">Runs synchronously. May take a moment.</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(sourceLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setDirectResult(null); directScrapeMutation.mutate(key); }}
              disabled={directScrapeMutation.isPending}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-accent disabled:opacity-50"
            >
              {directScrapeMutation.isPending && directScrapeMutation.variables === key ? 'Scraping...' : label}
            </button>
          ))}
        </div>
        {directResult && (
          <div className="mt-3 p-3 rounded bg-muted text-sm">
            <span className="font-medium">{directResult.source}:</span>{' '}
            {directResult.newPosts} new posts, {directResult.nlpProcessed} processed via NLP
            {directResult.errors > 0 && <span className="text-destructive"> ({directResult.errors} errors)</span>}
          </div>
        )}
      </div>

      {/* Cluster into Opportunities */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium mb-1">Cluster Signals into Opportunities</h3>
        <p className="text-xs text-muted-foreground mb-3">Groups unlinked signals into opportunity clusters using NLP. Requires NLP service running.</p>
        <button
          onClick={() => { setClusterResult(null); clusterMutation.mutate(); }}
          disabled={clusterMutation.isPending}
          className="px-4 py-2 border rounded-md text-sm hover:bg-accent disabled:opacity-50"
        >
          {clusterMutation.isPending ? 'Clustering...' : 'Run Clustering'}
        </button>
        {clusterResult && (
          <div className="mt-3 p-3 rounded bg-muted text-sm">
            {clusterResult.status === 'completed' ? (
              <>
                <span className="font-medium">Done:</span>{' '}
                {clusterResult.signalsProcessed} signals processed,{' '}
                {clusterResult.clustersFound} clusters found,{' '}
                <span className="font-semibold text-primary">{clusterResult.opportunitiesCreated} opportunities created</span>
              </>
            ) : (
              <span>{clusterResult.reason || clusterResult.status} ({clusterResult.signalCount || 0} signals available)</span>
            )}
          </div>
        )}
      </div>

      {/* Queue Status */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium mb-3">Queue Status</h3>
        {jobs?.message ? (
          <p className="text-sm text-muted-foreground">{jobs.message}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(jobs || {}).map(([queue, counts]) => {
              if (typeof counts !== 'object') return null;
              return (
                <div key={queue} className="border rounded-lg p-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">{queue}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Waiting</span>
                      <span className="font-medium">{counts.waiting || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active</span>
                      <span className="font-medium">{counts.active || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed</span>
                      <span className="font-medium">{counts.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed</span>
                      <span className="font-medium text-destructive">{counts.failed || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DB Stats */}
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium mb-3">Database Stats</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Object.entries(stats || {}).map(([table, count]) => (
            <div key={table} className="text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{table}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
