import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber, formatPercent } from '../utils/format';
import type { ReactNode } from 'react';

type Trend = 'up' | 'down' | 'flat';

type GradientVariant =
  | 'eco'
  | 'data'
  | 'warning'
  | 'kitchen'
  | 'recyclable'
  | 'hazardous';

interface KpiCardProps {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  changeLabel?: string;
  trend?: Trend;
  gradient?: GradientVariant;
  icon?: ReactNode;
  className?: string;
  valueFormatter?: 'number' | 'percent' | 'none';
}

const gradientMap: Record<GradientVariant, string> = {
  eco: 'from-eco-500/40 via-eco-600/20 to-eco-800/40',
  data: 'from-data-500/40 via-data-600/20 to-data-700/40',
  warning: 'from-warning-500/40 via-warning-600/20 to-warning-700/40',
  kitchen: 'from-amber-500/40 via-amber-600/20 to-amber-700/40',
  recyclable: 'from-emerald-500/40 via-emerald-600/20 to-emerald-700/40',
  hazardous: 'from-red-500/40 via-red-600/20 to-red-700/40',
};

const trendColorMap: Record<Trend, string> = {
  up: 'text-eco-300',
  down: 'text-red-400',
  flat: 'text-white/50',
};

function formatValue(
  value: number | string,
  formatter: 'number' | 'percent' | 'none',
  unit?: string
): string {
  if (typeof value === 'string') {
    return unit ? `${value}${unit}` : value;
  }

  let formatted: string;
  switch (formatter) {
    case 'number':
      formatted = formatNumber(value);
      break;
    case 'percent':
      formatted = formatPercent(value);
      break;
    case 'none':
    default:
      formatted = String(value);
      break;
  }

  return unit ? `${formatted}${unit}` : formatted;
}

function getTrend(change?: number, explicit?: Trend): Trend {
  if (explicit) return explicit;
  if (change === undefined || change === 0) return 'flat';
  return change > 0 ? 'up' : 'down';
}

export default function KpiCard({
  title,
  value,
  unit,
  change,
  changeLabel = '环比',
  trend: explicitTrend,
  gradient = 'eco',
  icon,
  className,
  valueFormatter = 'number',
}: KpiCardProps) {
  const trend = getTrend(change, explicitTrend);

  const TrendIcon = {
    up: ArrowUpRight,
    down: ArrowDownRight,
    flat: Minus,
  }[trend];

  const displayValue = formatValue(value, valueFormatter, unit);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 p-5',
        'bg-gradient-to-br transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        gradientMap[gradient],
        className
      )}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <span className="text-sm text-white/60">{title}</span>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80">
              {icon}
            </div>
          )}
        </div>

        <div className="stat-value animate-count-up text-2xl md:text-3xl">
          {displayValue}
        </div>

        {change !== undefined && (
          <div className="flex items-center gap-1.5 text-sm">
            <TrendIcon
              className={cn('h-4 w-4', trendColorMap[trend])}
            />
            <span className={trendColorMap[trend]}>
              {change >= 0 ? '+' : ''}
              {formatPercent(change)}
            </span>
            <span className="text-white/40">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
