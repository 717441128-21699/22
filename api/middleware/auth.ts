import type { Request, Response, NextFunction } from 'express';
import type { User, UserRole, Region } from '../../shared/types.js';
import type { MemoryDb } from '../db/memoryDb.js';

const ROLE_LEVEL: Record<UserRole, number> = {
  national: 4,
  provincial: 3,
  municipal: 2,
  regional: 1,
};

export function createToken(user: User): string {
  const payload = Buffer.from(JSON.stringify(user), 'utf-8').toString('base64');
  return `Bearer ${payload}`;
}

export function parseToken(token: string): User | null {
  try {
    const clean = token.replace(/^Bearer\s+/i, '');
    const json = Buffer.from(clean, 'base64').toString('utf-8');
    const user = JSON.parse(json) as User;
    if (!user.id || !user.role || !user.regionCode) return null;
    return user;
  } catch {
    return null;
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ success: false, error: '缺少Authorization头' });
    return;
  }
  const user = parseToken(authHeader);
  if (!user) {
    res.status(401).json({ success: false, error: 'Token无效或已过期' });
    return;
  }
  (req as Request & { user: User }).user = user;
  next();
}

export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: User }).user;
    if (!user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }
    if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
      res.status(403).json({ success: false, error: '权限不足' });
      return;
    }
    next();
  };
}

export function filterByRegion(_regionCode: string, user: User, db: MemoryDb): string[] {
  const regions = db.regions;

  if (user.role === 'national') {
    return regions.map((r) => r.code);
  }

  if (user.role === 'provincial') {
    const provinceCode = user.regionCode;
    return regions
      .filter((r) => r.code === provinceCode || r.parentCode === provinceCode)
      .map((r) => r.code);
  }

  if (user.role === 'municipal') {
    const cityCode = user.regionCode;
    const children = regions.filter((r) => r.parentCode === cityCode).map((r) => r.code);
    return [cityCode, ...children];
  }

  return [user.regionCode];
}

export function isRegionAccessible(targetCode: string, user: User, db: MemoryDb): boolean {
  const allowed = filterByRegion(targetCode, user, db);
  return allowed.includes(targetCode);
}

export function getAccessibleRegions(user: User, db: MemoryDb): Region[] {
  const codes = filterByRegion('000000', user, db);
  return db.regions.filter((r) => codes.includes(r.code));
}

export function attachUser(req: Request): User | null {
  return (req as Request & { user?: User }).user || null;
}
