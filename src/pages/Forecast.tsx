import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Lightbulb,
  Loader2,
  Sparkles,
  AlertTriangle,
  Truck,
  Factory,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { DragEvent, ChangeEvent } from 'react';
import { api } from '../utils/api';
import { formatNumber, formatDate, formatMoney } from '../utils/format';
import { cn } from '../lib/utils';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ForecastResult, ForecastDay, ExtractedPlan, ForecastRecommendation } from '../../shared/types';

const TYPE_COLORS = {
  recyclable: '#10B981',
  kitchen: '#F59E0B',
  hazardous: '#EF4444',
  other: '#6B7280',
};

const TYPE_LABELS = {
  recyclable: '可回收物',
  kitchen: '厨余垃圾',
  hazardous: '有害垃圾',
  other: '其他垃圾',
};

export default function Forecast() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid =
      validTypes.includes(selectedFile.type) ||
      validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError('请上传 .xlsx 或 .xls 格式的Excel文件');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setFile(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api.upload<ForecastResult>('/forecast/upload', formData);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  const handleLoadSample = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setFile(null);

    try {
      const data = await api.get<ForecastResult>('/forecast/sample');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载示例数据失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
      <div className="lg:col-span-4 space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-eco-300" />
              宣传方案上传
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重置
            </button>
          </div>

          <div
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
              isDragging
                ? 'border-eco-400 bg-eco-400/10'
                : 'border-white/15 bg-white/[0.02] hover:border-eco-400/50 hover:bg-white/[0.04]'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-eco-500/30 to-eco-400/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-eco-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {file ? file.name : '拖拽文件到此处，或点击上传'}
                </p>
                <p className="text-xs text-white/40 mt-1">支持 .xlsx / .xls 格式，最大 10MB</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              解析上传
            </button>
            <button
              onClick={handleLoadSample}
              disabled={isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              示例数据
            </button>
          </div>
        </div>

        {result?.extractedPlan && (
          <PlanInfoCard plan={result.extractedPlan} />
        )}
      </div>

      <div className="lg:col-span-8 space-y-4 lg:space-y-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-data-400" />
              未来7天垃圾产量预测
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="badge badge-level-2">
                <span className="w-2 h-2 rounded-full bg-red-400 mr-1.5" />
                超量预警
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <LoadingSpinner label="正在生成预测..." />
            </div>
          ) : result ? (
            <ForecastChart data={result.prediction.slice(0, 7)} />
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-white/40">
              <FileSpreadsheet className="h-16 w-16 mb-3 opacity-30" />
              <p className="text-sm">上传宣传方案或加载示例数据后查看预测结果</p>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-warning-400" />
            优化推荐
          </h2>

          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <LoadingSpinner size="sm" label="加载推荐..." />
            </div>
          ) : result && result.recommendations.length > 0 ? (
            <div className="space-y-3">
              {result.recommendations.map((rec, idx) => (
                <RecommendationItem key={idx} rec={rec} index={idx} />
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-white/40">
              <Lightbulb className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">暂无推荐</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanInfoCard({ plan }: { plan: ExtractedPlan }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-eco-300" />
        解析方案要素
      </h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-white/50 mb-1">方案名称</p>
          <p className="text-sm font-medium text-white">{plan.campaignName}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoItem icon={MapPin} label="目标区域" value={plan.targetRegion} />
          <InfoItem
            icon={Calendar}
            label="活动周期"
            value={`${formatDate(plan.startDate, 'date')} ~ ${formatDate(plan.endDate, 'date')}`}
          />
          <InfoItem
            icon={Users}
            label="覆盖人群"
            value={formatNumber(plan.targetPopulation) + ' 人'}
          />
          <InfoItem icon={DollarSign} label="预算金额" value={formatMoney(plan.budget)} />
        </div>

        <div>
          <p className="text-xs text-white/50 mb-2">关键措施</p>
          <ul className="space-y-1.5">
            {plan.keyActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                <span className="flex-shrink-0 h-5 w-5 rounded-md bg-eco-500/20 text-eco-300 flex items-center justify-center text-xs font-medium">
                  {idx + 1}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm text-white/90 font-medium">{value}</p>
    </div>
  );
}

function ForecastChart({ data }: { data: ForecastDay[] }) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    recyclable: d.recyclable,
    kitchen: d.kitchen,
    hazardous: d.hazardous,
    other: d.other,
    total: d.total,
    capacity: d.processingCapacity,
    exceeds: d.exceedsCapacity,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;
    const total = payload.find((p) => p.name === 'total');
    const capacity = payload.find((p) => p.name === 'capacity');
    const exceeds = chartData.find((d) => d.date === label)?.exceeds;

    return (
      <div className="glass-card p-3 text-xs space-y-2 min-w-[180px]">
        <p className="text-sm font-medium text-white">{label}</p>
        {payload
          .filter((p) => p.name !== 'total' && p.name !== 'capacity')
          .map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-white/70">{TYPE_LABELS[entry.name as keyof typeof TYPE_LABELS]}</span>
              </span>
              <span className="font-mono text-white">{formatNumber(entry.value)} 吨</span>
            </div>
          ))}
        <div className="border-t border-white/10 pt-2 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/70">总量</span>
            <span className="font-mono font-medium text-white">{total ? formatNumber(total.value) : 0} 吨</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/70">处理能力</span>
            <span className="font-mono text-white/80">{capacity ? formatNumber(capacity.value) : 0} 吨</span>
          </div>
          {exceeds && (
            <div className="flex items-center gap-1.5 text-red-400 pt-1">
              <AlertTriangle className="h-3 w-3" />
              超出处理能力
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRecyclable" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TYPE_COLORS.recyclable} stopOpacity={0.6} />
              <stop offset="95%" stopColor={TYPE_COLORS.recyclable} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorKitchen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TYPE_COLORS.kitchen} stopOpacity={0.6} />
              <stop offset="95%" stopColor={TYPE_COLORS.kitchen} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorHazardous" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TYPE_COLORS.hazardous} stopOpacity={0.6} />
              <stop offset="95%" stopColor={TYPE_COLORS.hazardous} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TYPE_COLORS.other} stopOpacity={0.6} />
              <stop offset="95%" stopColor={TYPE_COLORS.other} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.4)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={(props) => {
              const { x, y, payload } = props;
              const exceeds = chartData.find((d) => d.date === payload.value)?.exceeds;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={16}
                    textAnchor="middle"
                    fill={exceeds ? '#EF4444' : 'rgba(255,255,255,0.5)'}
                    fontSize={11}
                    fontWeight={exceeds ? 600 : 400}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            formatter={(value) => (
              <span className="text-white/60 text-xs ml-1">
                {TYPE_LABELS[value as keyof typeof TYPE_LABELS]}
              </span>
            )}
          />
          <ReferenceLine
            y={chartData[0]?.capacity || 1000}
            stroke="#FF6B35"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: '处理能力阈值',
              position: 'right',
              fill: '#FF8F5E',
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="other"
            stackId="1"
            stroke={TYPE_COLORS.other}
            fill="url(#colorOther)"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.exceeds) {
                return (
                  <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="white" strokeWidth={1.5} />
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="hazardous"
            stackId="1"
            stroke={TYPE_COLORS.hazardous}
            fill="url(#colorHazardous)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="kitchen"
            stackId="1"
            stroke={TYPE_COLORS.kitchen}
            fill="url(#colorKitchen)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="recyclable"
            stackId="1"
            stroke={TYPE_COLORS.recyclable}
            fill="url(#colorRecyclable)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RecommendationItem({ rec, index }: { rec: ForecastRecommendation; index: number }) {
  const isFrequency = rec.type === 'frequency';
  const Icon = isFrequency ? Truck : Factory;
  const badgeClass = isFrequency ? 'badge-info' : 'badge-success';
  const badgeLabel = isFrequency ? '收运频次调整' : '增开处理线';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors animate-fadeInUp"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
            isFrequency ? 'bg-data-500/20 text-data-400' : 'bg-eco-500/20 text-eco-300'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('badge', badgeClass)}>{badgeLabel}</span>
          </div>
          <p className="text-sm text-white/85 leading-relaxed">{rec.description}</p>
          {rec.affectedStations && rec.affectedStations.length > 0 && (
            <div className="mt-2.5">
              <p className="text-xs text-white/40 mb-1.5">影响站点：</p>
              <div className="flex flex-wrap gap-1.5">
                {rec.affectedStations.map((station, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/70"
                  >
                    <MapPin className="h-3 w-3 mr-1 text-white/40" />
                    {station}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
