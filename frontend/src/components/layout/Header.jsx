import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user?.name || user?.email}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
