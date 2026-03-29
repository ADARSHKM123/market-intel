import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, TrendingUp, BarChart3, Clock, Tag, Layers } from 'lucide-react';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const categoryColors = {
  saas: 'bg-blue-100 text-blue-700',
  tool: 'bg-purple-100 text-purple-700',
  physical: 'bg-orange-100 text-orange-700',
  service: 'bg-green-100 text-green-700',
  content: 'bg-pink-100 text-pink-700',
};

const statusColors = {
  identified: 'bg-gray-100 text-gray-700',
  validated: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  launched: 'bg-purple-100 text-purple-700',
  archived: 'bg-red-100 text-red-700',
};

const signalTypeColors = {
  pain_point: 'bg-red-100 text-red-700',
  feature_request: 'bg-amber-100 text-amber-700',
  trend: 'bg-emerald-100 text-emerald-700',
  competitor_mention: 'bg-indigo-100 text-indigo-700',
};

const sourceTypeIcons = {
  hackernews: 'HN',
  youtube: 'YT',
  devto: 'DEV',
  github_trending: 'GH',
  producthunt: 'PH',
};

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: opp, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => api.get(`/opportunities/${id}`).then((r) => r.data.data),
  });

  const { data: trendData } = useQuery({
    queryKey: ['opportunity-trend', id],
    queryFn: () => api.get(`/opportunities/${id}/trend?days=30`).then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!opp) return <div className="text-center py-12 text-muted-foreground">Opportunity not found</div>;

  const signals = (opp.signals || []).map((so) => ({
    ...so.signal,
    weight: so.weight,
  }));

  // Compute source breakdown from signals
  const sourceBreakdown = {};
  for (const sig of signals) {
    const source = sig.rawPost?.source;
    if (source) {
      if (!sourceBreakdown[source.type]) {
        sourceBreakdown[source.type] = { name: source.name, type: source.type, count: 0 };
      }
      sourceBreakdown[source.type].count++;
    }
  }

  // Mini sparkline from trend data
  const trendPoints = (trendData || []).map((t) => t.momentum);
  const trendMax = Math.max(...trendPoints, 1);
  const trendMin = Math.min(...trendPoints, 0);
  const trendRange = trendMax - trendMin || 1;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/opportunities')}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{opp.title}</h2>
          <p className="text-muted-foreground mt-1">{opp.description}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <BarChart3 className="w-4 h-4" />
            Score
          </div>
          <div className="text-2xl font-bold">{Math.round(opp.score)}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            Momentum
          </div>
          <div className="text-2xl font-bold">{Math.round(opp.momentum)}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Layers className="w-4 h-4" />
            Signals
          </div>
          <div className="text-2xl font-bold">{opp._count?.signals || 0}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            Identified
          </div>
          <div className="text-sm font-medium">{new Date(opp.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Tags Row */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[opp.category] || ''}`}>
          <Tag className="w-3 h-3 inline mr-1" />
          {opp.category}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[opp.status] || ''}`}>
          {opp.status.replace('_', ' ')}
        </span>
      </div>

      {/* Momentum Trend */}
      {trendPoints.length > 1 && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-3">Momentum Trend (30 days)</h3>
          <div className="flex items-end gap-0.5 h-20">
            {trendPoints.map((val, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/70 rounded-t-sm min-w-[2px] transition-all hover:bg-primary"
                style={{ height: `${((val - trendMin) / trendRange) * 100}%` }}
                title={`Day ${i + 1}: ${Math.round(val)}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Source Breakdown */}
      {Object.keys(sourceBreakdown).length > 0 && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold mb-3">Source Breakdown</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.values(sourceBreakdown).map((src) => (
              <div
                key={src.type}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm"
              >
                <span className="w-7 h-7 rounded bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {sourceTypeIcons[src.type] || '?'}
                </span>
                <div>
                  <div className="font-medium">{src.name}</div>
                  <div className="text-xs text-muted-foreground">{src.count} signal{src.count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signals List */}
      <div className="border rounded-lg bg-card">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">Related Signals ({signals.length})</h3>
        </div>
        <div className="divide-y">
          {signals.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">No signals linked yet</div>
          )}
          {signals.map((signal) => (
            <div key={signal.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${signalTypeColors[signal.type] || 'bg-gray-100 text-gray-700'}`}>
                      {signal.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Confidence: {Math.round(signal.confidence * 100)}%
                    </span>
                    {signal.rawPost?.source && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                        {sourceTypeIcons[signal.rawPost.source.type] || signal.rawPost.source.type}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-sm">{signal.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{signal.content}</p>

                  {/* Source Post Info */}
                  {signal.rawPost && (
                    <div className="mt-2 pl-3 border-l-2 border-muted">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Source:</span> {signal.rawPost.title}
                      </p>
                      {signal.rawPost.author && (
                        <p className="text-xs text-muted-foreground">
                          by {signal.rawPost.author}
                          {signal.rawPost.publishedAt && ` \u00b7 ${new Date(signal.rawPost.publishedAt).toLocaleDateString()}`}
                        </p>
                      )}
                      {signal.rawPost.url && (
                        <a
                          href={signal.rawPost.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                        >
                          View original <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold">{Math.round(signal.momentum)}</div>
                  <div className="text-xs text-muted-foreground">momentum</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
