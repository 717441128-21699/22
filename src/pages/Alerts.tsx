import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  Clock,
  ArrowUpRight,
  XCircle,
  User,
  Eye,
  RefreshCw,
  FileWarning,
} from 'lucide-react';
import type { Alert, AlertLevel, AlertType, AlertStatus } from '../../shared/types';
import { useAlertStore } from '../store/alertStore';
import { api } from '../utils/api';
import { formatPercent, formatDate } from '../utils/format';
import { cn } from '../lib/utils';

const LEVEL_CONFIG: Record<AlertLevel, { label: string; color: string; bgColor: string; Icon: typeof AlertTriangle }> = {
  1: { label: '一级预警', color: 'text-warning-400', bgColor: 'bg-warning-500/20 border-warning-400/50', Icon: AlertTriangle },
  2: { label: '二级预警', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-400/50', Icon: ShieldAlert },
};

const TYPE_CONFIG: Record<AlertType, { label: string; color: string }> = {
  accuracy: { label: '分类准确率', color: 'text-data-400' },
  timeliness: { label: '清运及时率', color: 'text-eco-300' },
};

const STATUS_CONFIG: Record<AlertStatus, { label: string; color: string; bgColor: string; Icon: typeof Clock }> = {
  active: { label: '活跃', color: 'text-red-400', bgColor: 'bg-red-500/15', Icon: AlertTriangle },
  processing: { label: '处理中', color: 'text-warning-400', bgColor: 'bg-warning-500/15', Icon: Clock },
  escalated: { label: '已升级', color: 'text-purple-400', bgColor: 'bg-purple-500/15', Icon: ArrowUpRight },
  resolved: { label: '已解决', color: 'text-eco-300', bgColor: 'bg-eco-500/15', Icon: CheckCircle },
};

export default function Alerts() {
  const navigate = useNavigate();
  const { alerts, setAlerts, filters, setFilters, getFilteredAlerts } = useAlertStore();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const levelOptions: { value: AlertLevel | 'all'; label: string }[] = [
    { value: 'all', label: '全部级别' },
    { value: 1, label: '一级预警' },
    { value: 2, label: '二级预警' },
  ];

  const typeOptions: { value: AlertType | 'all'; label: string }[] = [
    { value: 'all', label: '全部类型' },
    { value: 'accuracy', label: '分类准确率' },
    { value: 'timeliness', label: '清运及时率' },
  ];

  const statusOptions: { value: AlertStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '活跃' },
    { value: 'processing', label: '处理中' },
    { value: 'escalated', label: '已升级' },
    { value: 'resolved', label: '已解决' },
  ];

  async function loadAlerts() {
    setLoadingData(true);
    try {
      const data = await api.get<Alert[]>('/alerts');
      setAlerts(data);
    } catch (err) {
      console.error('加载预警数据失败', err);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({ keyword: searchKeyword });
    }, 200);
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  const filteredAlerts = useMemo(() => getFilteredAlerts(), [alerts, filters]);

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      level1: alerts.filter((a) => a.level === 1).length,
      level2: alerts.filter((a) => a.level === 2).length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      active: alerts.filter((a) => a.status === 'active' || a.status === 'processing').length,
    };
  }, [alerts]);

  const currentLevelLabel = levelOptions.find((o) => o.value === filters.level)?.label || '全部级别';
  const currentTypeLabel = typeOptions.find((o) => o.value === filters.type)?.label || '全部类型';
  const currentStatusLabel = statusOptions.find((o) => o.value === filters.status)?.label || '全部状态';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">智能预警中心</h1>
          <p className="mt-1 text-sm text-white/60">实时监测垃圾分类关键指标，智能预警异常情况</p>
        </div>
        <button
          onClick={loadAlerts}
          disabled={loadingData}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10',
            loadingData && 'opacity-50'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', loadingData && 'animate-spin')} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-data-500/20 to-data-700/20 p-5">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <FileWarning className="h-4 w-4" />
            预警总数
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-white/40">全部记录</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-warning-500/20 to-warning-700/20 p-5">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <AlertTriangle className="h-4 w-4 text-warning-400" />
            一级预警
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-warning-400">{stats.level1}</span>
            <span className="text-xs text-white/40">{stats.total > 0 ? formatPercent((stats.level1 / stats.total) * 100, 0) : '0%'}</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-red-500/20 to-red-700/20 p-5">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            二级预警
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-red-400">{stats.level2}</span>
            <span className="text-xs text-white/40">{stats.total > 0 ? formatPercent((stats.level2 / stats.total) * 100, 0) : '0%'}</span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-eco-500/20 to-eco-700/20 p-5">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <CheckCircle className="h-4 w-4 text-eco-300" />
            已解决
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-eco-300">{stats.resolved}</span>
            <span className="text-xs text-white/40">{stats.total > 0 ? formatPercent((stats.resolved / stats.total) * 100, 0) : '0%'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-1.5 text-sm text-white/60">
          <Filter className="h-4 w-4" />
          筛选：
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setLevelDropdownOpen(!levelDropdownOpen);
              setTypeDropdownOpen(false);
              setStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-eco-950 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            {currentLevelLabel}
            <ChevronDown className={cn('h-4 w-4 transition-transform', levelDropdownOpen && 'rotate-180')} />
          </button>
          {levelDropdownOpen && (
            <div className="absolute left-0 z-10 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-eco-900 shadow-lg">
              {levelOptions.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    setFilters({ level: opt.value });
                    setLevelDropdownOpen(false);
                  }}
                  className={cn(
                    'block w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/10',
                    filters.level === opt.value && 'bg-white/10 text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setTypeDropdownOpen(!typeDropdownOpen);
              setLevelDropdownOpen(false);
              setStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-eco-950 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            {currentTypeLabel}
            <ChevronDown className={cn('h-4 w-4 transition-transform', typeDropdownOpen && 'rotate-180')} />
          </button>
          {typeDropdownOpen && (
            <div className="absolute left-0 z-10 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-eco-900 shadow-lg">
              {typeOptions.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    setFilters({ type: opt.value });
                    setTypeDropdownOpen(false);
                  }}
                  className={cn(
                    'block w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/10',
                    filters.type === opt.value && 'bg-white/10 text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setStatusDropdownOpen(!statusDropdownOpen);
              setLevelDropdownOpen(false);
              setTypeDropdownOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-eco-950 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            {currentStatusLabel}
            <ChevronDown className={cn('h-4 w-4 transition-transform', statusDropdownOpen && 'rotate-180')} />
          </button>
          {statusDropdownOpen && (
            <div className="absolute left-0 z-10 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-eco-900 shadow-lg">
              {statusOptions.map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    setFilters({ status: opt.value });
                    setStatusDropdownOpen(false);
                  }}
                  className={cn(
                    'block w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/10',
                    filters.status === opt.value && 'bg-white/10 text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索区域或负责人..."
            className="w-full rounded-lg border border-white/10 bg-eco-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-eco-400/50 focus:outline-none"
          />
        </div>

        <div className="text-xs text-white/40">
          共 {filteredAlerts.length} 条记录
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/50">
                <th className="px-4 py-3 font-medium">预警ID</th>
                <th className="px-4 py-3 font-medium">级别</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">区域</th>
                <th className="px-4 py-3 font-medium">当前值 / 阈值</th>
                <th className="px-4 py-3 font-medium">连续天数</th>
                <th className="px-4 py-3 font-medium">触发时间</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">负责人</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-white/40">
                    <XCircle className="mx-auto mb-3 h-10 w-10 text-white/20" />
                    暂无符合条件的预警记录
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const levelCfg = LEVEL_CONFIG[alert.level];
                  const typeCfg = TYPE_CONFIG[alert.type];
                  const statusCfg = STATUS_CONFIG[alert.status];
                  const StatusIcon = statusCfg.Icon;
                  const LevelIcon = levelCfg.Icon;
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-white/60">{alert.id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                            levelCfg.bgColor,
                            levelCfg.color
                          )}
                        >
                          <LevelIcon className="h-3 w-3" />
                          {levelCfg.label}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3 font-medium', typeCfg.color)}>
                        {typeCfg.label}
                      </td>
                      <td className="px-4 py-3 text-white/80">{alert.regionName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-semibold',
                            alert.currentValue < alert.threshold ? 'text-red-400' : 'text-white'
                          )}>
                            {formatPercent(alert.currentValue, 1)}
                          </span>
                          <span className="text-white/30">/</span>
                          <span className="text-white/60">{formatPercent(alert.threshold, 0)}</span>
                        </div>
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              alert.currentValue < alert.threshold ? 'bg-red-500' : 'bg-eco-400'
                            )}
                            style={{ width: `${Math.min((alert.currentValue / alert.threshold) * 100, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-semibold',
                          alert.consecutiveDays >= 7 ? 'text-red-400' : alert.consecutiveDays >= 3 ? 'text-warning-400' : 'text-white/80'
                        )}>
                          {alert.consecutiveDays} 天
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {formatDate(alert.triggeredAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                            statusCfg.bgColor,
                            statusCfg.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-white/80">
                          <User className="h-3.5 w-3.5 text-white/40" />
                          {alert.responsiblePerson}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => navigate(`/alerts/${alert.id}/approval`)}
                          className="inline-flex items-center gap-1 rounded-md bg-data-500/20 px-2.5 py-1 text-xs font-medium text-data-400 hover:bg-data-500/30 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          查看审批
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
