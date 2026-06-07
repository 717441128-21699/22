import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, filterByRegion, isRegionAccessible } from '../middleware/auth.js'
import type { MetricsOverview, RegionMetrics, DailyMetrics, User } from '../../shared/types.js'

const router = Router()

function aggregateMetrics(metricsList: DailyMetrics[]): { latest: DailyMetrics | null; previous: DailyMetrics | null } {
  if (metricsList.length === 0) return { latest: null, previous: null }

  const sorted = [...metricsList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const latestDate = sorted[0].date
  const previousDate = sorted.find((m) => m.date !== latestDate)?.date

  const latestEntries = sorted.filter((m) => m.date === latestDate)
  const previousEntries = previousDate ? sorted.filter((m) => m.date === previousDate) : []

  const latest = latestEntries.length > 0 ? mergeDailyMetrics(latestEntries, latestDate) : null
  const previous = previousEntries.length > 0 ? mergeDailyMetrics(previousEntries, previousDate!) : null

  return { latest, previous }
}

function mergeDailyMetrics(entries: DailyMetrics[], date: string): DailyMetrics {
  const n = entries.length
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const avg = (arr: number[]) => (arr.length > 0 ? sum(arr) / arr.length : 0)

  return {
    date,
    classificationAccuracy: parseFloat(avg(entries.map((e) => e.classificationAccuracy)).toFixed(1)),
    collectionTimeliness: parseFloat(avg(entries.map((e) => e.collectionTimeliness)).toFixed(1)),
    resourceConversionRate: parseFloat(avg(entries.map((e) => e.resourceConversionRate)).toFixed(1)),
    wasteByType: {
      recyclable: Math.round(sum(entries.map((e) => e.wasteByType.recyclable)) / n),
      kitchen: Math.round(sum(entries.map((e) => e.wasteByType.kitchen)) / n),
      hazardous: Math.round(sum(entries.map((e) => e.wasteByType.hazardous)) / n),
      other: Math.round(sum(entries.map((e) => e.wasteByType.other)) / n),
    },
  }
}

router.get('/overview', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const allowedCodes = filterByRegion('000000', user, memoryDb)

  const allMetrics: DailyMetrics[] = []
  for (const code of allowedCodes) {
    const metrics = memoryDb.dailyMetrics[code]
    if (metrics) {
      allMetrics.push(...metrics)
    }
  }

  const { latest, previous } = aggregateMetrics(allMetrics)

  if (!latest) {
    res.json({
      success: true,
      data: {
        classificationAccuracy: 0,
        collectionTimeliness: 0,
        resourceConversionRate: 0,
        totalWasteCollected: 0,
        alertsActive: 0,
        alertsLevel1: 0,
        alertsLevel2: 0,
        comparedYesterday: {
          classificationAccuracy: 0,
          collectionTimeliness: 0,
          resourceConversionRate: 0,
          totalWasteCollected: 0,
        },
      },
    })
    return
  }

  const alerts = memoryDb.alerts.filter((a) => allowedCodes.includes(a.regionCode))
  const totalWasteCollected = Object.values(latest.wasteByType).reduce((a, b) => a + b, 0)
  const prevTotal = previous ? Object.values(previous.wasteByType).reduce((a, b) => a + b, 0) : 0

  const overview: MetricsOverview = {
    classificationAccuracy: latest.classificationAccuracy,
    collectionTimeliness: latest.collectionTimeliness,
    resourceConversionRate: latest.resourceConversionRate,
    totalWasteCollected,
    alertsActive: alerts.filter((a) => a.status === 'active' || a.status === 'processing' || a.status === 'escalated').length,
    alertsLevel1: alerts.filter((a) => a.level === 1).length,
    alertsLevel2: alerts.filter((a) => a.level === 2).length,
    comparedYesterday: {
      classificationAccuracy: previous ? +(latest.classificationAccuracy - previous.classificationAccuracy).toFixed(1) : 0,
      collectionTimeliness: previous ? +(latest.collectionTimeliness - previous.collectionTimeliness).toFixed(1) : 0,
      resourceConversionRate: previous ? +(latest.resourceConversionRate - previous.resourceConversionRate).toFixed(1) : 0,
      totalWasteCollected: totalWasteCollected - prevTotal,
    },
  }

  res.json({
    success: true,
    data: overview,
  })
})

router.get('/region', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const regionCode = (req.query.regionCode as string) || '000000'
  const days = parseInt((req.query.days as string) || '30', 10)

  if (!isRegionAccessible(regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该区域数据',
    })
    return
  }

  const allowedCodes = filterByRegion(regionCode, user, memoryDb)
  const region = memoryDb.regions.find((r) => r.code === regionCode)
  const regionName = region?.name || '未知区域'

  const metricsByDate: Record<string, DailyMetrics[]> = {}
  for (const code of allowedCodes) {
    const metrics = memoryDb.dailyMetrics[code]
    if (!metrics) continue
    for (const m of metrics) {
      if (!metricsByDate[m.date]) metricsByDate[m.date] = []
      metricsByDate[m.date].push(m)
    }
  }

  const sortedDates = Object.keys(metricsByDate).sort().slice(-days)
  const dailyData: DailyMetrics[] = sortedDates.map((date) => mergeDailyMetrics(metricsByDate[date], date))

  const regionMetrics: RegionMetrics = {
    regionCode,
    regionName,
    dailyData,
  }

  res.json({
    success: true,
    data: regionMetrics,
  })
})

export default router
