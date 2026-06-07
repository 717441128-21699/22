import { Router, type Request, type Response } from 'express'
import { generateDailyMetrics } from '../../shared/mockData.js'
import type { HeatmapItem } from '../../shared/types.js'

const PROVINCES: [string, string][] = [
  ['110000', '北京市'], ['120000', '天津市'], ['130000', '河北省'], ['140000', '山西省'],
  ['150000', '内蒙古自治区'], ['210000', '辽宁省'], ['220000', '吉林省'], ['230000', '黑龙江省'],
  ['310000', '上海市'], ['320000', '江苏省'], ['330000', '浙江省'], ['340000', '安徽省'],
  ['350000', '福建省'], ['360000', '江西省'], ['370000', '山东省'], ['410000', '河南省'],
  ['420000', '湖北省'], ['430000', '湖南省'], ['440000', '广东省'], ['450000', '广西壮族自治区'],
  ['460000', '海南省'], ['500000', '重庆市'], ['510000', '四川省'], ['520000', '贵州省'],
  ['530000', '云南省'], ['540000', '西藏自治区'], ['610000', '陕西省'], ['620000', '甘肃省'],
  ['630000', '青海省'], ['640000', '宁夏回族自治区'], ['650000', '新疆维吾尔自治区'],
  ['710000', '台湾省'], ['810000', '香港特别行政区'], ['820000', '澳门特别行政区'],
]

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

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const data: HeatmapItem[] = PROVINCES.map(([code, name], idx) => {
    const seed = parseInt(code, 10) + idx
    const daily = generateDailyMetrics(code, 1)[0]
    const totalWaste = Object.values(daily.wasteByType).reduce((a, b) => a + b, 0)
    return {
      code,
      name,
      value: randRange(seed, 50, 500) + totalWaste,
      accuracy: daily.classificationAccuracy,
      timeliness: daily.collectionTimeliness,
      resourceRate: daily.resourceConversionRate,
    }
  })

  res.json({
    success: true,
    data,
  })
})

export default router
