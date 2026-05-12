const pondService = require('../services/pondService')
const auditLogService = require('../services/auditLogService')
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

      // WORKER chỉ xem ao được giao
      if (req.user.role === 'WORKER' && pond.assigned_staff !== req.user.user_id) {
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
      // Support both camelCase and snake_case field names
      const {
        pond_code, pondCode,
        pond_name, pondName,
        area_m2, areaMeter,
        depth_m, depthMeter,
        max_density, maxDensity,
        assigned_staff, assignedStaff
      } = req.body

      const finalPondCode = pond_code || pondCode
      const finalPondName = pond_name || pondName
      const finalAreaMeter = area_m2 || areaMeter
      const finalDepthMeter = depth_m || depthMeter
      const finalMaxDensity = max_density || maxDensity
      const finalAssignedStaff = assigned_staff || assignedStaff

      // If assignedStaff provided, validate user exists and is WORKER
      if (finalAssignedStaff) {
        const userService = require('../services/userService')
        const user = await userService.getUserById(finalAssignedStaff)
        if (!user) return res.status(400).json({ success: false, message: 'Người phụ trách không tồn tại' })
        if (user.role !== 'WORKER') return res.status(403).json({ success: false, message: 'Người phụ trách phải là Nhân viên (WORKER)' })
      }

      const pond = await pondService.createPond(finalPondCode || null, finalPondName, finalAreaMeter, finalDepthMeter, finalMaxDensity, finalAssignedStaff || null)
      
      // Log pond creation with explicit pond_id capture
      await auditLogService.logActivity(
        req.user.user_id,
        'CREATE',
        'POND',
        pond.pond_id,
        {
          pondCode: finalPondCode || null,
          pondName: finalPondName,
          areaMeter: finalAreaMeter,
          depthMeter: finalDepthMeter,
          maxDensity: finalMaxDensity,
          assignedStaff: finalAssignedStaff || null
        },
        auditLogService.resolveEntityLabel('POND')
      );

      res.status(201).json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in createPond:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async updatePond(req, res) {
    try {
      // Support both camelCase and snake_case
      const assignedStaff = req.body.assigned_staff || req.body.assignedStaff

      if (assignedStaff) {
        const userService = require('../services/userService')
        const user = await userService.getUserById(assignedStaff)
        if (!user) return res.status(400).json({ success: false, message: 'Người phụ trách không tồn tại' })
        if (user.role !== 'WORKER') return res.status(403).json({ success: false, message: 'Người phụ trách phải là Nhân viên (WORKER)' })
      }

      const pond = await pondService.updatePond(req.params.pondId, req.body)
      
      // Log pond update
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'POND',
        req.params.pondId,
        req.body,
        auditLogService.resolveEntityLabel('POND')
      );

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
      
      // Log pond status update
      await auditLogService.logActivity(
        req.user.user_id,
        'UPDATE',
        'POND',
        req.params.pondId,
        { action: 'Cập nhật trạng thái ao', status },
        auditLogService.resolveEntityLabel('POND')
      );

      res.json({ success: true, data: pond })
    } catch (error) {
      logger.error('Error in updatePondStatus:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  async deletePond(req, res) {
    try {
      const result = await pondService.deletePond(req.params.pondId)
      
      // Log pond deletion
      await auditLogService.logActivity(
        req.user.user_id,
        'DELETE',
        'POND',
        req.params.pondId,
        { action: 'Xóa ao' },
        auditLogService.resolveEntityLabel('POND')
      );

      res.json(result)
    } catch (error) {
      logger.error('Error in deletePond:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },
}

module.exports = pondController
