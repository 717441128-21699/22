import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Truck,
  Factory,
  MapPin,
  Clock,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
} from 'lucide-react';
import type { WasteBin, CollectionVehicle, ProcessingPlant } from '../../shared/types';
import { api } from '../utils/api';
import { formatPercent, formatDate, formatNumber, formatRelativeTime } from '../utils/format';
import { cn } from '../lib/utils';

type TabKey = 'bins' | 'vehicles' | 'plants';

interface MonitorSummary {
  binsTotal: number;
  binsNormal: number;
  binsFull: number;
  binsOffline: number;
  vehiclesTotal: number;
  vehiclesActive: number;
  plantsTotal: number;
  plantsAvgLoad: number;
}

const BIN_STATUS_CONFIG = {
  normal: { label: '正常', color: 'bg-eco-400', textColor: 'text-eco-300', borderColor: 'border-eco-400/50', Icon: CheckCircle2 },
  full: { label: '已满', color: 'bg-warning-400', textColor: 'text-warning-400', borderColor: 'border-warning-400/50', Icon: AlertTriangle },
  overflow: { label: '溢满', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/50', Icon: XCircle },
  offline: { label: '离线', color: 'bg-gray-500', textColor: 'text-gray-400', borderColor: 'border-gray-500/50', Icon: WifiOff },
} as const;

const VEHICLE_STATUS_CONFIG = {
  idle: { label: '空闲', color: 'bg-gray-500', textColor: 'text-gray-400' },
  collecting: { label: '收运中', color: 'bg-eco-400', textColor: 'text-eco-300' },
  transporting: { label: '转运中', color: 'bg-data-400', textColor: 'text-data-400' },
  discharging: { label: '卸料中', color: 'bg-warning-400', textColor: 'text-warning-400' },
} as const;

export default function Monitor() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('bins');
  const [regionCode, setRegionCode] = useState('000000');
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [bins, setBins] = useState<WasteBin[]>([]);
  const [vehicles, setVehicles] = useState<CollectionVehicle[]>([]);
  const [plants, setPlants] = useState<ProcessingPlant[]>([]);
  const [summary, setSummary] = useState<MonitorSummary | null>(null);

  const regions = [
    { code: '000000', name: '全部区域' },
    { code: '440000', name: '广东省' },
    { code: '330000', name: '浙江省' },
    { code: '320000', name: '江苏省' },
    { code: '510000', name: '四川省' },
    { code: '370000', name: '山东省' },
  ];

  const tabs: { key: TabKey; label: string; icon: typeof Trash2 }[] = [
    { key: 'bins', label: '垃圾桶', icon: Trash2 },
    { key: 'vehicles', label: '转运车', icon: Truck },
    { key: 'plants', label: '处理厂', icon: Factory },
  ];

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.get<{
        bins: WasteBin[];
        vehicles: CollectionVehicle[];
        plants: ProcessingPlant[];
        summary: MonitorSummary;
      }>('/monitor', { params: { regionCode } });
      setBins(data.bins);
      setVehicles(data.vehicles);
      setPlants(data.plants);
      setSummary(data.summary);
      setLastUpdate(new Date().toISOString());
    } catch (err) {
      console.error('加载监控数据失败', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [regionCode, activeTab]);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [isLive, regionCode]);

  function getLoadBarColor(percent: number) {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-warning-400';
    return 'bg-eco-400';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">实时监控中心</h1>
          <p className="mt-1 text-sm text-white/60">全区域垃圾分类收运处置实时状态监控</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isLive ? 'bg-eco-400 animate-pulse' : 'bg-gray-500'
              )}
            />
            <span className="text-sm text-white/80">{isLive ? '实时更新中' : '已暂停'}</span>
            <button
              onClick={() => setIsLive(!isLive)}
              className="ml-2 text-xs text-white/50 hover:text-white/80"
            >
              {isLive ? '暂停' : '继续'}
            </button>
          </div>

          {lastUpdate && (
            <div className="flex items-center gap-1.5 text-sm text-white/50">
              <Clock className="h-4 w-4" />
              <span>更新于 {formatRelativeTime(lastUpdate)}</span>
            </div>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10',
              loading && 'opacity-50'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            刷新
          </button>

          <div className="relative">
            <button
              onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              <MapPin className="h-4 w-4" />
              {regions.find((r) => r.code === regionCode)?.name || '全部区域'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', regionDropdownOpen && 'rotate-180')} />
            </button>
            {regionDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-white/10 bg-eco-900 shadow-lg">
                {regions.map((r) => (
                  <button
                    key={r.code}
                    onClick={() => {
                      setRegionCode(r.code);
                      setRegionDropdownOpen(false);
                    }}
                    className={cn(
                      'block w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/10',
                      regionCode === r.code && 'bg-white/10 text-white'
                    )}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summary && (
          <>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-eco-500/20 to-eco-700/20 p-4">
              <div className="text-sm text-white/60">垃圾桶总数</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{summary.binsTotal}</span>
                <span className="text-xs text-eco-300 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  正常 {summary.binsNormal}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-warning-500/20 to-warning-700/20 p-4">
              <div className="text-sm text-white/60">垃圾桶异常</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{summary.binsFull}</span>
                <span className="text-xs text-warning-400 flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  需清运
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-data-500/20 to-data-700/20 p-4">
              <div className="text-sm text-white/60">转运车辆</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{summary.vehiclesTotal}</span>
                <span className="text-xs text-data-400 flex items-center gap-0.5">
                  <Truck className="h-3 w-3" />
                  作业 {summary.vehiclesActive}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-amber-700/20 p-4">
              <div className="text-sm text-white/60">处理厂平均负荷</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-white">{formatPercent(summary.plantsAvgLoad, 1)}</span>
                <span className="text-xs text-amber-300 flex items-center gap-0.5">
                  <Factory className="h-3 w-3" />
                  {summary.plantsTotal} 座
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-eco-400 text-eco-300'
                  : 'border-transparent text-white/50 hover:text-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'bins' && summary && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{summary.binsTotal}</span>
              )}
              {tab.key === 'vehicles' && summary && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{summary.vehiclesTotal}</span>
              )}
              {tab.key === 'plants' && summary && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{summary.plantsTotal}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'bins' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(BIN_STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.Icon;
              return (
                <div key={key} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                  <div className={cn('h-3 w-3 rounded-full', config.color)} />
                  <Icon className={cn('h-4 w-4', config.textColor)} />
                  <span className="text-sm text-white/70">{config.label}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bins.map((bin) => {
              const config = BIN_STATUS_CONFIG[bin.status];
              const StatusIcon = config.Icon;
              return (
                <div
                  key={bin.id}
                  className={cn(
                    'group rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
                    config.borderColor,
                    'bg-white/5'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
                      <span className={cn('text-xs font-medium', config.textColor)}>{config.label}</span>
                    </div>
                    <StatusIcon className={cn('h-5 w-5', config.textColor)} />
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-white">{bin.stationName}</h3>
                  <div className="mt-1 text-xs text-white/40">{bin.id}</div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">满溢度</span>
                      <span className="font-semibold text-white">{formatPercent(bin.fillLevel, 0)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn('h-full rounded-full transition-all', config.color)}
                        style={{ width: `${Math.min(bin.fillLevel, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {bin.lat.toFixed(2)}, {bin.lng.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeTime(bin.lastUpdated)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/80">车辆分布</h3>
                <span className="text-xs text-white/40">实时位置</span>
              </div>
              <div className="relative h-80 overflow-hidden rounded-lg border border-white/10 bg-eco-950/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-40" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line
                      key={`h-${i}`}
                      x1="0"
                      y1={i * 45}
                      x2="400"
                      y2={i * 45}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line
                      key={`v-${i}`}
                      x1={i * 45}
                      y1="0"
                      x2={i * 45}
                      y2="320"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                  ))}
                  {vehicles.map((v) => {
                    const x = 30 + ((v.lng + 10) / 20) * 340;
                    const y = 20 + ((v.lat + 10) / 20) * 280;
                    const config = VEHICLE_STATUS_CONFIG[v.status];
                    const colorValue = config.color === 'bg-eco-400' ? '#56B788' : config.color === 'bg-warning-400' ? '#FF8F5E' : config.color === 'bg-data-400' ? '#5A8EF0' : '#6B7280';
                    return (
                      <g key={v.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r="12"
                          opacity="0.25"
                          fill={colorValue}
                          className="animate-pulse"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="6"
                          fill={colorValue}
                        />
                        <text
                          x={x + 14}
                          y={y + 4}
                          className="text-[10px]"
                          fill="rgba(255,255,255,0.7)"
                        >
                          {v.plateNumber}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                  {Object.entries(VEHICLE_STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1 rounded bg-eco-950/80 px-2 py-1">
                      <div className={cn('h-2 w-2 rounded-full', cfg.color)} />
                      <span className="text-[10px] text-white/60">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {vehicles.map((v) => {
              const config = VEHICLE_STATUS_CONFIG[v.status];
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className={cn('h-5 w-5', config.textColor)} />
                      <span className="font-semibold text-white">{v.plateNumber}</span>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-white/50">装载率</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn('h-full rounded-full', config.color)}
                            style={{ width: `${v.loadLevel}%` }}
                          />
                        </div>
                        <span className="text-white/80 text-xs w-10 text-right">{formatPercent(v.loadLevel, 0)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50">当前路线</div>
                      <div className="mt-1 flex items-center gap-1 text-white/80">
                        <ArrowRight className="h-3.5 w-3.5 text-data-400" />
                        {v.currentRoute}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-eco-300" />
                      预计到达 {formatDate(v.estimatedArrival, 'time')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeTime(v.lastUpdated)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'plants' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plants.map((plant) => {
            const loadPercent = Math.round((plant.currentLoad / plant.dailyCapacity) * 100);
            return (
              <div
                key={plant.id}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/30">
                      <Factory className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{plant.name}</h3>
                      <div className="text-xs text-white/40">{plant.id}</div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      loadPercent >= 90
                        ? 'bg-red-500/20 text-red-400'
                        : loadPercent >= 70
                          ? 'bg-warning-500/20 text-warning-400'
                          : 'bg-eco-500/20 text-eco-300'
                    )}
                  >
                    {loadPercent >= 90 ? '高负荷' : loadPercent >= 70 ? '中负荷' : '低负荷'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">当前负荷</span>
                    <span className="font-semibold text-white">{formatPercent(loadPercent, 0)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn('h-full rounded-full transition-all', getLoadBarColor(loadPercent))}
                      style={{ width: `${Math.min(loadPercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-xs text-white/40">
                    {formatNumber(plant.currentLoad)} / {formatNumber(plant.dailyCapacity)} 吨/日
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <div className="text-xs text-white/50">今日入料</div>
                    <div className="mt-1 flex items-center gap-1 text-base font-semibold text-white">
                      <Package className="h-4 w-4 text-data-400" />
                      {formatNumber(plant.todayInput)}
                      <span className="text-xs font-normal text-white/40">吨</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">今日产出</div>
                    <div className="mt-1 flex items-center gap-1 text-base font-semibold text-white">
                      <TrendingUp className="h-4 w-4 text-eco-300" />
                      {formatNumber(plant.todayOutput)}
                      <span className="text-xs font-normal text-white/40">吨</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <div className="text-xs text-white/50">资源化率</div>
                    <div className="text-sm font-semibold text-eco-300">{formatPercent(plant.resourceRate, 1)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">日处理能力</div>
                    <div className="text-sm font-semibold text-white">{formatNumber(plant.dailyCapacity)} 吨</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 text-xs text-white/40">
                  <Clock className="h-3.5 w-3.5" />
                  数据更新于 {formatRelativeTime(plant.lastUpdated)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
