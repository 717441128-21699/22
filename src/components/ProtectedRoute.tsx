import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import type { UserRole } from '../../shared/types';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
}: ProtectedRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
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
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (requiredRoles.length > 0 && !hasPermission(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 flex items-center justify-center p-6">
        <div className="glass-card p-10 max-w-md w-full text-center animate-fadeInUp">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">您没有权限访问该页面</h2>
          <p className="text-white/60 mb-8 text-sm leading-relaxed">
            您当前的账号角色（{user?.role || '未知'}）不具备访问此页面所需的权限。
            请联系管理员或返回首页。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-all border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回上一页</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium transition-all shadow-lg shadow-emerald-500/20"
            >
              <Home className="w-4 h-4" />
              <span>返回首页</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
