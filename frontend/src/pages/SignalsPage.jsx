import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const typeColors = {
  pain_point: 'bg-red-100 text-red-700',
  feature_request: 'bg-blue-100 text-blue-700',
  competitor_mention: 'bg-yellow-100 text-yellow-700',
  trend: 'bg-green-100 text-green-700',
};

export default function SignalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['signals', type, searchQuery],
    queryFn: () => {
      if (searchQuery) {
        return api.get('/signals/search', { params: { q: searchQuery } }).then((r) => r.data);
      }
      return api.get('/signals', { params: { type: type || undefined, limit: 50 } }).then((r) => r.data);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Signals</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search signals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm bg-background w-64"
          />
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setSearchQuery(''); }}
            className="px-3 py-1.5 border rounded-md text-sm bg-background"
          >
            <option value="">All Types</option>
            <option value="pain_point">Pain Points</option>
            <option value="feature_request">Feature Requests</option>
            <option value="competitor_mention">Competitor Mentions</option>
            <option value="trend">Trends</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-lg bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Content</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Confidence</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">Momentum</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data || []).map((signal) => (
                <tr key={signal.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[signal.type] || ''}`}>
                      {signal.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium">{signal.title}</td>
                  <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">{signal.content}</td>
                  <td className="p-3 text-sm text-right">{Math.round(signal.confidence * 100)}%</td>
                  <td className="p-3 text-sm text-right">{Math.round(signal.momentum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
