import { Router, type Request, type Response } from 'express'
import type { ForecastResult, ForecastDay, ForecastRecommendation, ExtractedPlan } from '../../shared/types.js'

const router = Router()

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function randRange(seed: number, min: number, max: number, decimals = 0): number {
  const rand = seededRandom(seed)
  const val = min + rand() * (max - min)
  return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val)
}

router.post('/upload', async (req: Request, res: Response): Promise<void> => {
  const seed = Date.now() % 10000

  const extractedPlan: ExtractedPlan = {
    campaignName: '2026年第二季度垃圾分类宣传推广计划',
    targetRegion: '广东省深圳市南山区',
    startDate: new Date(Date.now() + 86400_000 * 3).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400_000 * 93).toISOString().slice(0, 10),
    targetPopulation: randRange(seed, 500000, 1200000),
    budget: randRange(seed, 800000, 2500000),
    keyActions: [
      '社区宣传活动：覆盖50个重点小区',
      '学校教育课程：进入30所中小学开展互动课程',
      '线上推广：短视频平台投放、公众号专题推送',
      '激励机制：积分兑换、优秀家庭评选',
      '督导员培训：新增100名垃圾分类督导员',
    ],
  }

  const prediction: ForecastDay[] = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const recyclable = randRange(seed + i * 7, 120, 220)
    const kitchen = randRange(seed + i * 11, 300, 600)
    const hazardous = randRange(seed + i * 13, 8, 40)
    const other = randRange(seed + i * 17, 150, 380)
    const total = recyclable + kitchen + hazardous + other
    const capacity = 900
    prediction.push({
      date: d.toISOString().slice(0, 10),
      recyclable,
      kitchen,
      hazardous,
      other,
      total,
      processingCapacity: capacity,
      exceedsCapacity: total > capacity,
    })
  }

  const recommendations: ForecastRecommendation[] = [
    {
      type: 'frequency',
      description: '预计活动启动后第3-7天厨余垃圾量将增长25%，建议将南山片区收运频次从每日2次增至3次',
      affectedStations: ['科技园A区', '阳光花园', '翠湖小区', '学府路'],
    },
    {
      type: 'line',
      description: '第10-14日总垃圾量可能接近处理厂设计容量上限，建议临时调配至邻近处理厂分流',
    },
    {
      type: 'frequency',
      description: '可回收物预计增长40%，建议在商业街中心、人民广场增设可回收物收集点',
      affectedStations: ['商业街中心', '人民广场'],
    },
  ]

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

router.get('/sample', async (req: Request, res: Response): Promise<void> => {
  const seed = 42

  const extractedPlan: ExtractedPlan = {
    campaignName: '2026年春季垃圾分类宣传周活动',
    targetRegion: '全国重点城市',
    startDate: '2026-03-15',
    endDate: '2026-03-21',
    targetPopulation: 5000000,
    budget: 3000000,
    keyActions: [
      '全国统一宣传主题推广',
      '各地社区现场活动',
      '媒体集中报道',
    ],
  }

  const prediction: ForecastDay[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    prediction.push({
      date: d.toISOString().slice(0, 10),
      recyclable: randRange(seed + i, 100, 200),
      kitchen: randRange(seed + i + 10, 250, 500),
      hazardous: randRange(seed + i + 20, 5, 30),
      other: randRange(seed + i + 30, 120, 300),
      total: 0,
      processingCapacity: 1000,
      exceedsCapacity: false,
    })
  }
  prediction.forEach((p) => {
    p.total = p.recyclable + p.kitchen + p.hazardous + p.other
    p.exceedsCapacity = p.total > p.processingCapacity
  })

  const recommendations: ForecastRecommendation[] = [
    {
      type: 'frequency',
      description: '建议增加重点区域收运频次',
      affectedStations: ['示例站点1', '示例站点2'],
    },
  ]

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
