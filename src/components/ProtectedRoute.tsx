import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { UserRole } from '../../shared/types';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, hasPermission, user } = useAuthStore();

  if (!user && typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.isAuthenticated) {
          return (
            <div className="flex min-h-screen items-center justify-center">
              <LoadingSpinner size="lg" label="加载中..." />
            </div>
          );
        }
      } catch {
        // ignore
      }
    }
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requiredRoles.length > 0 && !hasPermission(requiredRoles)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-6xl">🚫</div>
        <h2 className="text-xl font-semibold text-white">无权限访问</h2>
        <p className="text-white/60">您的账号没有权限访问该页面</p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return <>{children}</>;
}
