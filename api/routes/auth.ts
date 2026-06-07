import { Router, type Request, type Response } from 'express'
import { memoryDb } from '../db/memoryDb.js'
import { createToken, verifyToken } from '../middleware/auth.js'
import type { User } from '../../shared/types.js'

const router = Router()

const VALID_PASSWORD = '123456'

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: '用户名和密码不能为空',
    })
    return
  }

  const user = memoryDb.users.find((u) => u.username === username)

  if (!user) {
    res.status(401).json({
      success: false,
      error: '用户不存在',
    })
    return
  }

  if (password !== VALID_PASSWORD) {
    res.status(401).json({
      success: false,
      error: '密码错误',
    })
    return
  }

  const token = createToken(user)

  res.json({
    success: true,
    data: {
      user,
      token,
    },
  })
})

router.get('/me', verifyToken, async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user: User }).user
  res.json({
    success: true,
    data: user,
  })
})

router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: '退出登录成功',
  })
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  res.status(403).json({
    success: false,
    error: '暂不支持注册',
  })
})

export default router
