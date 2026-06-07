import { useState } from 'react';
import {
  Recycle,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';
import type { User as UserType } from '../../shared/types';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 600));

      const mockUser: UserType = {
        id: 'U001',
        username: 'admin',
        name: '国家管理员',
        role: 'national',
        regionCode: '000000',
        regionName: '全国',
      };

      login(mockUser, 'mock-token');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-eco-400 to-eco-600 text-white text-2xl font-bold shadow-glow-eco mb-4">
            <Recycle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">垃圾分类监测平台</h1>
          <p className="text-white/50 text-sm">请登录您的账户</p>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-white/70 mb-1.5">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              登录
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-white/40">
            演示账号：admin / 123456
          </p>
        </div>
      </div>
    </div>
  );
}
