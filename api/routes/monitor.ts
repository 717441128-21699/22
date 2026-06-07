import { Router, type Request, type Response } from 'express'
import { generateWasteBins, generateVehicles, generatePlants } from '../../shared/mockData.js'

const router = Router()

router.get('/bins', async (req: Request, res: Response): Promise<void> => {
  const regionCode = (req.query.regionCode as string) || '000000'
  const status = req.query.status as string

  let bins = generateWasteBins(regionCode)
  if (status) {
    bins = bins.filter((b) => b.status === status)
  }

  res.json({
    success: true,
    data: bins,
  })
})

router.get('/vehicles', async (req: Request, res: Response): Promise<void> => {
  const regionCode = (req.query.regionCode as string) || '000000'
  const status = req.query.status as string

  let vehicles = generateVehicles(regionCode)
  if (status) {
    vehicles = vehicles.filter((v) => v.status === status)
  }

  res.json({
    success: true,
    data: vehicles,
  })
})

router.get('/plants', async (req: Request, res: Response): Promise<void> => {
  const regionCode = (req.query.regionCode as string) || '000000'

  const plants = generatePlants(regionCode)

  res.json({
    success: true,
    data: plants,
  })
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const regionCode = (req.query.regionCode as string) || '000000'

  const bins = generateWasteBins(regionCode)
  const vehicles = generateVehicles(regionCode)
  const plants = generatePlants(regionCode)

  res.json({
    success: true,
    data: {
      bins,
      vehicles,
      plants,
      summary: {
        binsTotal: bins.length,
        binsNormal: bins.filter((b) => b.status === 'normal').length,
        binsFull: bins.filter((b) => b.status === 'full' || b.status === 'overflow').length,
        binsOffline: bins.filter((b) => b.status === 'offline').length,
        vehiclesTotal: vehicles.length,
        vehiclesActive: vehicles.filter((v) => v.status !== 'idle').length,
        plantsTotal: plants.length,
        plantsAvgLoad: plants.length > 0 ? +(plants.reduce((a, p) => a + p.currentLoad / p.dailyCapacity, 0) / plants.length * 100).toFixed(1) : 0,
      },
    },
  })
})

export default router
