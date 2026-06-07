import XLSX from 'xlsx';
import type {
  ExtractedPlan,
  ForecastDay,
  ForecastRecommendation,
  DailyMetrics,
  ProcessingPlant,
  WasteBin,
} from '../../shared/types.js';
import type { MemoryDb } from '../db/memoryDb.js';

const CAMPAIGN_FIELDS = ['方案名称', '宣传活动名称', 'campaignName', '活动名称', '名称'];
const REGION_FIELDS = ['目标区域', '覆盖区域', 'targetRegion', '区域', '覆盖范围'];
const START_FIELDS = ['开始日期', 'startDate', '起始日期', '活动开始'];
const END_FIELDS = ['结束日期', 'endDate', '截止日期', '活动结束'];
const POPULATION_FIELDS = ['目标人群数', '覆盖人数', 'targetPopulation', '目标人数', '影响人数'];
const BUDGET_FIELDS = ['预算金额', '经费', 'budget', '预算', '活动经费'];
const ACTIONS_FIELDS = ['关键措施', '主要活动', 'keyActions', '活动内容', '具体措施'];

function findField(row: Record<string, unknown>, candidates: string[]): unknown | null {
  for (const key of Object.keys(row)) {
    const lowerKey = key.trim().toLowerCase();
    for (const candidate of candidates) {
      if (lowerKey === candidate.toLowerCase() || key.trim() === candidate) {
        return row[key];
      }
    }
  }
  return null;
}

