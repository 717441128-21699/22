import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { verifyToken, filterByRegion, isRegionAccessible } from '../middleware/auth.js'
import { approveAlert } from '../services/alertEngine.js'
import type { Alert, AlertStatus, AlertLevel, User } from '../../shared/types.js'

const router = Router()

router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const allowedCodes = filterByRegion('000000', user, memoryDb)

  const status = req.query.status as AlertStatus | undefined
  const level = req.query.level as string | undefined

  let filtered = memoryDb.alerts.filter((a) => allowedCodes.includes(a.regionCode))

  if (status) {
    filtered = filtered.filter((a) => a.status === status)
  }
  if (level) {
    const lvl = parseInt(level, 10) as AlertLevel
    filtered = filtered.filter((a) => a.level === lvl)
  }

  res.json({
    success: true,
    data: filtered,
  })
})

router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const alert = memoryDb.alerts.find((a) => a.id === req.params.id)

  if (!alert) {
    res.status(404).json({
      success: false,
      error: '预警不存在',
    })
    return
  }

  if (!isRegionAccessible(alert.regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法访问该预警',
    })
    return
  }

  res.json({
    success: true,
    data: alert,
  })
})

router.post('/:id/approve', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  const alert = memoryDb.alerts.find((a) => a.id === req.params.id)

  if (!alert) {
    res.status(404).json({
      success: false,
      error: '预警不存在',
    })
    return
  }

  if (!isRegionAccessible(alert.regionCode, user, memoryDb)) {
    res.status(403).json({
      success: false,
      error: '权限不足，无法审批该预警',
    })
    return
  }

  let step: 'station' | 'manager' | 'bureau' | undefined
  let approved: boolean | undefined
  let comment: string | undefined

  if (typeof req.body.step !== 'undefined' && typeof req.body.approved !== 'undefined') {
    step = req.body.step
    approved = !!req.body.approved
    comment = req.body.comment
  } else if (typeof req.body.action !== 'undefined') {
    const action: string = req.body.action
    comment = req.body.comment

    if (action === 'rejected') {
      approved = false
      step = 'station'
    } else {
      approved = true
      const currentStatus = alert.approvalStatus
      if (action === 'pending_manager' && currentStatus === 'pending_station') {
        step = 'station'
      } else if (action === 'pending_bureau' && currentStatus === 'pending_manager') {
        step = 'manager'
      } else if (action === 'approved' && currentStatus === 'pending_bureau') {
        step = 'bureau'
      } else if (action === 'pending_manager') {
        step = 'station'
      } else if (action === 'pending_bureau') {
        step = 'manager'
      } else if (action === 'approved') {
        step = 'bureau'
      }
    }
  }

  if (!step || typeof approved === 'undefined') {
    res.status(400).json({
      success: false,
      error: '缺少必要参数：需要 step+approved 或 action',
    })
    return
  }

  const validSteps = ['station', 'manager', 'bureau'] as const
  if (!validSteps.includes(step)) {
    res.status(400).json({
      success: false,
      error: '无效的审批阶段，必须是 station、manager 或 bureau',
    })
    return
  }

  const result = approveAlert(memoryDb, req.params.id, step, approved, comment, user.id)

  if (!result) {
    res.status(400).json({
      success: false,
      error: '审批失败',
    })
    return
  }

  res.json({
    success: true,
    data: result,
    message: comment ? `审批已提交：${comment}` : '审批已提交',
  })
})

export default router
