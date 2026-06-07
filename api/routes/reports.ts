import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, isRegionAccessible, requireRole } from '../middleware/auth.js'
import { getReports, generateWeeklyReport } from '../services/reportGenerator.js'
import type { User, WeeklyReport } from '../../shared/types.js'

const router = Router()

function ensureReportComplete(report: any): WeeklyReport {
  const r = report as any

  const fillMetric = (m: any) => {
    const current = typeof m?.current === 'number' ? m.current : 0
    const lastWeek = typeof m?.lastWeek === 'number' ? m.lastWeek : (typeof m?.mom === 'number' ? current - m.mom : current)
    const lastYear = typeof m?.lastYear === 'number' ? m.lastYear : (typeof m?.yoy === 'number' ? current - m.yoy : current)
    const yoy = typeof m?.yoy === 'number' ? m.yoy : (lastYear !== 0 ? parseFloat(((current - lastYear) / lastYear * 100).toFixed(1)) : 0)
    const mom = typeof m?.mom === 'number' ? m.mom : (lastWeek !== 0 ? parseFloat(((current - lastWeek) / lastWeek * 100).toFixed(1)) : 0)
    return { current, lastWeek, lastYear, yoy, mom }
  }

  return {
    id: r.id,
    week: r.week,
    startDate: r.startDate,
    endDate: r.endDate,
    regionCode: r.regionCode,
    regionName: r.regionName,
    generatedAt: r.generatedAt,
    metrics: {
      classificationAccuracy: fillMetric(r.metrics?.classificationAccuracy),
      collectionTimeliness: fillMetric(r.metrics?.collectionTimeliness),
      resourceConversionRate: fillMetric(r.metrics?.resourceConversionRate),
      wasteByTypeTrend: Array.isArray(r.metrics?.wasteByTypeTrend) ? r.metrics.wasteByTypeTrend : [],
    },
    costAnalysis: {
      weeklyTotal: typeof r.costAnalysis?.weeklyTotal === 'number' ? r.costAnalysis.weeklyTotal : 0,
      unitCost: typeof r.costAnalysis?.unitCost === 'number' ? r.costAnalysis.unitCost : 0,
      trend: Array.isArray(r.costAnalysis?.trend) ? r.costAnalysis.trend : [],
    },
    recommendations: {
      routeOptimization: Array.isArray(r.recommendations?.routeOptimization) ? r.recommendations.routeOptimization : [],
      publicityFocus: Array.isArray(r.recommendations?.publicityFocus) ? r.recommendations.publicityFocus : [],
    },
  }
}

router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const regionCode = req.query.regionCode as string | undefined

  const reports = getReports(regionCode, user, memoryDb)

  const summary = reports.map((r) => {
    const complete = ensureReportComplete(r)
    return {
      id: complete.id,
      week: complete.week,
      startDate: complete.startDate,
      endDate: complete.endDate,
      regionCode: complete.regionCode,
      regionName: complete.regionName,
      generatedAt: complete.generatedAt,
      metricsSummary: {
        classificationAccuracy: complete.metrics.classificationAccuracy.current,
        collectionTimeliness: complete.metrics.collectionTimeliness.current,
        resourceConversionRate: complete.metrics.resourceConversionRate.current,
      },
    }
  })

  res.json({
    success: true,
    data: summary,
  })
})

router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const allReports = memoryDb.reports && memoryDb.reports.length > 0 ? memoryDb.reports : memoryDb.weeklyReports
  const report = allReports.find((r) => r.id === req.params.id)

  if (!report) {
    res.status(404).json({
      success: false,
      error: '报告不存在',
    })
    return
  }

  if (!isRegionAccessible(report.regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该报告',
    })
    return
  }

  const complete = ensureReportComplete(report)

  res.json({
    success: true,
    data: complete,
  })
})

router.post('/generate', verifyToken, requireRole('provincial'), async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const { regionCode } = req.body

  const targetRegionCode = regionCode || user.regionCode

  if (!isRegionAccessible(targetRegionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法为该区域生成报告',
    })
    return
  }

  const report = generateWeeklyReport(targetRegionCode, memoryDb)

  if (!report) {
    res.status(400).json({
      success: false,
      error: '报告生成失败，区域无效或数据不足',
    })
    return
  }

  memoryDb.weeklyReports.unshift(report)
  memoryDb.reports.unshift(report)

  res.json({
    success: true,
    data: report,
    message: '周报生成成功',
  })
})

export default router
