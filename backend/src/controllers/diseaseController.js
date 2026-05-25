const pool = require('../config/database')
const logger = require('../utils/logger')
const aiPredictionService = require('../services/aiPredictionService')

const diseaseController = {
  // Get all diseases
  async getAllDiseases(req, res) {
    try {
      const result = await pool.query(
        'SELECT disease_id, disease_name, symptoms, treatment, prevention FROM shrimp_diseases ORDER BY disease_name'
      )
      res.json({ success: true, data: result.rows })
    } catch (error) {
      logger.error('Error in getAllDiseases:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Get disease detail by ID
  async getDiseaseDetail(req, res) {
    try {
      const { diseaseId } = req.params
      const result = await pool.query(
        'SELECT disease_id, disease_name, symptoms, treatment, prevention FROM shrimp_diseases WHERE disease_id = $1',
        [diseaseId]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Bệnh không tồn tại' })
      }
      res.json({ success: true, data: result.rows[0] })
    } catch (error) {
      logger.error('Error in getDiseaseDetail:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Create new disease
  async createDisease(req, res) {
    try {
      const { disease_name, symptoms, treatment, prevention } = req.body

      // Validate required fields
      if (!disease_name || !symptoms || !treatment || !prevention) {
        return res.status(400).json({
          success: false,
          message: 'Tên bệnh, triệu chứng, cách điều trị và phòng chống là bắt buộc'
        })
      }

      const result = await pool.query(
        'INSERT INTO shrimp_diseases (disease_name, symptoms, treatment, prevention) VALUES ($1, $2, $3, $4) RETURNING disease_id, disease_name, symptoms, treatment, prevention',
        [disease_name, symptoms, treatment, prevention]
      )

      logger.info(`Disease created: ${disease_name}`)
      res.status(201).json({
        success: true,
        message: 'Tạo loại bệnh thành công',
        data: result.rows[0]
      })
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation
        return res.status(400).json({
          success: false,
          message: 'Tên bệnh đã tồn tại'
        })
      }
      logger.error('Error in createDisease:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Update disease
  async updateDisease(req, res) {
    try {
      const { diseaseId } = req.params
      const { disease_name, symptoms, treatment, prevention } = req.body

      // Check if disease exists
      const checkResult = await pool.query(
        'SELECT disease_id FROM shrimp_diseases WHERE disease_id = $1',
        [diseaseId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Bệnh không tồn tại' })
      }

      // Update only provided fields
      const updates = []
      const values = []
      let paramCount = 1

      if (disease_name) {
        updates.push(`disease_name = $${paramCount++}`)
        values.push(disease_name)
      }
      if (symptoms) {
        updates.push(`symptoms = $${paramCount++}`)
        values.push(symptoms)
      }
      if (treatment) {
        updates.push(`treatment = $${paramCount++}`)
        values.push(treatment)
      }
      if (prevention) {
        updates.push(`prevention = $${paramCount++}`)
        values.push(prevention)
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật' })
      }

      values.push(diseaseId)
      const query = `UPDATE shrimp_diseases SET ${updates.join(', ')} WHERE disease_id = $${paramCount} RETURNING disease_id, disease_name, symptoms, treatment, prevention`

      const result = await pool.query(query, values)
      logger.info(`Disease updated: ID ${diseaseId}`)
      res.json({
        success: true,
        message: 'Cập nhật loại bệnh thành công',
        data: result.rows[0]
      })
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Tên bệnh đã tồn tại'
        })
      }
      logger.error('Error in updateDisease:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Delete disease
  async deleteDisease(req, res) {
    try {
      const { diseaseId } = req.params

      // Check if disease exists
      const checkResult = await pool.query(
        'SELECT disease_id FROM shrimp_diseases WHERE disease_id = $1',
        [diseaseId]
      )
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Bệnh không tồn tại' })
      }

      await pool.query('DELETE FROM shrimp_diseases WHERE disease_id = $1', [diseaseId])
      logger.info(`Disease deleted: ID ${diseaseId}`)
      res.json({ success: true, message: 'Xóa loại bệnh thành công' })
    } catch (error) {
      logger.error('Error in deleteDisease:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Upload disease image and get AI predictions
  async uploadDiseaseImage(req, res) {
    try {
      const { seasonId, imageDescription, symptoms } = req.body;
      const userId = req.user.user_id;
      const role = String(req.user.role || '').toUpperCase();

      if (!seasonId || !imageDescription) {
        return res.status(400).json({
          success: false,
          message: 'Season ID và image description là bắt buộc'
        });
      }

      if (role !== 'OWNER') {
        const seasonAccess = await pool.query(
          `SELECT s.season_id
           FROM seasons s
           JOIN ponds p ON p.pond_id = s.pond_id
           WHERE s.season_id = $1 AND p.farm_id = $2`,
          [seasonId, req.user.farm_id]
        );

        if (seasonAccess.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền upload ảnh bệnh cho mùa vụ thuộc trại khác',
          });
        }
      }

      // Save image metadata to database
      const imageResult = await pool.query(
        `INSERT INTO disease_images (season_id, image_description, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING image_id`,
        [seasonId, imageDescription, userId]
      );

      const imageId = imageResult.rows[0].image_id;

      // Use AI service to predict disease
      const predictions = await aiPredictionService.predictDisease(imageDescription, symptoms);

      // Save predictions to database
      const savedPredictions = await aiPredictionService.savePrediction(imageId, predictions);

      res.status(201).json({
        success: true,
        message: 'Hình ảnh uploaded và AI đã phân tích',
        data: {
          image_id: imageId,
          predictions: savedPredictions
        }
      });
    } catch (error) {
      logger.error('Error in uploadDiseaseImage:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get predictions for an image
  async getPredictions(req, res) {
    try {
      const { imageId } = req.params

      const result = await pool.query(
        `SELECT dp.prediction_id, dp.image_id, dp.disease_id, d.disease_name, dp.confidence, dp.predicted_at
         FROM disease_predictions dp
         JOIN shrimp_diseases d ON dp.disease_id = d.disease_id
         WHERE dp.image_id = $1
         ORDER BY dp.confidence DESC`,
        [imageId]
      )

      res.json({ success: true, data: result.rows })
    } catch (error) {
      logger.error('Error in getPredictions:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },

  // Confirm disease result
  async confirmDiseaseResult(req, res) {
    try {
      const { diseaseId } = req.params
      const { imageId } = req.body

      if (!imageId) {
        return res.status(400).json({
          success: false,
          message: 'Image ID là bắt buộc'
        })
      }

      // Check if disease exists
      const diseaseCheck = await pool.query(
        'SELECT disease_id FROM shrimp_diseases WHERE disease_id = $1',
        [diseaseId]
      )
      if (diseaseCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Bệnh không tồn tại' })
      }

      logger.info(`Disease result confirmed: Disease ${diseaseId}, Image ${imageId}`)
      res.json({ success: true, message: 'Xác nhận kết quả bệnh thành công' })
    } catch (error) {
      logger.error('Error in confirmDiseaseResult:', error)
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Get disease history by pond
  async getDiseaseHistory(req, res) {
    try {
      const { pondId } = req.params

      if (String(req.user.role || '').toUpperCase() !== 'OWNER') {
        const pondAccess = await pool.query(
          'SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2',
          [pondId, req.user.farm_id]
        )

        if (pondAccess.rows.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem lịch sử bệnh của ao thuộc trại khác',
          })
        }
      }

      const result = await pool.query(
        `SELECT dp.prediction_id, d.disease_id, d.disease_name, dp.confidence, dp.predicted_at
         FROM disease_predictions dp
         JOIN shrimp_diseases d ON dp.disease_id = d.disease_id
         JOIN uploaded_images ui ON dp.image_id = ui.image_id
         WHERE ui.pond_id = $1
         ORDER BY dp.predicted_at DESC
         LIMIT 50`,
        [pondId]
      )

      res.json({ success: true, data: result.rows })
    } catch (error) {
      logger.error('Error in getDiseaseHistory:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  },
}

module.exports = diseaseController
