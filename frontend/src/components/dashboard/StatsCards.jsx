import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Zap, TrendingUp, Database, Eye } from 'lucide-react';

export default function StatsCards() {
  const { data } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });

  const stats = [
    { label: 'Total Signals', value: data?.totalSignals || 0, icon: Zap, color: 'text-blue-500' },
    { label: 'Opportunities', value: data?.totalOpportunities || 0, icon: TrendingUp, color: 'text-green-500' },
    { label: 'Sources', value: data?.totalSources || 0, icon: Database, color: 'text-purple-500' },
    { label: 'Posts Scraped', value: data?.totalPosts || 0, icon: Eye, color: 'text-orange-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
