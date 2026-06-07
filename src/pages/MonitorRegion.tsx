import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Target,
  Truck,
  Factory,
  TrendingUp,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { api } from '../utils/api';
import { formatPercent, formatNumber } from '../utils/format';
import KpiCard from '../components/KpiCard';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DailyMetrics } from '../../shared/types';

export default function MonitorRegion() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyMetrics[]>([]);

  useEffect(() => {
    loadRegionData();
  }, [id]);

  async function loadRegionData() {
    setLoading(true);
    try {
      const data = await api.get<DailyMetrics[]>('/metrics/daily', { params: { regionCode: id } });
      setDailyData(data);
    } catch (err) {
      console.error('加载区域数据失败', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-card h-96 flex items-center justify-center">
        <LoadingSpinner label="加载区域数据..." />
      </div>
    );
  }

  const latest = dailyData[dailyData.length - 1];

  const chartData = dailyData.slice(-14).map((d) => ({
    date: d.date.slice(5),
    accuracy: d.classificationAccuracy,
    timeliness: d.collectionTimeliness,
    resourceRate: d.resourceConversionRate,
  }));

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/monitor"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-eco-300" />
            区域详情 #{id}
          </h1>
          <p className="text-xs text-white/50">区域垃圾分类详细指标监测</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="分类准确率"
          value={latest?.classificationAccuracy || 0}
          unit="%"
          valueFormatter="percent"
          gradient="eco"
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="收运及时率"
          value={latest?.collectionTimeliness || 0}
          unit="%"
          valueFormatter="percent"
          gradient="data"
          icon={<Truck className="h-5 w-5" />}
        />
        <KpiCard
          title="资源化利用率"
          value={latest?.resourceConversionRate || 0}
          unit="%"
          valueFormatter="percent"
          gradient="recyclable"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="今日收运总量"
          value={
            latest
              ? latest.wasteByType.recyclable +
                latest.wasteByType.kitchen +
                latest.wasteByType.hazardous +
                latest.wasteByType.other
              : 0
          }
          unit="吨"
          valueFormatter="number"
          gradient="warning"
          icon={<Factory className="h-5 w-5" />}
        />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-data-400" />
            近14天指标趋势
          </h3>
          <span className="text-xs text-white/40 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            最近14天
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DA168" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2DA168" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorTimeliness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A8EF0" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5A8EF0" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorResource" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[50, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(8, 43, 32, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'white',
                }}
                formatter={(value: number) => [formatPercent(value, 1)]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    accuracy: '分类准确率',
                    timeliness: '收运及时率',
                    resourceRate: '资源化率',
                  };
                  return <span className="text-white/60 text-xs ml-1">{labels[value] || value}</span>;
                }}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                stroke="#2DA168"
                fill="url(#colorAccuracy)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="timeliness"
                stroke="#5A8EF0"
                fill="url(#colorTimeliness)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="resourceRate"
                stroke="#10B981"
                fill="url(#colorResource)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-warning-400" />
          垃圾产量分布（今日）
        </h3>
        {latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'recyclable', label: '可回收物', color: '#10B981', value: latest.wasteByType.recyclable },
              { key: 'kitchen', label: '厨余垃圾', color: '#F59E0B', value: latest.wasteByType.kitchen },
              { key: 'hazardous', label: '有害垃圾', color: '#EF4444', value: latest.wasteByType.hazardous },
              { key: 'other', label: '其他垃圾', color: '#6B7280', value: latest.wasteByType.other },
            ].map((item) => (
              <div key={item.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-white/70">{item.label}</span>
                </div>
                <p className="text-2xl font-bold font-mono text-white">
                  {formatNumber(item.value)}
                  <span className="text-sm font-normal text-white/40 ml-1">吨</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
