import { memoryDb } from '../db/memoryDb.js';
import { broadcast } from './wsServer.js';
import type { WasteBin, CollectionVehicle, ProcessingPlant } from '../../shared/types.js';

const VEHICLE_STATUSES: CollectionVehicle['status'][] = ['idle', 'collecting', 'transporting', 'discharging'];

let binInterval: NodeJS.Timeout | null = null;
let vehicleInterval: NodeJS.Timeout | null = null;
let plantInterval: NodeJS.Timeout | null = null;
let started = false;

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: T[], ratio: number): T[] {
  const count = Math.max(1, Math.floor(arr.length * ratio));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function computeBinStatus(fillLevel: number): WasteBin['status'] {
  if (fillLevel >= 95) return 'overflow';
  if (fillLevel >= 80) return 'full';
  if (fillLevel < 5) return 'offline';
  return 'normal';
}

function updateBins(): void {
  const allBins = Array.from(memoryDb.bins.values());
  const selected = pickRandom(allBins, 0.1);
  const updated: WasteBin[] = [];

  for (const bin of selected) {
    const delta = randomRange(-5, 5);
    const newFill = Math.max(0, Math.min(100, bin.fillLevel + delta));
    const newStatus = computeBinStatus(newFill);
    const updatedBin: WasteBin = {
      ...bin,
      fillLevel: Math.round(newFill * 10) / 10,
      status: newStatus,
      lastUpdated: new Date().toISOString(),
    };
    memoryDb.setBin(updatedBin);
    updated.push(updatedBin);
  }

  if (updated.length > 0) {
    broadcast('bins', updated);
  }
}

function updateVehicles(): void {
  const allVehicles = Array.from(memoryDb.vehicles.values());
  const selected = pickRandom(allVehicles, 0.1);
  const updated: CollectionVehicle[] = [];

  for (const vehicle of selected) {
    const latDelta = randomRange(-0.05, 0.05);
    const lngDelta = randomRange(-0.05, 0.05);
    const loadDelta = randomRange(-10, 15);
    const newLoad = Math.max(0, Math.min(100, vehicle.loadLevel + loadDelta));

    const shouldRotateStatus = Math.random() < 0.2;
    const newStatus = shouldRotateStatus
      ? randomChoice(VEHICLE_STATUSES)
      : vehicle.status;

    const eta = new Date(Date.now() + randomRange(600_000, 7200_000));

    const updatedVehicle: CollectionVehicle = {
      ...vehicle,
      lat: Math.round((vehicle.lat + latDelta) * 10000) / 10000,
      lng: Math.round((vehicle.lng + lngDelta) * 10000) / 10000,
      loadLevel: Math.round(newLoad),
      status: newStatus,
      estimatedArrival: eta.toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    memoryDb.setVehicle(updatedVehicle);
    updated.push(updatedVehicle);
  }

  if (updated.length > 0) {
    broadcast('vehicles', updated);
  }
}

function updatePlants(): void {
  const allPlants = Array.from(memoryDb.plants.values());
  const updated: ProcessingPlant[] = [];

  for (const plant of allPlants) {
    const inputDelta = randomRange(-20, 30);
    const newInput = Math.max(0, Math.min(plant.dailyCapacity, plant.todayInput + inputDelta));
    const outputDelta = randomRange(-10, 20);
    const newOutput = Math.max(0, Math.min(newInput, plant.todayOutput + outputDelta));
    const newLoad = Math.min(plant.dailyCapacity, plant.currentLoad + randomRange(-30, 40));

    const updatedPlant: ProcessingPlant = {
      ...plant,
      todayInput: Math.round(newInput),
      todayOutput: Math.round(newOutput),
      currentLoad: Math.round(newLoad),
      resourceRate: Math.round((45 + randomRange(-5, 10)) * 10) / 10,
      lastUpdated: new Date().toISOString(),
    };
    memoryDb.setPlant(updatedPlant);
    updated.push(updatedPlant);
  }

  if (updated.length > 0) {
    broadcast('plants', updated);
  }
}

export function startRealtimeEngine(): void {
  if (started) return;

  memoryDb.init();
  started = true;

  binInterval = setInterval(updateBins, 3000);
  vehicleInterval = setInterval(updateVehicles, 5000);
  plantInterval = setInterval(updatePlants, 10000);

  console.log('[REALTIME] Engine started');
}

export function stopRealtimeEngine(): void {
  if (binInterval) {
    clearInterval(binInterval);
    binInterval = null;
  }
  if (vehicleInterval) {
    clearInterval(vehicleInterval);
    vehicleInterval = null;
  }
  if (plantInterval) {
    clearInterval(plantInterval);
    plantInterval = null;
  }
  started = false;
  console.log('[REALTIME] Engine stopped');
}
