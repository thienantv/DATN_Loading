const pool = require('../config/database');
const logger = require('../utils/logger');

const sensorController = {
  // ADMIN: Get all sensors
  async getAllSensors(req, res) {
    try {
      const result = await pool.query(`
        SELECT s.sensor_id, s.pond_id, s.sensor_name, s.sensor_type, s.serial_number, s.status,
               p.pond_code, p.pond_name
        FROM sensors s
        LEFT JOIN ponds p ON s.pond_id = p.pond_id
        ORDER BY s.sensor_id DESC
      `);

      const sensors = result.rows.map(sensor => ({
        sensor_id: sensor.sensor_id,
        pond_id: sensor.pond_id,
        sensor_name: sensor.sensor_name,
        sensor_type: sensor.sensor_type,
        serial_number: sensor.serial_number,
        status: sensor.status,
        pond_code: sensor.pond_code,
        pond_name: sensor.pond_name,
      }));

      res.json({ success: true, data: sensors });
    } catch (error) {
      logger.error('Error in getAllSensors:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get sensors by pond (for Manager, Staff viewing their ponds)
  async getSensorsByPondId(req, res) {
    try {
      const { pondId } = req.params;

      const result = await pool.query(`
        SELECT sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
        FROM sensors
        WHERE pond_id = $1
        ORDER BY sensor_id DESC
      `, [pondId]);

      const sensors = result.rows.map(sensor => ({
        sensor_id: sensor.sensor_id,
        pond_id: sensor.pond_id,
        sensor_name: sensor.sensor_name,
        sensor_type: sensor.sensor_type,
        serial_number: sensor.serial_number,
        status: sensor.status,
      }));

      res.json({ success: true, data: sensors });
    } catch (error) {
      logger.error('Error in getSensorsByPondId:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ADMIN: Create sensor
  async createSensor(req, res) {
    try {
      const { pond_id, sensor_name, sensor_type, serial_number, status } = req.body;

      if (!pond_id || !sensor_name || !sensor_type) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin bắt buộc',
        });
      }

      const result = await pool.query(`
        INSERT INTO sensors (pond_id, sensor_name, sensor_type, serial_number, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
      `, [pond_id, sensor_name, sensor_type, serial_number || null, status || 'ACTIVE']);

      res.status(201).json({
        success: true,
        message: 'Tạo cảm biến thành công',
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error in createSensor:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // ADMIN: Update sensor
  async updateSensor(req, res) {
    try {
      const { sensorId } = req.params;
      const { sensor_name, sensor_type, serial_number, status } = req.body;

      const result = await pool.query(`
        UPDATE sensors
        SET sensor_name = COALESCE($1, sensor_name),
            sensor_type = COALESCE($2, sensor_type),
            serial_number = COALESCE($3, serial_number),
            status = COALESCE($4, status)
        WHERE sensor_id = $5
        RETURNING sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
      `, [sensor_name, sensor_type, serial_number, status, sensorId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cảm biến không tồn tại',
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật cảm biến thành công',
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error in updateSensor:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // ADMIN: Delete sensor
  async deleteSensor(req, res) {
    try {
      const { sensorId } = req.params;

      const result = await pool.query(
        'DELETE FROM sensors WHERE sensor_id = $1 RETURNING sensor_id',
        [sensorId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cảm biến không tồn tại',
        });
      }

      res.json({
        success: true,
        message: 'Xóa cảm biến thành công',
      });
    } catch (error) {
      logger.error('Error in deleteSensor:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get sensor readings (for dashboard/monitoring)
  async getSensorReadings(req, res) {
    try {
      const { sensorId } = req.params;
      const limit = req.query.limit || 100;

      const result = await pool.query(`
        SELECT reading_id, sensor_id, value, recorded_at
        FROM sensor_readings
        WHERE sensor_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2
      `, [sensorId, limit]);

      const readings = result.rows.map(r => ({
        reading_id: r.reading_id,
        sensor_id: r.sensor_id,
        value: r.value,
        recorded_at: r.recorded_at,
      }));

      res.json({ success: true, data: readings });
    } catch (error) {
      logger.error('Error in getSensorReadings:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get sensor readings by date range
  async getSensorReadingsByRange(req, res) {
    try {
      const { sensorId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp startDate và endDate',
        });
      }

      const result = await pool.query(`
        SELECT reading_id, sensor_id, value, recorded_at
        FROM sensor_readings
        WHERE sensor_id = $1
          AND recorded_at >= $2
          AND recorded_at <= $3
        ORDER BY recorded_at ASC
      `, [sensorId, startDate, endDate]);

      const readings = result.rows.map(r => ({
        reading_id: r.reading_id,
        sensor_id: r.sensor_id,
        value: r.value,
        recorded_at: r.recorded_at,
      }));

      res.json({ success: true, data: readings });
    } catch (error) {
      logger.error('Error in getSensorReadingsByRange:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Create sensor reading (simulator or manual entry)
  async createSensorReading(req, res) {
    try {
      const { sensorId } = req.params;
      const { value, recorded_at } = req.body;

      if (!value || value < 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá trị cảm biến không hợp lệ',
        });
      }

      const result = await pool.query(`
        INSERT INTO sensor_readings (sensor_id, value, recorded_at)
        VALUES ($1, $2, $3)
        RETURNING reading_id, sensor_id, value, recorded_at
      `, [sensorId, value, recorded_at || new Date()]);

      res.status(201).json({
        success: true,
        message: 'Tạo dữ liệu cảm biến thành công',
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error in createSensorReading:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

module.exports = sensorController;
