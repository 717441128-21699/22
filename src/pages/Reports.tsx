import { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Loader2,
  ChevronRight,
  MapPin,
  TrendingUp,
  Target,
  Megaphone,
  Route,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../utils/api';
import { formatPercent, formatDate, formatMoney } from '../utils/format';
import { cn } from '../lib/utils';
import LoadingSpinner from '../components/LoadingSpinner';
import type { WeeklyReport } from '../../shared/types';
import type { ReactNode } from 'react';

interface ReportSummary {
  id: string;
  week: string;
  startDate: string;
  endDate: string;
  regionCode: string;
  regionName: string;
  generatedAt: string;
  metricsSummary: {
    classificationAccuracy: number;
    collectionTimeliness: number;
    resourceConversionRate: number;
  };
}

export default function Reports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ReportSummary[]>('/reports');
      setReports(data);
      if (data.length > 0) {
        loadReportDetail(data[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const data = await api.get<WeeklyReport>(`/reports/${id}`);
      setSelectedReport(data);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-8rem)]">
      <div className="lg:col-span-4 xl:col-span-3">
        <div className="glass-card p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-eco-300" />
              周报列表
            </h2>
            <span className="text-xs text-white/40">{reports.length} 份</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2">
            {isLoading ? (
              <div className="h-60 flex items-center justify-center">
                <LoadingSpinner size="sm" label="加载报告..." />
              </div>
            ) : reports.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-white/40">
                <FileBarChart className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">暂无周报</p>
              </div>
            ) : (
              reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isSelected={selectedReport?.id === report.id}
                  onClick={() => loadReportDetail(report.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 xl:col-span-9 space-y-4 lg:space-y-6">
        {isLoadingDetail ? (
          <div className="glass-card h-96 flex items-center justify-center">
            <LoadingSpinner label="加载报告详情..." />
          </div>
        ) : selectedReport ? (
          <>
            <div className="glass-card p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {selectedReport.week} 运营诊断报告
                  </h2>
                  <p className="text-xs text-white/50 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(selectedReport.startDate, 'date')} ~ {formatDate(selectedReport.endDate, 'date')}
                    </span>
                    <span>生成于 {formatDate(selectedReport.generatedAt, 'datetime')}</span>
                  </p>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  下载PDF
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="分类准确率"
                  current={selectedReport.metrics.classificationAccuracy.current}
                  yoy={selectedReport.metrics.classificationAccuracy.yoy}
                  mom={selectedReport.metrics.classificationAccuracy.mom}
                  gradient="eco"
                  icon={<Target className="h-5 w-5" />}
                />
                <MetricCard
                  title="收运及时率"
                  current={selectedReport.metrics.collectionTimeliness.current}
                  yoy={selectedReport.metrics.collectionTimeliness.yoy}
                  mom={selectedReport.metrics.collectionTimeliness.mom}
                  gradient="data"
                  icon={<TrendingUp className="h-5 w-5" />}
                />
                <MetricCard
                  title="资源化利用率"
                  current={selectedReport.metrics.resourceConversionRate.current}
                  yoy={selectedReport.metrics.resourceConversionRate.yoy}
                  mom={selectedReport.metrics.resourceConversionRate.mom}
                  gradient="recyclable"
                  icon={<Megaphone className="h-5 w-5" />}
                />
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-warning-400" />
                  清运成本趋势（近8周）
                </h3>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span>本周总费用：<span className="text-white font-medium">{formatMoney(selectedReport.costAnalysis.weeklyTotal)}</span></span>
                  <span>单位成本：<span className="text-white font-medium">{formatMoney(selectedReport.costAnalysis.unitCost)}/吨</span></span>
                </div>
              </div>
              <CostTrendChart data={selectedReport.costAnalysis.trend} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="glass-card p-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <Route className="h-5 w-5 text-data-400" />
                  路线优化建议
                </h3>
                {selectedReport.recommendations.routeOptimization.length === 0 ? (
                  <div className="py-10 text-center text-white/40 text-sm">暂无路线优化建议</div>
                ) : (
                  <ul className="space-y-3">
                    {selectedReport.recommendations.routeOptimization.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/5 p-3.5"
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-data-500/20 text-data-400 flex items-center justify-center">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-white/50" />
                            {item.region}
                          </p>
                          <p className="text-xs text-white/60 mt-1 leading-relaxed">{item.suggestion}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-card p-5">
                <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <Megaphone className="h-5 w-5 text-warning-400" />
                  宣传重点
                </h3>
                {selectedReport.recommendations.publicityFocus.length === 0 ? (
                  <div className="py-10 text-center text-white/40 text-sm">暂无宣传重点建议</div>
                ) : (
                  <ul className="space-y-3">
                    {selectedReport.recommendations.publicityFocus.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/5 p-3.5"
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-warning-500/20 text-warning-400 flex items-center justify-center">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-white/50" />
                            {item.region}
                          </p>
                          <p className="text-xs text-white/60 mt-1 leading-relaxed">{item.focus}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card h-96 flex flex-col items-center justify-center text-white/40">
            <FileBarChart className="h-16 w-16 mb-3 opacity-30" />
            <p className="text-sm">选择左侧周报查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  isSelected,
  onClick,
}: {
  report: ReportSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-3.5 transition-all duration-200',
        isSelected
          ? 'bg-eco-500/15 border-eco-400/40 shadow-card'
          : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white">{report.week}</h3>
        {isSelected && <ChevronRight className="h-4 w-4 text-eco-300 flex-shrink-0" />}
      </div>
      <p className="text-xs text-white/50 mb-3 flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {formatDate(report.startDate, 'date')} ~ {formatDate(report.endDate, 'date')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <MiniMetric label="准确率" value={report.metricsSummary.classificationAccuracy} />
        <MiniMetric label="及时率" value={report.metricsSummary.collectionTimeliness} />
        <MiniMetric label="资源化" value={report.metricsSummary.resourceConversionRate} />
      </div>
      <p className="text-[10px] text-white/35 mt-2.5 flex items-center gap-1">
        生成于 {formatDate(report.generatedAt, 'date')}
      </p>
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center rounded-lg bg-white/[0.03] py-1.5 px-1">
      <p className="text-sm font-semibold text-white/90 font-mono">{value.toFixed(0)}%</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}

function MetricCard({
  title,
  current,
  yoy,
  mom,
  gradient,
  icon,
}: {
  title: string;
  current: number;
  yoy: number;
  mom: number;
  gradient: 'eco' | 'data' | 'recyclable';
  icon: ReactNode;
}) {
  const gradientMap: Record<string, string> = {
    eco: 'from-eco-500/40 via-eco-600/20 to-eco-800/40',
    data: 'from-data-500/40 via-data-600/20 to-data-700/40',
    recyclable: 'from-emerald-500/40 via-emerald-600/20 to-emerald-700/40',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 p-5',
        'bg-gradient-to-br transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        gradientMap[gradient]
      )}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span className="text-sm text-white/60">{title}</span>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80">
            {icon}
          </div>
        </div>
        <div className="stat-value text-2xl md:text-3xl">
          {current.toFixed(1)}%
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">同比</span>
            <TrendBadge value={yoy} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/40">环比</span>
            <TrendBadge value={mom} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  const isUp = value > 0;
  const isFlat = value === 0;
  const Icon = isUp ? ArrowUpRight : isFlat ? ChevronRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono text-xs',
        isFlat ? 'text-white/50' : isUp ? 'text-eco-300' : 'text-red-400'
      )}
    >
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}
      {formatPercent(value, 1)}
    </span>
  );
}

function CostTrendChart({ data }: { data: { date: string; cost: number }[] }) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    cost: d.cost,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="glass-card p-3 text-xs min-w-[160px]">
        <p className="text-sm font-medium text-white mb-1">{label}</p>
        <p className="text-white/60">清运成本</p>
        <p className="text-base font-semibold font-mono text-warning-400">
          {formatMoney(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
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
            tickFormatter={(v) => {
              if (v >= 100000000) return `${(v / 100000000).toFixed(1)}亿`;
              if (v >= 10000) return `${(v / 10000).toFixed(0)}万`;
              return String(v);
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cost"
            name="cost"
            stroke="#FF6B35"
            strokeWidth={2.5}
            dot={{ fill: '#FF6B35', r: 4, strokeWidth: 2, stroke: '#0A1612' }}
            activeDot={{ r: 6, stroke: '#FF6B35', strokeWidth: 2, fill: '#0A1612' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
