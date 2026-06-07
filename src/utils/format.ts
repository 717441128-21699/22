export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';

  return num.toLocaleString('zh-CN', { maximumFractionDigits: 20 });
}

export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';

  return `${num.toFixed(decimals)}%`;
}

export function formatDate(
  value: string | Date | number | null | undefined,
  format: 'full' | 'date' | 'time' | 'datetime' = 'datetime'
): string {
  if (value === null || value === undefined || value === '') return '-';

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return '-';

  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  switch (format) {
    case 'full':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

export function formatMoney(
  value: number | string | null | undefined,
  unit: 'auto' | 'yuan' | 'wanyuan' | 'yiyuan' = 'auto',
  decimals: number = 2
): string {
  if (value === null || value === undefined || value === '') return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';

  const absNum = Math.abs(num);
  let actualUnit: 'yuan' | 'wanyuan' | 'yiyuan';

  if (unit === 'auto') {
    if (absNum >= 100000000) {
      actualUnit = 'yiyuan';
    } else if (absNum >= 10000) {
      actualUnit = 'wanyuan';
    } else {
      actualUnit = 'yuan';
    }
  } else {
    actualUnit = unit;
  }

  let converted: number;
  let suffix: string;

  switch (actualUnit) {
    case 'yiyuan':
      converted = num / 100000000;
      suffix = '亿元';
      break;
    case 'wanyuan':
      converted = num / 10000;
      suffix = '万元';
      break;
    case 'yuan':
    default:
      converted = num;
      suffix = '元';
      break;
  }

  return `${formatNumber(converted.toFixed(decimals))}${suffix}`;
}

export function formatRelativeTime(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date(value);
  }

  if (isNaN(date.getTime())) return '-';

  const now = Date.now();
  const diff = now - date.getTime();
  const diffSec = Math.floor(diff / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}个月前`;
  return `${Math.floor(diffDay / 365)}年前`;
}
