import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const typeColors = {
  pain_point: 'bg-red-100 text-red-700',
  feature_request: 'bg-blue-100 text-blue-700',
  competitor_mention: 'bg-yellow-100 text-yellow-700',
  trend: 'bg-green-100 text-green-700',
};

export default function RecentSignals() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-signals'],
    queryFn: () => api.get('/signals?limit=10').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="text-sm font-medium mb-4">Recent Signals</h3>
      <div className="space-y-3">
        {(data || []).map((signal) => (
          <div key={signal.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[signal.type] || 'bg-gray-100 text-gray-700'}`}
            >
              {signal.type.replace('_', ' ')}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{signal.title}</p>
              <p className="text-xs text-muted-foreground truncate">{signal.content}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">{Math.round(signal.confidence * 100)}%</p>
              <p className="text-xs text-muted-foreground">confidence</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