function parseDate(val: unknown): string {
  if (val == null || val === '') return '';
  if (typeof val === 'string') {
    const match = val.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
    if (match) return match[0].replace(/\//g, '-');
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  return String(val);
}

function parseNumber(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[,\s万元]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseActions(val: unknown): string[] {
  if (val == null || val === '') return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  const str = String(val);
  const lines = str.split(/[\n;；、]/).map((s) => s.trim()).filter(Boolean);
  return lines.length > 0 ? lines : [str];
}

export function parseExcel(buffer: Buffer): ExtractedPlan {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  const mergedCampaign: string[] = [];
  const mergedRegions: string[] = [];
  const mergedActions: string[] = [];
  let startDate = '';
  let endDate = '';
  let population = 0;
  let budget = 0;

  for (const row of rows) {
    const campaign = findField(row, CAMPAIGN_FIELDS);
    const region = findField(row, REGION_FIELDS);
    const start = findField(row, START_FIELDS);
    const end = findField(row, END_FIELDS);
    const pop = findField(row, POPULATION_FIELDS);
    const bud = findField(row, BUDGET_FIELDS);
    const actions = findField(row, ACTIONS_FIELDS);

    if (campaign != null && String(campaign).trim()) {
      mergedCampaign.push(String(campaign).trim());
    }
    if (region != null && String(region).trim()) {
      mergedRegions.push(String(region).trim());
    }
    if (actions != null) {
      mergedActions.push(...parseActions(actions));
    }
    if (!startDate && start != null) {
      startDate = parseDate(start);
    }
    if (!endDate && end != null) {
      endDate = parseDate(end);
    }
    if (!population && pop != null) {
      population = parseNumber(pop);
    }
    if (!budget && bud != null) {
      budget = parseNumber(bud);
    }
  }

  return {
    campaignName: mergedCampaign[0] || '未命名宣传方案',
    targetRegion: mergedRegions[0] || '全国',
    startDate: startDate || new Date().toISOString().slice(0, 10),
    endDate: endDate || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    targetPopulation: population,
    budget: budget,
    keyActions: mergedActions.length > 0 ? mergedActions : ['常规宣传活动'],
  };
}

function weightedMovingAverage(values: number[], weights: number[]): number {
  if (values.length === 0) return 0;
  const n = Math.min(values.length, weights.length);
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < n; i++) {
    const val = values[values.length - 1 - i];
    const w = weights[i];
    sum += val * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : values[values.length - 1] || 0;
}

function getProcessingCapacity(db: MemoryDb, regionCode: string): number {
  const region = db.regions.find((r) => r.code === regionCode);
  if (!region) return 1000;

  let total = 0;
  const plants: ProcessingPlant[] = [];

  if (region.level === 'city') {
    plants.push(...db.getPlants(regionCode));
  } else if (region.level === 'province' || region.level === 'national') {
    plants.push(...db.getPlants(region.level === 'national' ? undefined : regionCode));
  }

  total = plants.reduce((s, p) => s + p.dailyCapacity, 0);
  return total > 0 ? total : 1000;
}

export function predict7Days(
  regionCode: string,
  db: MemoryDb,
  extractedPlan?: ExtractedPlan,
): ForecastDay[] {
  const metrics = db.dailyMetrics[regionCode];
  const sortedMetrics = metrics
    ? [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const last14 = sortedMetrics.slice(-14);

  const weights = [0.28, 0.22, 0.17, 0.13, 0.1, 0.06, 0.04];

  const capacity = getProcessingCapacity(db, regionCode);

  let campaignBoost = 0;
  if (extractedPlan) {
    const budget = extractedPlan.budget;
    if (budget >= 2000000) {
      campaignBoost = 0.15;
    } else if (budget >= 1000000) {
      campaignBoost = 0.1;
    } else if (budget > 0) {
      campaignBoost = 0.05;
    }
  }

  const result: ForecastDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1);

    const recyclables = last14.map((m: DailyMetrics) => m.wasteByType.recyclable);
    const kitchens = last14.map((m: DailyMetrics) => m.wasteByType.kitchen);
    const hazardousVals = last14.map((m: DailyMetrics) => m.wasteByType.hazardous);
    const others = last14.map((m: DailyMetrics) => m.wasteByType.other);

    let recyclable = Math.round(weightedMovingAverage(recyclables, weights));
    let kitchen = Math.round(weightedMovingAverage(kitchens, weights));
    const hazardousVal = Math.round(weightedMovingAverage(hazardousVals, weights));
    const other = Math.round(weightedMovingAverage(others, weights));

    if (campaignBoost > 0) {
      recyclable = Math.round(recyclable * (1 + campaignBoost));
      kitchen = Math.round(kitchen * (1 + campaignBoost));
    }

    const total = recyclable + kitchen + hazardousVal + other;

    result.push({
      date: d.toISOString().slice(0, 10),
      recyclable,
      kitchen,
      hazardous: hazardousVal,
      other,
      total,
      processingCapacity: capacity,
      exceedsCapacity: total > capacity,
    });
  }

  return result;
}

export function generateRecommendations(
  prediction: ForecastDay[],
  db: MemoryDb,
  regionCode: string,
): ForecastRecommendation[] {
  const recommendations: ForecastRecommendation[] = [];
  if (prediction.length === 0) return recommendations;

  const capacity = prediction[0].processingCapacity;
  const maxTotal = Math.max(...prediction.map((p) => p.total));
  const excessRatio = capacity > 0 ? (maxTotal - capacity) / capacity : 0;

  if (excessRatio >= 0.2) {
    const plants: ProcessingPlant[] = [];
    const region = db.regions.find((r) => r.code === regionCode);
    if (region) {
      if (region.level === 'city') {
        plants.push(...db.getPlants(regionCode));
      } else if (region.level === 'province' || region.level === 'national') {
        plants.push(...db.getPlants(region.level === 'national' ? undefined : regionCode));
      }
    }
    const plantNames = plants.slice(0, 3).map((p) => p.name);
    recommendations.push({
      type: 'line',
      description: `预测最大日产量 ${maxTotal} 吨，超出处理能力 ${Math.round(excessRatio * 100)}%，建议增开处理线${plantNames.length > 0 ? `：${plantNames.join('、')}` : ''}`,
    });
  } else if (excessRatio >= 0.05) {
    const bins: WasteBin[] = [];
    const region = db.regions.find((r) => r.code === regionCode);
    if (region) {
      if (region.level === 'city') {
        bins.push(...db.getBins(regionCode));
      } else if (region.level === 'province' || region.level === 'national') {
        bins.push(...db.getBins(region.level === 'national' ? undefined : regionCode));
      }
    }
    const affected = bins
      .filter((b) => b.fillLevel >= 70)
      .slice(0, 8)
      .map((b) => b.stationName);

    recommendations.push({
      type: 'frequency',
      description: `预测产量超出处理能力 ${Math.round(excessRatio * 100)}%，建议将收运频次从每日2次增至3次`,
      affectedStations: affected.length > 0 ? affected : undefined,
    });
  } else {
    recommendations.push({
      type: 'frequency',
      description: '预测产量在处理能力范围内，建议维持现有收运与处理方案',
    });
  }

  if (excessRatio >= 0.3) {
    recommendations.push({
      type: 'line',
      description: '预警：产量接近或超过处理厂极限负荷，建议启动应急预案并协调邻近区域处理厂分流',
    });
  }

  return recommendations;
}
