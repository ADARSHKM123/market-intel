import StatsCards from '@/components/dashboard/StatsCards';
import TrendChart from '@/components/dashboard/TrendChart';
import RecentSignals from '@/components/dashboard/RecentSignals';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart />
        <RecentSignals />
      </div>
    </div>
  );
}
