import { Router, type Request, type Response } from 'express';
import { memoryDb } from '../db/memoryDb.js';
import { verifyToken, filterByRegion, isRegionAccessible } from '../middleware/auth.js';
import type { WasteBin, CollectionVehicle, User } from '../../shared/types.js';

const router = Router();

function resolveRegionCode(requested: string | undefined, user: User): string {
  if (!requested || requested === '000000') {
    return user.regionCode || '000000';
  }
  return requested;
}

router.get('/bins', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user;
  const requestedRegion = req.query.regionCode as string | undefined;
  const regionCode = resolveRegionCode(requestedRegion, user);
  const status = req.query.status as WasteBin['status'] | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

  if (!isRegionAccessible(regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该区域数据',
    });
    return;
  }

  const allowedCodes = filterByRegion(regionCode, user, memoryDb);
  let allBins: WasteBin[] = [];
  for (const code of allowedCodes) {
    allBins.push(...memoryDb.getBins(code, status));
  }

  const uniqueBins = Array.from(new Map(allBins.map((b) => [b.id, b])).values());
  const total = uniqueBins.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const data = uniqueBins.slice(start, start + pageSize);

  res.json({
    success: true,
    data,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
  });
});

router.get('/vehicles', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user;
  const requestedRegion = req.query.regionCode as string | undefined;
  const regionCode = resolveRegionCode(requestedRegion, user);
  const status = req.query.status as CollectionVehicle['status'] | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

  if (!isRegionAccessible(regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该区域数据',
    });
    return;
  }

  const allowedCodes = filterByRegion(regionCode, user, memoryDb);
  let allVehicles: CollectionVehicle[] = [];
  for (const code of allowedCodes) {
    allVehicles.push(...memoryDb.getVehicles(code, status));
  }

  const uniqueVehicles = Array.from(new Map(allVehicles.map((v) => [v.id, v])).values());
  const total = uniqueVehicles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const data = uniqueVehicles.slice(start, start + pageSize);

  res.json({
    success: true,
    data,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
  });
});

router.get('/plants', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user;
  const requestedRegion = req.query.regionCode as string | undefined;
  const regionCode = resolveRegionCode(requestedRegion, user);
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

  if (!isRegionAccessible(regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该区域数据',
    });
    return;
  }

  const allowedCodes = filterByRegion(regionCode, user, memoryDb);
  let allPlants = [];
  for (const code of allowedCodes) {
    allPlants.push(...memoryDb.getPlants(code));
  }

  const uniquePlants = Array.from(new Map(allPlants.map((p) => [p.id, p])).values());
  const total = uniquePlants.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const data = uniquePlants.slice(start, start + pageSize);

  res.json({
    success: true,
    data,
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
  });
});

export default router;
