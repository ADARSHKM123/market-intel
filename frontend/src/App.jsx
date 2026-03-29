import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OpportunitiesPage from '@/pages/OpportunitiesPage';
import OpportunityDetailPage from '@/pages/OpportunityDetailPage';
import SignalsPage from '@/pages/SignalsPage';
import SourcesPage from '@/pages/SourcesPage';
import WatchesPage from '@/pages/WatchesPage';
import AdminPage from '@/pages/AdminPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="signals" element={<SignalsPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="watches" element={<WatchesPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}
