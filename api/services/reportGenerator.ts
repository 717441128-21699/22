import cron from 'node-cron';
import type {
  WeeklyReport,
  DailyMetrics,
  User,
  Region,
} from '../../shared/types.js';
import type { MemoryDb } from '../db/memoryDb.js';
import { filterByRegion } from '../middleware/auth.js';

function datesBetween(start: Date, end: Date): string[] {
  const result: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function getMetricsByDates(
  metrics: DailyMetrics[],
  dates: string[],
): DailyMetrics[] {
  const set = new Set(dates);
  return metrics.filter((m) => set.has(m.date));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  return parseFloat((sum / nums.length).toFixed(1));
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
}

function aggregateRegionMetrics(
  db: MemoryDb,
  region: Region,
  dates: string[],
): { accuracy: number[]; timeliness: number[]; resource: number[]; totalWaste: number } {
  const accuracy: number[] = [];
  const timeliness: number[] = [];
  const resource: number[] = [];
  let totalWaste = 0;

  const childCodes: string[] = [region.code];
  if (region.level === 'province' || region.level === 'national') {
    for (const r of db.regions) {
      if (r.parentCode === region.code) childCodes.push(r.code);
    }
  }
  if (region.level === 'national') {
    for (const r of db.regions) {
      if (r.level === 'city') childCodes.push(r.code);
    }
  }

  for (const code of childCodes) {
    const metrics = db.dailyMetrics[code];
    if (!metrics) continue;
    const inRange = getMetricsByDates(metrics, dates);
    for (const m of inRange) {
      accuracy.push(m.classificationAccuracy);
      timeliness.push(m.collectionTimeliness);
      resource.push(m.resourceConversionRate);
      totalWaste += m.wasteByType.kitchen + m.wasteByType.recyclable + m.wasteByType.hazardous + m.wasteByType.other;
    }
  }

  return { accuracy, timeliness, resource, totalWaste };
}

function makeId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export function generateWeeklyReport(regionCode: string, db: MemoryDb): WeeklyReport | null {
  const region = db.regions.find((r) => r.code === regionCode);
  if (!region) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(today);
  const weekStart = new Date(today);
  weekStart.setDate(weekEnd.getDate() - 6);

  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);

  const yoyWeekStart = new Date(weekStart);
  yoyWeekStart.setFullYear(yoyWeekStart.getFullYear() - 1);
  const yoyWeekEnd = new Date(weekEnd);
  yoyWeekEnd.setFullYear(yoyWeekEnd.getFullYear() - 1);

  const currentDates = datesBetween(weekStart, weekEnd);
  const prevDates = datesBetween(prevWeekStart, prevWeekEnd);
  const yoyDates = datesBetween(yoyWeekStart, yoyWeekEnd);

  const current = aggregateRegionMetrics(db, region, currentDates);
  const prev = aggregateRegionMetrics(db, region, prevDates);
  const yoy = aggregateRegionMetrics(db, region, yoyDates);

  const curAcc = avg(current.accuracy);
  const curTime = avg(current.timeliness);
  const curRes = avg(current.resource);
  const prevAcc = avg(prev.accuracy);
  const prevTime = avg(prev.timeliness);
  const prevRes = avg(prev.resource);
  const yoyAcc = avg(yoy.accuracy);
  const yoyTime = avg(yoy.timeliness);
  const yoyRes = avg(yoy.resource);

  const costPerTon = 450;
  const weeklyTotal = Math.round(current.totalWaste * costPerTon);
  const unitCost = current.totalWaste > 0 ? Math.round(weeklyTotal / current.totalWaste) : 0;

  const trend: { date: string; cost: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(weekEnd);
    d.setDate(d.getDate() - i * 7);
    const start = new Date(d);
    start.setDate(start.getDate() - 6);
    const agg = aggregateRegionMetrics(db, region, datesBetween(start, d));
    trend.push({
      date: d.toISOString().slice(0, 10),
      cost: Math.round(agg.totalWaste * costPerTon),
    });
  }

  const wasteByTypeTrend: { date: string; recyclable: number; kitchen: number; hazardous: number; other: number }[] = [];
  for (const dateStr of currentDates) {
    const dateMetrics: DailyMetrics[] = [];
    const childCodes: string[] = [region.code];
    if (region.level === 'province' || region.level === 'national') {
      for (const r of db.regions) {
        if (r.parentCode === region.code) childCodes.push(r.code);
      }
    }
    if (region.level === 'national') {
      for (const r of db.regions) {
        if (r.level === 'city') childCodes.push(r.code);
      }
    }
    for (const code of childCodes) {
      const m = db.dailyMetrics[code];
      if (m) {
        const found = m.find((x) => x.date === dateStr);
        if (found) dateMetrics.push(found);
      }
    }
    wasteByTypeTrend.push({
      date: dateStr,
      recyclable: dateMetrics.reduce((s, m) => s + m.wasteByType.recyclable, 0),
      kitchen: dateMetrics.reduce((s, m) => s + m.wasteByType.kitchen, 0),
      hazardous: dateMetrics.reduce((s, m) => s + m.wasteByType.hazardous, 0),
      other: dateMetrics.reduce((s, m) => s + m.wasteByType.other, 0),
    });
  }

  const publicityFocus: { region: string; focus: string }[] = [];
  const routeOptimization: { region: string; suggestion: string }[] = [];

  const cities = db.regions.filter(
    (r) =>
      r.level === 'city' &&
      (region.level === 'national' ||
        (region.level === 'province' && r.parentCode === region.code) ||
        (region.level === 'city' && r.code === region.code)),
  );

  for (const city of cities) {
    const cityMetrics = db.dailyMetrics[city.code];
    if (!cityMetrics || cityMetrics.length === 0) continue;
    const inWeek = getMetricsByDates(cityMetrics, currentDates);
    if (inWeek.length === 0) continue;

    const cityAcc = avg(inWeek.map((m) => m.classificationAccuracy));
    if (cityAcc < 75) {
      publicityFocus.push({
        region: city.name,
        focus: `分类准确率仅${cityAcc}%，建议加强社区宣传、开展分类知识讲座和督导员巡查`,
      });
    }

    const prevInWeek = getMetricsByDates(cityMetrics, prevDates);
    if (prevInWeek.length > 0) {
      const curWaste = inWeek.reduce((s, m) => s + m.wasteByType.kitchen + m.wasteByType.recyclable + m.wasteByType.other, 0);
      const prevWaste = prevInWeek.reduce((s, m) => s + m.wasteByType.kitchen + m.wasteByType.recyclable + m.wasteByType.other, 0);
      if (prevWaste > 0 && (curWaste - prevWaste) / prevWaste > 0.15) {
        routeOptimization.push({
          region: city.name,
          suggestion: `本周清运量环比增长${Math.round((curWaste - prevWaste) / prevWaste * 100)}%，建议优化收运路线、增加车辆调度频次`,
        });
      }
    }
  }

  const firstDay = new Date(weekEnd.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((weekEnd.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);

  return {
    id: makeId(),
    week: `${weekEnd.getFullYear()}年第${weekNum}周`,
    startDate: weekStart.toISOString().slice(0, 10),
    endDate: weekEnd.toISOString().slice(0, 10),
    regionCode: region.code,
    regionName: region.name,
    generatedAt: new Date().toISOString(),
    metrics: {
      classificationAccuracy: {
        current: curAcc,
        lastWeek: prevAcc,
        lastYear: yoyAcc,
        yoy: calcChange(curAcc, yoyAcc),
        mom: calcChange(curAcc, prevAcc),
      },
      collectionTimeliness: {
        current: curTime,
        lastWeek: prevTime,
        lastYear: yoyTime,
        yoy: calcChange(curTime, yoyTime),
        mom: calcChange(curTime, prevTime),
      },
      resourceConversionRate: {
        current: curRes,
        lastWeek: prevRes,
        lastYear: yoyRes,
        yoy: calcChange(curRes, yoyRes),
        mom: calcChange(curRes, prevRes),
      },
      wasteByTypeTrend,
    },
    costAnalysis: {
      weeklyTotal,
      unitCost,
      trend,
    },
    recommendations: {
      routeOptimization,
      publicityFocus,
    },
  };
}

let reportTask: cron.ScheduledTask | null = null;

export function scheduleWeeklyReport(db: MemoryDb): cron.ScheduledTask {
  if (reportTask) {
    reportTask.stop();
  }

  reportTask = cron.schedule('0 0 * * 1', () => {
    try {
      const targets = db.regions.filter(
        (r) => r.level === 'national' || r.level === 'province' || r.level === 'city',
      );
      const generated: WeeklyReport[] = [];
      for (const region of targets) {
        const report = generateWeeklyReport(region.code, db);
        if (report) {
          db.weeklyReports.unshift(report);
          db.reports.unshift(report);
          generated.push(report);
        }
      }
      console.log(
        `[ReportGenerator] 周报生成完成，共生成 ${generated.length} 份报告 - ${new Date().toISOString()}`,
      );
    } catch (err) {
      console.error('[ReportGenerator] 周报生成出错:', err);
    }
  });

  console.log('[ReportGenerator] 周报定时任务已启动（每周一0点执行）');
  return reportTask;
}

export function stopWeeklyReport(): void {
  if (reportTask) {
    reportTask.stop();
    reportTask = null;
    console.log('[ReportGenerator] 周报定时任务已停止');
  }
}

export function getReports(
  regionCode: string | undefined,
  user: User,
  db: MemoryDb,
): WeeklyReport[] {
  const allowed = filterByRegion(regionCode || '000000', user, db);
  let reports = (db.reports && db.reports.length > 0 ? db.reports : db.weeklyReports).filter(
    (r) => allowed.includes(r.regionCode),
  );
  if (regionCode) {
    reports = reports.filter((r) => r.regionCode === regionCode);
  }
  return reports.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}
