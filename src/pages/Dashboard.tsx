import { useEffect, useState } from 'react';
import '../utils/chinaMap';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Factory,
  Truck,
  Target,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend, PieChart, Pie,
} from 'recharts';
import KpiCard from '../components/KpiCard';
import { api } from '../utils/api';
import { formatNumber, formatPercent, formatRelativeTime } from '../utils/format';
import { useNavigate } from 'react-router-dom';

interface OverviewData {
  classificationAccuracy: number;
  collectionTimeliness: number;
  resourceConversionRate: number;
  totalWasteCollected: number;
  alertsActive: number;
  alertsLevel1: number;
  alertsLevel2: number;
  comparedYesterday: {
    classificationAccuracy: number;
    collectionTimeliness: number;
    resourceConversionRate: number;
    totalWasteCollected: number;
  };
}

interface HeatmapItem {
  code: string;
  name: string;
  value: number;
  accuracy: number;
  timeliness: number;
  resourceRate: number;
}

interface DailyItem {
  date: string;
  classificationAccuracy: number;
  collectionTimeliness: number;
  resourceConversionRate: number;
}

interface AlertItem {
  id: string;
  level: 1 | 2;
  type: string;
  regionName: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  status: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
  const [trendData, setTrendData] = useState<DailyItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ov, hm, rg, al] = await Promise.all([
        api.get<OverviewData>('/metrics/overview'),
        api.get<HeatmapItem[]>('/heatmap'),
        api.get<{ dailyData: DailyItem[] }>('/metrics/region?regionCode=000000'),
        api.get<AlertItem[]>('/alerts?status=active,processing,escalated'),
      ]);
      setOverview(ov);
      setHeatmap(hm || []);
      setTrendData(rg?.dailyData?.slice(-7) || []);
      setAlerts(al?.slice(0, 5) || []);
    } catch (e) {
      console.error('加载数据失败', e);
    }
  };

  const heatmapOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10, 22, 18, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const item = heatmap.find(h => h.name === params.name);
        if (!item) return params.name;
        return `
          <div style="font-weight:600;margin-bottom:8px">${item.name}</div>
          <div>清运量：<b>${formatNumber(item.value)}</b> 吨</div>
          <div>准确率：<b style="color:#8ED1B1">${formatPercent(item.accuracy)}</b></div>
          <div>及时率：<b style="color:#5A8EF0">${formatPercent(item.timeliness)}</b></div>
          <div>资源化率：<b style="color:#FF6B35">${formatPercent(item.resourceRate)}</b></div>
        `;
      }
    },
    visualMap: {
      min: 0,
      max: heatmap.length > 0 ? Math.max(...heatmap.map(h => h.value)) : 5000,
      left: 'left',
      bottom: '10',
      text: ['高', '低'],
      textStyle: { color: '#ffffff80' },
      inRange: {
        color: ['#0A3629', '#0F4C3A', '#1A5F4A', '#2DA168', '#56B788', '#8ED1B1'],
      },
      calculable: true,
    },
    series: [{
      type: 'map',
      map: 'china',
      roam: true,
      scaleLimit: { min: 0.8, max: 3 },
      label: { show: false },
      emphasis: {
        label: { show: true, color: '#fff' },
        itemStyle: { areaColor: '#2DA168' },
      },
      itemStyle: {
        borderColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
      },
      data: heatmap.map(h => ({ name: h.name, value: h.value })),
    }],
  };

  const rankingOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10, 22, 18, 0.95)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#fff' },
    },
    grid: { left: 80, right: 20, top: 10, bottom: 10, containLabel: false },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#ffffff50', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: heatmap.slice(0, 10).sort((a, b) => a.resourceRate - b.resourceRate).map(h => h.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#ffffff80', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: heatmap.slice(0, 10).sort((a, b) => a.resourceRate - b.resourceRate).map(h => ({
        value: h.resourceRate,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#0F4C3A' },
              { offset: 1, color: '#2DA168' },
            ]
          },
          borderRadius: [0, 4, 4, 0],
        }
      })),
      barWidth: 14,
    }]
  };

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white/50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">全国数据总览</h1>
          <p className="text-sm text-white/50 mt-1">实时监控全国垃圾分类与资源化处理情况</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-field text-sm w-36"
          >
            <option value="all">全部垃圾类型</option>
            <option value="kitchen">厨余垃圾</option>
            <option value="recyclable">可回收物</option>
            <option value="hazardous">有害垃圾</option>
            <option value="other">其他垃圾</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="分类准确率"
          value={overview.classificationAccuracy}
          unit="%"
          change={overview.comparedYesterday.classificationAccuracy}
          gradient="eco"
          valueFormatter="percent"
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="收运及时率"
          value={overview.collectionTimeliness}
          unit="%"
          change={overview.comparedYesterday.collectionTimeliness}
          gradient="data"
          valueFormatter="percent"
          icon={<Truck className="h-5 w-5" />}
        />
        <KpiCard
          title="资源化转化率"
          value={overview.resourceConversionRate}
          unit="%"
          change={overview.comparedYesterday.resourceConversionRate}
          gradient="recyclable"
          valueFormatter="percent"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          title="今日清运总量"
          value={overview.totalWasteCollected}
          unit="吨"
          change={overview.comparedYesterday.totalWasteCollected}
          gradient="warning"
          valueFormatter="number"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-eco-300" />
              全国垃圾清运热力图
            </h3>
            <span className="text-xs text-white/40">点击省份可下钻查看详情</span>
          </div>
          <div className="h-[480px]">
            <ReactECharts
              option={heatmapOption}
              style={{ height: '100%', width: '100%' }}
              onEvents={{
                click: (params: any) => {
                  const region = heatmap.find(h => h.name === params.name);
                  if (region) navigate(`/monitor/region/${region.code}`);
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-warning-400" />
              资源化率 TOP 10
            </h3>
            <div className="h-[220px]">
              <ReactECharts option={rankingOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-400" />
                预警概览
              </h3>
              <button onClick={() => navigate('/alerts')} className="text-xs text-eco-300 hover:text-eco-200 flex items-center gap-1">
                全部 <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-lg bg-white/[0.03]">
                <p className="text-2xl font-mono font-bold text-white">{overview.alertsActive}</p>
                <p className="text-xs text-white/50 mt-1">活跃预警</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-warning-500/10">
                <p className="text-2xl font-mono font-bold text-warning-400">{overview.alertsLevel1}</p>
                <p className="text-xs text-white/50 mt-1">一级预警</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <p className="text-2xl font-mono font-bold text-red-400">{overview.alertsLevel2}</p>
                <p className="text-xs text-white/50 mt-1">二级预警</p>
              </div>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/5 p-2.5 hover:bg-white/[0.05] cursor-pointer transition-colors"
                  onClick={() => navigate(`/alerts/${alert.id}/approval`)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`badge ${alert.level === 1 ? 'badge-level-1' : 'badge-level-2'} text-[10px]`}>
                      {alert.level === 1 ? '一级' : '二级'}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-white">{alert.regionName}</p>
                      <p className="text-[10px] text-white/40">
                        {alert.type === 'accuracy' ? '分类准确率' : '收运及时率'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-white">{formatPercent(alert.currentValue)}</p>
                    <p className="text-[10px] text-white/40">阈值 {formatPercent(alert.threshold)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-data-400" />
            近7天核心指标趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <defs>
                  <linearGradient id="lineEco" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2DA168" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2DA168" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lineData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A8EF0" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#5A8EF0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#ffffff50', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#ffffff50', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[50, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10, 22, 18, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#fff', marginBottom: 4 }}
                  formatter={(value: number) => [formatPercent(value), '']}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  iconType="circle"
                  formatter={(value: string) => <span style={{ color: '#ffffff80', fontSize: 12 }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="classificationAccuracy"
                  name="分类准确率"
                  stroke="#2DA168"
                  strokeWidth={2.5}
                  dot={{ fill: '#2DA168', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="collectionTimeliness"
                  name="收运及时率"
                  stroke="#5A8EF0"
                  strokeWidth={2.5}
                  dot={{ fill: '#5A8EF0', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Factory className="h-5 w-5 text-eco-300" />
              处理设施负荷
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: '第一资源处理厂', load: 78, capacity: 2000, rate: 58 },
              { name: '有机垃圾处理中心', load: 65, capacity: 1500, rate: 52 },
              { name: '可回收物分拣中心', load: 92, capacity: 800, rate: 76 },
              { name: '焚烧发电厂', load: 54, capacity: 3000, rate: 45 },
              { name: '危废处理站', load: 48, capacity: 300, rate: 38 },
            ].map((plant, idx) => (
              <div key={idx} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/90">{plant.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50">资源化率 <span className="text-eco-300 font-mono">{plant.rate}%</span></span>
                    <span className="text-xs font-mono text-white/70">
                      {Math.round(plant.load * plant.capacity / 100)}/{plant.capacity} 吨
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      plant.load >= 90 ? 'bg-gradient-to-r from-red-500 to-red-400'
                      : plant.load >= 70 ? 'bg-gradient-to-r from-warning-500 to-warning-400'
                      : 'bg-gradient-to-r from-eco-500 to-eco-300'
                    }`}
                    style={{ width: `${plant.load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
