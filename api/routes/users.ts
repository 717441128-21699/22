import { Router, type Request, type Response } from 'express'
import { MOCK_USERS } from '../../shared/mockData.js'
import type { User, UserRole } from '../../shared/types.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const role = req.query.role as string
  const regionCode = req.query.regionCode as string

  let users: User[] = MOCK_USERS.filter((u) => u.role === 'national' || u.role === 'provincial')

  if (role) {
    const validRoles: UserRole[] = ['national', 'provincial', 'municipal', 'regional']
    if (validRoles.includes(role as UserRole)) {
      users = MOCK_USERS.filter((u) => u.role === role)
    }
  }

  if (regionCode) {
    users = users.filter((u) => u.regionCode.startsWith(regionCode.slice(0, 2)) || u.regionCode === '000000')
  }

  res.json({
    success: true,
    data: users,
  })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = MOCK_USERS.find((u) => u.id === req.params.id)

  if (!user) {
    res.status(404).json({
      success: false,
      error: '用户不存在',
    })
    return
  }

  res.json({
    success: true,
    data: user,
  })
})

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const defaultUser = MOCK_USERS[0]
  res.json({
    success: true,
    data: defaultUser,
  })
})

export default router
