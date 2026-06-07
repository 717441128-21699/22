import type {
  WasteBin,
  CollectionVehicle,
  ProcessingPlant,
  DailyMetrics,
  Region,
  Alert,
  WeeklyReport,
  User,
} from '../../shared/types.js';
import {
  generateRegions,
  generateWasteBins,
  generateVehicles,
  generatePlants,
  generateDailyMetrics,
  generateAlerts,
  generateWeeklyReports,
  MOCK_USERS,
} from '../../shared/mockData.js';

const PROVINCE_CODES = [
  '110000', '120000', '130000', '140000', '150000', '210000', '220000', '230000',
  '310000', '320000', '330000', '340000', '350000', '360000', '370000', '410000',
  '420000', '430000', '440000', '450000', '460000', '500000', '510000', '520000',
  '530000', '540000', '610000', '620000', '630000', '640000', '650000', '710000',
  '810000', '820000',
];

class MemoryDatabase {
  public bins: Map<string, WasteBin> = new Map();
  public wasteBins: Record<string, WasteBin[]> = {};
  public vehicles: Map<string, CollectionVehicle> = new Map();
  public plants: Map<string, ProcessingPlant> = new Map();
  public dailyMetrics: Record<string, DailyMetrics[]> = {};
  public regions: Region[] = [];
  public alerts: Alert[] = [];
  public weeklyReports: WeeklyReport[] = [];
  public reports: WeeklyReport[] = [];
  public users: User[] = [];

  private initialized = false;

  private rebuildWasteBinsIndex(): void {
    this.wasteBins = {};
    for (const bin of this.bins.values()) {
      if (!this.wasteBins[bin.regionCode]) {
        this.wasteBins[bin.regionCode] = [];
      }
      this.wasteBins[bin.regionCode].push(bin);
    }
  }

  public init(): void {
    if (this.initialized) return;

    this.regions = generateRegions();
    this.alerts = generateAlerts();
    this.weeklyReports = generateWeeklyReports();
    this.reports = this.weeklyReports;
    this.users = [...MOCK_USERS];

    for (const code of PROVINCE_CODES) {
      const bins = generateWasteBins(code);
      for (const bin of bins) {
        this.bins.set(bin.id, bin);
      }

      const vehicles = generateVehicles(code);
      for (const vehicle of vehicles) {
        this.vehicles.set(vehicle.id, vehicle);
      }

      const plants = generatePlants(code);
      for (const plant of plants) {
        this.plants.set(plant.id, plant);
      }

      this.dailyMetrics[code] = generateDailyMetrics(code);
    }

    this.rebuildWasteBinsIndex();
    this.initialized = true;
  }

  public getBins(regionCode?: string, status?: WasteBin['status']): WasteBin[] {
    let result = Array.from(this.bins.values());
    if (regionCode && regionCode !== '000000') {
      result = result.filter((b) => b.regionCode === regionCode || b.regionCode.startsWith(regionCode.slice(0, 2)));
    }
    if (status) {
      result = result.filter((b) => b.status === status);
    }
    return result;
  }

  public getVehicles(regionCode?: string, status?: CollectionVehicle['status']): CollectionVehicle[] {
    let result = Array.from(this.vehicles.values());
    if (regionCode && regionCode !== '000000') {
      result = result.filter((v) => v.regionCode === regionCode || v.regionCode.startsWith(regionCode.slice(0, 2)));
    }
    if (status) {
      result = result.filter((v) => v.status === status);
    }
    return result;
  }

  public getPlants(regionCode?: string): ProcessingPlant[] {
    let result = Array.from(this.plants.values());
    if (regionCode && regionCode !== '000000') {
      result = result.filter((p) => p.regionCode === regionCode || p.regionCode.startsWith(regionCode.slice(0, 2)));
    }
    return result;
  }

  public getBin(id: string): WasteBin | undefined {
    return this.bins.get(id);
  }

  public setBin(bin: WasteBin): void {
    const old = this.bins.get(bin.id);
    this.bins.set(bin.id, bin);
    if (old && old.regionCode !== bin.regionCode) {
      this.rebuildWasteBinsIndex();
    } else {
      if (!this.wasteBins[bin.regionCode]) {
        this.wasteBins[bin.regionCode] = [];
      }
      const idx = this.wasteBins[bin.regionCode].findIndex((b) => b.id === bin.id);
      if (idx >= 0) {
        this.wasteBins[bin.regionCode][idx] = bin;
      } else {
        this.wasteBins[bin.regionCode].push(bin);
      }
    }
  }

  public upsertBin(bin: WasteBin): void {
    const merged: WasteBin = { ...this.bins.get(bin.id), ...bin } as WasteBin;
    this.setBin(merged);
  }

  public getVehicle(id: string): CollectionVehicle | undefined {
    return this.vehicles.get(id);
  }

  public setVehicle(vehicle: CollectionVehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  public upsertVehicle(vehicle: CollectionVehicle): void {
    this.vehicles.set(vehicle.id, { ...this.vehicles.get(vehicle.id), ...vehicle });
  }

  public getPlant(id: string): ProcessingPlant | undefined {
    return this.plants.get(id);
  }

  public setPlant(plant: ProcessingPlant): void {
    this.plants.set(plant.id, plant);
  }

  public upsertPlant(plant: ProcessingPlant): void {
    this.plants.set(plant.id, { ...this.plants.get(plant.id), ...plant });
  }

  public clear(): void {
    this.bins.clear();
    this.wasteBins = {};
    this.vehicles.clear();
    this.plants.clear();
    this.dailyMetrics = {};
    this.regions = [];
    this.alerts = [];
    this.weeklyReports = [];
    this.reports = [];
    this.users = [];
    this.initialized = false;
  }
}

export type MemoryDb = MemoryDatabase;

export const memoryDb = new MemoryDatabase();
