import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/api/client';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function TrendChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => api.get('/analytics/trends?days=30').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const chartData = (data || []).map((d) => ({
    date: d.date,
    mentions: d.totalMentions,
  }));

  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="text-sm font-medium mb-4">Signal Trends (30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip
            labelFormatter={(d) => new Date(d).toLocaleDateString()}
            contentStyle={{ fontSize: '12px' }}
          />
          <Area
            type="monotone"
            dataKey="mentions"
            stroke="hsl(222.2, 47.4%, 11.2%)"
            fill="hsl(222.2, 47.4%, 11.2%)"
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
