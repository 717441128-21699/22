import { Router, type Request, type Response } from 'express'
import { generateWeeklyReports } from '../../shared/mockData.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const reports = generateWeeklyReports()
  const regionCode = req.query.regionCode as string

  let filtered = reports
  if (regionCode) {
    filtered = filtered.filter((r) => r.regionCode === regionCode)
  }

  const summary = filtered.map((r) => ({
    id: r.id,
    week: r.week,
    startDate: r.startDate,
    endDate: r.endDate,
    regionCode: r.regionCode,
    regionName: r.regionName,
    generatedAt: r.generatedAt,
    metricsSummary: {
      classificationAccuracy: r.metrics.classificationAccuracy.current,
      collectionTimeliness: r.metrics.collectionTimeliness.current,
      resourceConversionRate: r.metrics.resourceConversionRate.current,
    },
  }))

  res.json({
    success: true,
    data: summary,
  })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const reports = generateWeeklyReports()
  const report = reports.find((r) => r.id === req.params.id)

  if (!report) {
    res.status(404).json({
      success: false,
      error: '报告不存在',
    })
    return
  }

  res.json({
    success: true,
    data: report,
  })
})

export default router
