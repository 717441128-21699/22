import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, filterByRegion, isRegionAccessible } from '../middleware/auth.js'
import { parseExcel, predict7Days, generateRecommendations } from '../services/forecastService.js'
import type { User, ForecastResult, ExtractedPlan, ForecastDay, ForecastRecommendation } from '../../shared/types.js'

const router = Router()

function resolveRegionCode(targetRegion: string | undefined, user: User): string {
  const allowedCodes = filterByRegion('000000', user, memoryDb)

  if (targetRegion) {
    for (const region of memoryDb.regions) {
      if (region.name === targetRegion || targetRegion.includes(region.name)) {
        if (allowedCodes.includes(region.code)) {
          return region.code
        }
      }
    }
    const matched = memoryDb.regions.find((r) => allowedCodes.includes(r.code) && r.level === 'city')
    if (matched) return matched.code
  }

  if (allowedCodes.includes(user.regionCode)) {
    return user.regionCode
  }

  const fallback = allowedCodes.find((c) => c !== '000000') || '000000'
  return fallback
}

router.post('/upload', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user

  const buffer = req.body as Buffer
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    res.status(400).json({
      success: false,
      error: '未接收到有效的Excel文件数据',
    })
    return
  }

  let extractedPlan: ExtractedPlan
  try {
    extractedPlan = parseExcel(buffer)
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Excel文件解析失败，请检查文件格式',
    })
    return
  }

  const regionCode = resolveRegionCode(extractedPlan.targetRegion, user)

  if (!isRegionAccessible(regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法为该区域生成预测',
    })
    return
  }

  const prediction: ForecastDay[] = predict7Days(regionCode, memoryDb, extractedPlan)
  const recommendations: ForecastRecommendation[] = generateRecommendations(prediction, memoryDb, regionCode)

  const result: ForecastResult = {
    extractedPlan,
    prediction,
    recommendations,
  }

  res.json({
    success: true,
    data: result,
    message: 'Excel解析完成，已生成预测结果',
  })
})

router.get('/sample', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const regionCode = user.regionCode || '000000'

  const extractedPlan: ExtractedPlan = {
    campaignName: '2026年春季垃圾分类宣传周活动',
    targetRegion: memoryDb.regions.find((r) => r.code === regionCode)?.name || '全国',
    startDate: '2026-03-15',
    endDate: '2026-03-21',
    targetPopulation: 5000000,
    budget: 3000000,
    keyActions: ['全国统一宣传主题推广', '各地社区现场活动', '媒体集中报道'],
  }

  const prediction: ForecastDay[] = predict7Days(regionCode, memoryDb, extractedPlan)
  const recommendations: ForecastRecommendation[] = generateRecommendations(prediction, memoryDb, regionCode)

  const result: ForecastResult = {
    extractedPlan,
    prediction,
    recommendations,
  }

  res.json({
    success: true,
    data: result,
  })
})

export default router
