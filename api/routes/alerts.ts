import { Router, type Request, type Response } from 'express'
import { generateAlerts } from '../../shared/mockData.js'
import type { Alert, ApprovalStatus } from '../../shared/types.js'

const router = Router()

let alertsCache: Alert[] | null = null

function getAlerts(): Alert[] {
  if (!alertsCache) {
    alertsCache = generateAlerts()
  }
  return alertsCache
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const alerts = getAlerts()
  const status = req.query.status as string
  const level = req.query.level as string

  let filtered = alerts
  if (status) {
    filtered = filtered.filter((a) => a.status === status)
  }
  if (level) {
    filtered = filtered.filter((a) => a.level === parseInt(level, 10))
  }

  res.json({
    success: true,
    data: filtered,
  })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const alerts = getAlerts()
  const alert = alerts.find((a) => a.id === req.params.id)

  if (!alert) {
    res.status(404).json({
      success: false,
      error: '预警不存在',
    })
    return
  }

  res.json({
    success: true,
    data: alert,
  })
})

router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const alerts = getAlerts()
  const alert = alerts.find((a) => a.id === req.params.id)

  if (!alert) {
    res.status(404).json({
      success: false,
      error: '预警不存在',
    })
    return
  }

  const { action, comment } = req.body
  const validActions: ApprovalStatus[] = ['pending_station', 'pending_manager', 'pending_bureau', 'approved', 'rejected']

  if (action && !validActions.includes(action)) {
    res.status(400).json({
      success: false,
      error: '无效的审批操作',
    })
    return
  }

  if (action) {
    alert.approvalStatus = action
  }

  if (action === 'approved') {
    alert.status = 'resolved'
  } else if (action === 'rejected') {
    alert.status = 'escalated'
  }

  res.json({
    success: true,
    data: alert,
    message: comment ? `审批已提交：${comment}` : '审批已提交',
  })
})

router.post('/:id/escalate', async (req: Request, res: Response): Promise<void> => {
  const alerts = getAlerts()
  const alert = alerts.find((a) => a.id === req.params.id)

  if (!alert) {
    res.status(404).json({
      success: false,
      error: '预警不存在',
    })
    return
  }

  alert.status = 'escalated'
  alert.escalatedAt = new Date().toISOString()

  if (!alert.approvalStatus || alert.approvalStatus === 'pending_station') {
    alert.approvalStatus = 'pending_manager'
  } else if (alert.approvalStatus === 'pending_manager') {
    alert.approvalStatus = 'pending_bureau'
  }

  res.json({
    success: true,
    data: alert,
    message: '已升级预警',
  })
})

export default router
