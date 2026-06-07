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

  const province = memoryDb.regions.find((r) => r.code === provinceCode)
  if (!province) {
    res.status(404).json({
      success: false,
      error: '省份不存在',
    })
    return
  }

  const cities = memoryDb.regions.filter((r) => r.parentCode === provinceCode)
  const allRegionCodes = [provinceCode, ...cities.map((c) => c.code)]

  const dateMap = new Map<string, {
    accuracy: number[]
    timeliness: number[]
    resource: number[]
    wasteByType: { recyclable: number; kitchen: number; hazardous: number; other: number }
  }>()

  for (const code of allRegionCodes) {
    const metrics = memoryDb.dailyMetrics[code] || []
    const sorted = [...metrics].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const last7Days = sorted.slice(0, 7)

    for (const m of last7Days) {
      if (!dateMap.has(m.date)) {
        dateMap.set(m.date, {
          accuracy: [],
          timeliness: [],
          resource: [],
          wasteByType: { recyclable: 0, kitchen: 0, hazardous: 0, other: 0 },
        })
      }
      const entry = dateMap.get(m.date)!
      entry.accuracy.push(m.classificationAccuracy)
      entry.timeliness.push(m.collectionTimeliness)
      entry.resource.push(m.resourceConversionRate)
      entry.wasteByType.recyclable += m.wasteByType.recyclable
      entry.wasteByType.kitchen += m.wasteByType.kitchen
      entry.wasteByType.hazardous += m.wasteByType.hazardous
      entry.wasteByType.other += m.wasteByType.other
    }
  }

  function avg(nums: number[]): number {
    if (nums.length === 0) return 0
    const sum = nums.reduce((a, b) => a + b, 0)
    return parseFloat((sum / nums.length).toFixed(1))
  }

  const dailyData: DailyMetrics[] = Array.from(dateMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, entry]) => ({
      date,
      classificationAccuracy: avg(entry.accuracy),
      collectionTimeliness: avg(entry.timeliness),
      resourceConversionRate: avg(entry.resource),
      wasteByType: entry.wasteByType,
    }))

  const typeTotals = {
    recyclable: dailyData.reduce((s, d) => s + d.wasteByType.recyclable, 0),
    kitchen: dailyData.reduce((s, d) => s + d.wasteByType.kitchen, 0),
    hazardous: dailyData.reduce((s, d) => s + d.wasteByType.hazardous, 0),
    other: dailyData.reduce((s, d) => s + d.wasteByType.other, 0),
  }

  const result = {
    provinceCode: province.code,
    provinceName: province.name,
    dailyData,
    typeTotals,
  }

  res.json({
    success: true,
    data: result,
  })
})

export default router
