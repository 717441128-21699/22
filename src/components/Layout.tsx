import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  FileBarChart,
  TrendingUp,
  Users,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';
import { formatRelativeTime } from '../utils/format';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { label: '数据总览', to: '/dashboard', icon: LayoutDashboard },
  { label: '区域监测', to: '/monitor', icon: Map },
  { label: '预警管理', to: '/alerts', icon: AlertTriangle },
  { label: '趋势预测', to: '/forecast', icon: TrendingUp },
  { label: '周报中心', to: '/reports', icon: FileBarChart },
  { label: '用户管理', to: '/admin/users', icon: Users },
];

const roleLabels: Record<string, string> = {
  national: '国家级',
  provincial: '省级',
  municipal: '市级',
  regional: '区级',
};

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alertDropdownOpen, setAlertDropdownOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const { alerts, getActiveCount, getLevel1Count, getLevel2Count } = useAlertStore();

  const activeCount = getActiveCount();
  const level1Count = getLevel1Count();
  const level2Count = getLevel2Count();

  const recentAlerts = alerts
    .filter((a) => a.status === 'active' || a.status === 'processing')
    .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-eco-950/95 backdrop-blur-xl transition-all duration-300 lg:static',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        )}
      >
        <div className={cn('flex h-16 items-center gap-3 border-b border-white/10 px-5', !sidebarOpen && 'lg:justify-center lg:px-0')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-eco-400 to-eco-600 text-white font-bold text-lg shadow-glow-eco">
            垃
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="gradient-text text-base font-semibold leading-tight">垃圾分类</span>
              <span className="text-xs text-white/50">监测管理平台</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  isActive ? 'sidebar-link-active' : 'sidebar-link',
                  !sidebarOpen && 'lg:justify-center lg:px-0'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {sidebarOpen && user && (
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-eco-400 to-eco-600 text-white font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-white">{user.name}</span>
                <span className="truncate text-xs text-white/50">
                  {roleLabels[user.role]} · {user.regionName}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-eco-950/80 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-white">
                {navItems.find((item) => {
                  if (item.to === '/') return location.pathname === '/';
                  return location.pathname.startsWith(item.to);
                })?.label || '数据总览'}
              </h1>
              {user && (
                <p className="text-xs text-white/50">{user.regionName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setAlertDropdownOpen(!alertDropdownOpen);
                  setUserMenuOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Bell className="h-5 w-5" />
                {activeCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning-500 px-1 text-xs font-medium text-white">
                    {activeCount > 99 ? '99+' : activeCount}
                  </span>
                )}
              </button>

              {alertDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-eco-900 shadow-card">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <span className="font-medium text-white">预警提醒</span>
                    <div className="flex gap-2 text-xs">
                      <span className="badge badge-level-1">一级 {level1Count}</span>
                      <span className="badge badge-level-2">二级 {level2Count}</span>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {recentAlerts.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-white/50">
                        暂无预警
                      </div>
                    ) : (
                      recentAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="border-b border-white/5 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'badge',
                                    alert.level === 1 ? 'badge-level-1' : 'badge-level-2'
                                  )}
                                >
                                  {alert.level === 1 ? '一级' : '二级'}
                                </span>
                                <span className="text-sm font-medium text-white truncate">
                                  {alert.regionName}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-white/60 line-clamp-2">
                                {alert.type === 'accuracy' ? '分类准确率' : '收运及时率'}低于阈值
                                {alert.threshold}%，当前 {alert.currentValue}%
                              </p>
                            </div>
                            <span className="flex-shrink-0 text-xs text-white/40">
                              {formatRelativeTime(alert.triggeredAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-white/10 px-4 py-2">
                    <NavLink
                      to="/alerts"
                      onClick={() => setAlertDropdownOpen(false)}
                      className="block py-2 text-center text-sm text-eco-300 hover:text-eco-200 transition-colors"
                    >
                      查看全部预警
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setAlertDropdownOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {user ? (
                  <>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-eco-400 to-eco-600 text-xs font-medium text-white">
                      {user.name.charAt(0)}
                    </div>
                    <span className="hidden sm:block text-sm">{user.name}</span>
                  </>
                ) : (
                  <User className="h-5 w-5" />
                )}
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-eco-900 shadow-card">
                  {user && (
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-xs text-white/50">{user.username}</p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {roleLabels[user.role]} · {user.regionName}
                      </p>
                    </div>
                  )}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {(alertDropdownOpen || userMenuOpen) && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => {
              setAlertDropdownOpen(false);
              setUserMenuOpen(false);
            }}
          />
        )}

        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
