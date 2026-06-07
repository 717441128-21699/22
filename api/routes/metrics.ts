import { Router, type Request, type Response } from 'express'
import { generateDailyMetrics, generateAlerts } from '../../shared/mockData.js'
import type { MetricsOverview, RegionMetrics } from '../../shared/types.js'

const router = Router()

router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  const dailyData = generateDailyMetrics('000000', 30)
  const alerts = generateAlerts()
  const latest = dailyData[dailyData.length - 1]
  const previous = dailyData[dailyData.length - 2]

  const totalWasteCollected = Object.values(latest.wasteByType).reduce((a, b) => a + b, 0)
  const prevTotal = Object.values(previous.wasteByType).reduce((a, b) => a + b, 0)

  const overview: MetricsOverview = {
    classificationAccuracy: latest.classificationAccuracy,
    collectionTimeliness: latest.collectionTimeliness,
    resourceConversionRate: latest.resourceConversionRate,
    totalWasteCollected,
    alertsActive: alerts.filter((a) => a.status === 'active' || a.status === 'processing' || a.status === 'escalated').length,
    alertsLevel1: alerts.filter((a) => a.level === 1).length,
    alertsLevel2: alerts.filter((a) => a.level === 2).length,
    comparedYesterday: {
      classificationAccuracy: +(latest.classificationAccuracy - previous.classificationAccuracy).toFixed(1),
      collectionTimeliness: +(latest.collectionTimeliness - previous.collectionTimeliness).toFixed(1),
      resourceConversionRate: +(latest.resourceConversionRate - previous.resourceConversionRate).toFixed(1),
      totalWasteCollected: totalWasteCollected - prevTotal,
    },
  }

  res.json({
    success: true,
    data: overview,
  })
})

router.get('/region', async (req: Request, res: Response): Promise<void> => {
  const regionCode = (req.query.regionCode as string) || '000000'
  const regionName = (req.query.regionName as string) || '全国'
  const days = parseInt((req.query.days as string) || '30', 10)

  const dailyData = generateDailyMetrics(regionCode, days)

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
