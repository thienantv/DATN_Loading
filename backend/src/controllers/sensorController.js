const pool = require('../config/database');
const logger = require('../utils/logger');
const { getSensorTypeCode } = require('../utils/sensorMetrics');

const isAdminRole = (role) => {
  const r = String(role || '').toUpperCase()
  return r === 'OWNER'
};

const ensurePondFarmAccess = async (req, res, pondId) => {
  if (isAdminRole(req.user.role)) {
    return true;
  }

  const result = await pool.query(
    'SELECT pond_id FROM ponds WHERE pond_id = $1 AND farm_id = $2',
    [pondId, req.user.farm_id]
  );

  if (result.rows.length === 0) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập dữ liệu ao thuộc trại khác',
    });
    return false;
  }

  return true;
};

const ensureSensorFarmAccess = async (req, res, sensorId) => {
  if (isAdminRole(req.user.role)) {
    return true;
  }

  const result = await pool.query(
    `SELECT s.sensor_id
     FROM sensors s
     JOIN ponds p ON p.pond_id = s.pond_id
     WHERE s.sensor_id = $1 AND p.farm_id = $2`,
    [sensorId, req.user.farm_id]
  );

  if (result.rows.length === 0) {
    res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập cảm biến thuộc trại khác',
    });
    return false;
  }

  return true;
};

const sensorController = {
  // ADMIN: Get all sensors
  async getAllSensors(req, res) {
    try {
      const normalizedRole = String(req.user.role || '').toUpperCase();
      const params = [];
      let farmClause = '';
      if (normalizedRole !== 'OWNER') {
        farmClause = ' WHERE p.farm_id = $1';
        params.push(req.user.farm_id);
      }

      const result = await pool.query(`
        SELECT s.sensor_id, s.pond_id, s.sensor_name, s.sensor_type, s.serial_number, s.status,
               p.pond_code, p.pond_name,
               lr.value AS current_value,
               lr.recorded_at AS last_updated
        FROM sensors s
        LEFT JOIN ponds p ON s.pond_id = p.pond_id
        LEFT JOIN LATERAL (
          SELECT sr.value, sr.recorded_at
          FROM sensor_readings sr
          WHERE sr.sensor_id = s.sensor_id
          ORDER BY sr.recorded_at DESC
          LIMIT 1
        ) lr ON TRUE
        ${farmClause}
        ORDER BY s.sensor_id DESC
      `, params);

      const sensors = result.rows.map(sensor => ({
        sensor_id: sensor.sensor_id,
        pond_id: sensor.pond_id,
        sensor_name: sensor.sensor_name,
        sensor_type: sensor.sensor_type,
        serial_number: sensor.serial_number,
        status: sensor.status,
        pond_code: sensor.pond_code,
        pond_name: sensor.pond_name,
        current_value: sensor.current_value,
        last_updated: sensor.last_updated,
      }));

      res.json({ success: true, data: sensors });
    } catch (error) {
      logger.error('Error in getAllSensors:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Lấy cảm biến theo ao (cho quản lý và kỹ thuật viên xem ao của mình)
  async getSensorsByPondId(req, res) {
    try {
      const { pondId } = req.params;

      const hasAccess = await ensurePondFarmAccess(req, res, pondId);
      if (!hasAccess) return;

      const result = await pool.query(`
        SELECT s.sensor_id, s.pond_id, s.sensor_name, s.sensor_type, s.serial_number, s.status,
               lr.value AS current_value,
               lr.recorded_at AS last_updated
        FROM sensors s
        LEFT JOIN LATERAL (
          SELECT sr.value, sr.recorded_at
          FROM sensor_readings sr
          WHERE sr.sensor_id = s.sensor_id
          ORDER BY sr.recorded_at DESC
          LIMIT 1
        ) lr ON TRUE
        WHERE s.pond_id = $1
        ORDER BY s.sensor_id DESC
      `, [pondId]);

      const sensors = result.rows.map(sensor => ({
        sensor_id: sensor.sensor_id,
        pond_id: sensor.pond_id,
        sensor_name: sensor.sensor_name,
        sensor_type: sensor.sensor_type,
        serial_number: sensor.serial_number,
        status: sensor.status,
        current_value: sensor.current_value,
        last_updated: sensor.last_updated,
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

      const hasAccess = await ensurePondFarmAccess(req, res, pond_id);
      if (!hasAccess) return;

      const typeCode = getSensorTypeCode(sensor_type);

      if (!typeCode) {
        return res.status(400).json({
          success: false,
          message: 'Loại cảm biến không hợp lệ. Chọn một trong: pH, nhiệt độ, oxy hoà tan, độ mặn, mực nước.',
        });
      }

      const normalizedStatus = String(status || 'ACTIVE').trim().toUpperCase();
      if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái cảm biến không hợp lệ',
        });
      }

      // --- compute gap-filled sensor_id ---
      const idsRes = await pool.query(`SELECT sensor_id FROM sensors ORDER BY sensor_id ASC`);
      const existingIds = idsRes.rows.map(r => Number(r.sensor_id)).filter(n => Number.isInteger(n) && n > 0);
      let newSensorId = 1;
      if (existingIds.length > 0) {
        // find smallest missing positive integer
        const set = new Set(existingIds);
        for (let i = 1; i <= existingIds.length + 1; i++) {
          if (!set.has(i)) {
            newSensorId = i;
            break;
          }
        }
      }

      // --- get pond_code for serial generation ---
      const pondRes = await pool.query(`SELECT pond_code FROM ponds WHERE pond_id = $1`, [pond_id]);
      const pondCode = pondRes.rows.length > 0 ? pondRes.rows[0].pond_code : null;

      const finalSerial = pondCode ? `${typeCode}-${pondCode}` : `${typeCode}-${pond_id}`;

      const result = await pool.query(`
        INSERT INTO sensors (sensor_id, pond_id, sensor_name, sensor_type, serial_number, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
      `, [newSensorId, pond_id, sensor_name, sensor_type, finalSerial, normalizedStatus]);

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
      const { sensor_name, pond_id, status } = req.body;

      const hasAccess = await ensureSensorFarmAccess(req, res, sensorId);
      if (!hasAccess) return;

      if (pond_id) {
        const hasPondAccess = await ensurePondFarmAccess(req, res, pond_id);
        if (!hasPondAccess) return;
      }

      const normalizedStatus = status ? String(status).trim().toUpperCase() : null;
      if (normalizedStatus && !['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái cảm biến không hợp lệ',
        });
      }

      const result = await pool.query(`
        UPDATE sensors
        SET sensor_name = COALESCE($1, sensor_name),
            pond_id = COALESCE($2, pond_id),
            status = COALESCE($3, status)
        WHERE sensor_id = $4
        RETURNING sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
      `, [sensor_name, pond_id || null, normalizedStatus, sensorId]);

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

      const hasAccess = await ensureSensorFarmAccess(req, res, sensorId);
      if (!hasAccess) return;

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

      const hasAccess = await ensureSensorFarmAccess(req, res, sensorId);
      if (!hasAccess) return;

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

};

module.exports = sensorController;
