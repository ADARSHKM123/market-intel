import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

export default function OpportunitiesPage() {
  const navigate = useNavigate();
  const [sort, setSort] = useState('momentum');
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', sort, category],
    queryFn: () =>
      api.get('/opportunities', { params: { sort, category: category || undefined, limit: 50 } })
        .then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Opportunities</h2>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm bg-background"
          >
            <option value="momentum">Momentum</option>
            <option value="score">Score</option>
            <option value="newest">Newest</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 border rounded-md text-sm bg-background"
          >
            <option value="">All Categories</option>
            <option value="saas">SaaS</option>
            <option value="tool">Tool</option>
            <option value="physical">Physical</option>
            <option value="service">Service</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.data || []).map((opp) => (
            <div
              key={opp.id}
              onClick={() => navigate(`/opportunities/${opp.id}`)}
              className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold leading-tight">{opp.title}</h3>
                <span className="text-lg font-bold text-primary">{Math.round(opp.score)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opp.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[opp.category] || ''}`}>
                  {opp.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[opp.status] || ''}`}>
                  {opp.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{opp._count?.signals || 0} signals</span>
                <span>Momentum: {Math.round(opp.momentum)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
