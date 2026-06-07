import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, isRegionAccessible, requireRole } from '../middleware/auth.js'
import { getReports, generateWeeklyReport } from '../services/reportGenerator.js'
import type { User } from '../../shared/types.js'

const router = Router()

router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const regionCode = req.query.regionCode as string | undefined

  const reports = getReports(regionCode, user, memoryDb)

  const summary = reports.map((r) => ({
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

  res.json({
    success: true,
    data: report,
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
