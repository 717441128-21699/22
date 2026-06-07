import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, isRegionAccessible, filterByRegion } from '../middleware/auth.js'
import type { HeatmapItem, DailyMetrics, User } from '../../shared/types.js'

const router = Router()

function getLatestMetrics(code: string): DailyMetrics | null {
  const metrics = memoryDb.dailyMetrics[code]
  if (!metrics || metrics.length === 0) return null
  const sorted = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return sorted[0]
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const provinces = memoryDb.regions.filter((r) => r.level === 'province')

  const data: HeatmapItem[] = provinces.map((region) => {
    const latest = getLatestMetrics(region.code)
    const totalWaste = latest
      ? Object.values(latest.wasteByType).reduce((a, b) => a + b, 0)
      : 0

    return {
      code: region.code,
      name: region.name,
      value: totalWaste,
      accuracy: latest?.classificationAccuracy ?? 0,
      timeliness: latest?.collectionTimeliness ?? 0,
      resourceRate: latest?.resourceConversionRate ?? 0,
    }
  })

  res.json({
    success: true,
    data,
  })
})

router.get('/:code/stations', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const provinceCode = req.params.code

  if (!isRegionAccessible(provinceCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该区域数据',
    })
    return
  }

  const allowedCodes = filterByRegion(provinceCode, user, memoryDb)
  const stations = memoryDb.regions.filter(
    (r) => r.parentCode === provinceCode || allowedCodes.includes(r.code),
  )

  const result = stations.map((station) => {
    const metrics = memoryDb.dailyMetrics[station.code] || []
    const sorted = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const last7Days = sorted.slice(0, 7)

    return {
      code: station.code,
      name: station.name,
      dailyMetrics: last7Days.map((m) => ({
        date: m.date,
        classificationAccuracy: m.classificationAccuracy,
        collectionTimeliness: m.collectionTimeliness,
        resourceConversionRate: m.resourceConversionRate,
        wasteByType: m.wasteByType,
      })),
    }
  })

  res.json({
    success: true,
    data: result,
  })
})

export default router
