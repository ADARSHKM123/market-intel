import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const sourceTypeInfo = {
  hackernews: { label: 'Hacker News', badge: 'HN', color: 'bg-orange-100 text-orange-700' },
  youtube: { label: 'YouTube', badge: 'YT', color: 'bg-red-100 text-red-700' },
  devto: { label: 'Dev.to', badge: 'DEV', color: 'bg-indigo-100 text-indigo-700' },
  github_trending: { label: 'GitHub', badge: 'GH', color: 'bg-gray-800 text-white' },
  producthunt: { label: 'Product Hunt', badge: 'PH', color: 'bg-amber-100 text-amber-700' },
};

export default function SourcesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => api.get('/sources').then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sources</h2>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-lg bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Platform</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Posts</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Last Scraped</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((source) => {
                const info = sourceTypeInfo[source.type] || { label: source.type, badge: '?', color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={source.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-3 text-sm font-medium">{source.name}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${info.color}`}>
                        <span className="font-bold">{info.badge}</span>
                        {info.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          source.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {source.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-right">{source._count?.rawPosts || 0}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {source.lastScrapedAt
                        ? new Date(source.lastScrapedAt).toLocaleString()
                        : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
