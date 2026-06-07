import cron from 'node-cron';
import type {
  Alert,
  AlertType,
  AlertLevel,
  DailyMetrics,
  ApprovalStatus,
  AlertPushRecord,
} from '../../shared/types.js';
import type { MemoryDb } from '../db/memoryDb.js';

const ACCURACY_THRESHOLD = 70;
const TIMELINESS_THRESHOLD = 80;
const CONSECUTIVE_DAYS_TRIGGER = 3;
const ESCALATION_DAYS = 8;

interface ViolationInfo {
  type: AlertType;
  currentValue: number;
  threshold: number;
  consecutiveDays: number;
}

function findViolations(metrics: DailyMetrics[]): ViolationInfo[] {
  const violations: ViolationInfo[] = [];
  if (metrics.length < CONSECUTIVE_DAYS_TRIGGER) return violations;

  const sorted = [...metrics].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  let accConsecutive = 0;
  let timeConsecutive = 0;
  let worstAcc = 100;
  let worstTime = 100;

  for (const m of sorted) {
    if (m.classificationAccuracy < ACCURACY_THRESHOLD) {
      accConsecutive++;
      worstAcc = Math.min(worstAcc, m.classificationAccuracy);
    } else {
      break;
    }
  }

  for (const m of sorted) {
    if (m.collectionTimeliness < TIMELINESS_THRESHOLD) {
      timeConsecutive++;
      worstTime = Math.min(worstTime, m.collectionTimeliness);
    } else {
      break;
    }
  }

  if (accConsecutive >= CONSECUTIVE_DAYS_TRIGGER) {
    violations.push({
      type: 'accuracy',
      currentValue: parseFloat(worstAcc.toFixed(1)),
      threshold: ACCURACY_THRESHOLD,
      consecutiveDays: accConsecutive,
    });
  }

  if (timeConsecutive >= CONSECUTIVE_DAYS_TRIGGER) {
    violations.push({
      type: 'timeliness',
      currentValue: parseFloat(worstTime.toFixed(1)),
      threshold: TIMELINESS_THRESHOLD,
      consecutiveDays: timeConsecutive,
    });
  }

  return violations;
}

function isStillViolated(alert: Alert, metrics: DailyMetrics[]): boolean {
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sorted[0];
  if (!latest) return false;

  if (alert.type === 'accuracy') {
    return latest.classificationAccuracy < alert.threshold;
  }
  return latest.collectionTimeliness < alert.threshold;
}

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86400000);
}

function makeId(): string {
  return `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function addPushRecord(alert: Alert, receiver: string): void {
  const record: AlertPushRecord = {
    pushedAt: new Date().toISOString(),
    receiver,
    confirmed: false,
  };
  alert.pushRecords.push(record);
}

export function scanAlerts(db: MemoryDb): Alert[] {
  const cityRegions = db.regions.filter(
    (r) => r.level === 'city' || r.level === 'province' || r.level === 'national',
  );

  const createdOrUpdated: Alert[] = [];

  for (const region of cityRegions) {
    const metrics = db.dailyMetrics[region.code];
    if (!metrics) continue;

    const violations = findViolations(metrics.slice(0, 7));

    for (const violation of violations) {
      let existing = db.alerts.find(
        (a) =>
          a.regionCode === region.code &&
          a.type === violation.type &&
          (a.status === 'active' || a.status === 'escalated' || a.status === 'processing'),
      );

      if (!existing) {
        const level: AlertLevel = 1;
        const newAlert: Alert = {
          id: makeId(),
          level,
          type: violation.type,
          regionCode: region.code,
          regionName: region.name,
          triggeredAt: new Date().toISOString(),
          currentValue: violation.currentValue,
          threshold: violation.threshold,
          consecutiveDays: violation.consecutiveDays,
          status: 'active',
          responsiblePerson: `${region.name}环卫负责人`,
          pushRecords: [],
        };
        addPushRecord(newAlert, newAlert.responsiblePerson);
        db.alerts.unshift(newAlert);
        createdOrUpdated.push(newAlert);
      } else {
        existing.currentValue = violation.currentValue;
        existing.consecutiveDays = violation.consecutiveDays;

        const daysTriggered = daysSince(existing.triggeredAt);
        if (
          existing.level === 1 &&
          daysTriggered >= ESCALATION_DAYS &&
          existing.status !== 'escalated'
        ) {
          existing.level = 2;
          existing.status = 'escalated';
          existing.escalatedAt = new Date().toISOString();
          existing.approvalStatus = 'pending_station';
          addPushRecord(existing, `${region.name}站长`);
        }
        createdOrUpdated.push(existing);
      }
    }

    const activeAlerts = db.alerts.filter(
      (a) =>
        a.regionCode === region.code &&
        (a.status === 'active' || a.status === 'escalated' || a.status === 'processing'),
    );

    for (const alert of activeAlerts) {
      const hasActiveViolation = violations.some((v) => v.type === alert.type);
      if (!hasActiveViolation && !isStillViolated(alert, metrics)) {
        alert.status = 'resolved';
        createdOrUpdated.push(alert);
      }
    }
  }

  return createdOrUpdated;
}

export function approveAlert(
  db: MemoryDb,
  alertId: string,
  step: 'station' | 'manager' | 'bureau',
  approved: boolean,
  comment?: string,
  approverId?: string,
): Alert | null {
  const alert = db.alerts.find((a) => a.id === alertId);
  if (!alert) return null;

  if (!approved) {
    alert.status = 'resolved';
    if (comment) {
      addPushRecord(alert, approverId || '审批人');
    }
    return alert;
  }

  let nextStatus: ApprovalStatus;
  let receiver: string;

  switch (step) {
    case 'station':
      nextStatus = 'pending_manager';
      receiver = '区域经理';
      break;
    case 'manager':
      nextStatus = 'pending_bureau';
      receiver = '城管局';
      break;
    case 'bureau':
      nextStatus = 'approved';
      receiver = alert.responsiblePerson;
      alert.status = 'processing';
      break;
    default:
      return null;
  }

  alert.approvalStatus = nextStatus;
  addPushRecord(alert, receiver);
  return alert;
}

let scanTask: cron.ScheduledTask | null = null;

export function scheduleAlertScan(db: MemoryDb): cron.ScheduledTask {
  if (scanTask) {
    scanTask.stop();
  }

  scanTask = cron.schedule('0 * * * *', () => {
    try {
      const updated = scanAlerts(db);
      console.log(
        `[AlertEngine] 定时扫描完成，更新/新增预警 ${updated.length} 条 - ${new Date().toISOString()}`,
      );
    } catch (err) {
      console.error('[AlertEngine] 扫描出错:', err);
    }
  });

  console.log('[AlertEngine] 预警定时扫描任务已启动（每小时执行）');
  return scanTask;
}

export function stopAlertScan(): void {
  if (scanTask) {
    scanTask.stop();
    scanTask = null;
    console.log('[AlertEngine] 预警定时扫描任务已停止');
  }
}
