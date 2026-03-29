import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function WatchesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['watches'],
    queryFn: () => api.get('/watches').then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Watches</h2>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-lg bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Target</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((watch) => (
                <tr key={watch.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                      {watch.type}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium">{watch.target}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        watch.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {watch.enabled ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(watch.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
