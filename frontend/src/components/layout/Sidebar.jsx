import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Database,
  Eye,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/opportunities', icon: TrendingUp, label: 'Opportunities' },
  { to: '/signals', icon: Zap, label: 'Signals' },
  { to: '/sources', icon: Database, label: 'Sources' },
  { to: '/watches', icon: Eye, label: 'Watches' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Market Intel</h1>
        <p className="text-sm text-muted-foreground">Signal Intelligence</p>
      </div>
      <nav className="space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
