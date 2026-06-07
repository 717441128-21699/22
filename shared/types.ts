export type UserRole = 'national' | 'provincial' | 'municipal' | 'regional';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  regionCode: string;
  regionName: string;
}

export interface Region {
  code: string;
  name: string;
  parentCode: string | null;
  level: 'national' | 'province' | 'city' | 'district';
}

export interface DailyMetrics {
  date: string;
  classificationAccuracy: number;
  collectionTimeliness: number;
  resourceConversionRate: number;
  wasteByType: {
    recyclable: number;
    kitchen: number;
    hazardous: number;
    other: number;
  };
}

export interface MetricsOverview {
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

export interface RegionMetrics {
  regionCode: string;
  regionName: string;
  dailyData: DailyMetrics[];
}

export interface HeatmapItem {
  code: string;
  name: string;
  value: number;
  accuracy: number;
  timeliness: number;
  resourceRate: number;
}

export type AlertType = 'accuracy' | 'timeliness';
export type AlertLevel = 1 | 2;
export type AlertStatus = 'active' | 'processing' | 'resolved' | 'escalated';
export type ApprovalStatus = 'pending_station' | 'pending_manager' | 'pending_bureau' | 'approved' | 'rejected';

export interface AlertPushRecord {
  pushedAt: string;
  receiver: string;
  confirmed: boolean;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  regionCode: string;
  regionName: string;
  triggeredAt: string;
  escalatedAt?: string;
  currentValue: number;
  threshold: number;
  consecutiveDays: number;
  status: AlertStatus;
  approvalStatus?: ApprovalStatus;
  responsiblePerson: string;
  pushRecords: AlertPushRecord[];
}

export interface WasteBin {
  id: string;
  regionCode: string;
  stationName: string;
  fillLevel: number;
  status: 'normal' | 'full' | 'overflow' | 'offline';
  lastUpdated: string;
  lat: number;
  lng: number;
}

export interface CollectionVehicle {
  id: string;
  plateNumber: string;
  regionCode: string;
  lat: number;
  lng: number;
  loadLevel: number;
  status: 'idle' | 'collecting' | 'transporting' | 'discharging';
  currentRoute: string;
  estimatedArrival: string;
  lastUpdated: string;
}

export interface ProcessingPlant {
  id: string;
  name: string;
  regionCode: string;
  dailyCapacity: number;
  currentLoad: number;
  todayInput: number;
  todayOutput: number;
  resourceRate: number;
  lastUpdated: string;
}

export interface ExtractedPlan {
  campaignName: string;
  targetRegion: string;
  startDate: string;
  endDate: string;
  targetPopulation: number;
  budget: number;
  keyActions: string[];
}

export interface ForecastDay {
  date: string;
  recyclable: number;
  kitchen: number;
  hazardous: number;
  other: number;
  total: number;
  processingCapacity: number;
  exceedsCapacity: boolean;
}

export interface ForecastRecommendation {
  type: 'frequency' | 'line';
  description: string;
  affectedStations?: string[];
}

export interface ForecastResult {
  extractedPlan: ExtractedPlan;
  prediction: ForecastDay[];
  recommendations: ForecastRecommendation[];
}

export interface WeeklyReport {
  id: string;
  week: string;
  startDate: string;
  endDate: string;
  regionCode: string;
  regionName: string;
  generatedAt: string;
  metrics: {
    classificationAccuracy: { current: number; lastWeek?: number; lastYear?: number; yoy?: number; mom?: number };
    collectionTimeliness: { current: number; lastWeek?: number; lastYear?: number; yoy?: number; mom?: number };
    resourceConversionRate: { current: number; lastWeek?: number; lastYear?: number; yoy?: number; mom?: number };
    wasteByTypeTrend?: { date: string; recyclable: number; kitchen: number; hazardous: number; other: number }[];
  };
  costAnalysis: {
    weeklyTotal: number;
    unitCost: number;
    trend: { date: string; cost: number }[];
  };
  recommendations: {
    routeOptimization: { region: string; suggestion: string }[];
    publicityFocus: { region: string; focus: string }[];
  };
}
