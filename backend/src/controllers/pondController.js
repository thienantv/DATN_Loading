const pondService = require('../services/pondService')
const logger = require('../utils/logger')

const pondController = {
  async getAllPonds(req, res) {
    try {
      const ponds = await pondService.getAllPonds(req.user.user_id, req.user.role)
      res.json({ success: true, data: ponds })
    } catch (error) {
      logger.error('Error in getAllPonds:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async getPondDetail(req, res) {
    try {
      const pond = await pondService.getPondById(req.params.pondId)
      if (!pond) return res.status(404).json({ success: false, message: 'Ao không tồn tại' })

      // STAFF chỉ xem ao được giao
      if (req.user.role === 'STAFF' && pond.assigned_staff !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem ao này' })
      }

      res.json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in getPondDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  async createPond(req, res) {
    try {
      const { pondCode, pondName, areaMeter, depthMeter, maxDensity } = req.body
      const pond = await pondService.createPond(pondCode || null, pondName, areaMeter, depthMeter, maxDensity)
      res.status(201).json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in createPond:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updatePond(req, res) {
    try {
      const pond = await pondService.updatePond(req.params.pondId, req.body)
      res.json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in updatePond:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updatePondStatus(req, res) {
    try {
      const { status } = req.body
      const pond = await pondService.updatePondStatus(req.params.pondId, status)
      res.json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in updatePondStatus:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deletePond(req, res) {
    try {
      const result = await pondService.deletePond(req.params.pondId)
      res.json(result)
    } catch (error) {
      logger.error('Error in deletePond:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = pondController
