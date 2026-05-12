const pool = require('../config/database');
const logger = require('../utils/logger');
const pondService = require('../services/pondService');
const { getSensorProfile, getSensorTypeCode, generateRealtimeSensorValue } = require('../utils/sensorMetrics');

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

  // Get sensors by pond (for Manager, Technician viewing their ponds)
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

      const typeCode = getSensorTypeCode(sensor_type);

      if (!typeCode) {
        return res.status(400).json({
          success: false,
          message: 'Loại cảm biến không hợp lệ. Chọn một trong: pH, nhiệt độ, oxy hoà tan, độ mặn, mực nước.',
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

      let finalSerial = serial_number || null;
      if (!finalSerial) {
        if (pondCode) {
          finalSerial = `${typeCode}-${pondCode}`;
        } else {
          finalSerial = `${typeCode}-${pond_id}`; // fallback if pond_code missing
        }
      }

      const result = await pool.query(`
        INSERT INTO sensors (sensor_id, pond_id, sensor_name, sensor_type, serial_number, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING sensor_id, pond_id, sensor_name, sensor_type, serial_number, status
      `, [newSensorId, pond_id, sensor_name, sensor_type, finalSerial, status || 'ACTIVE']);

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

  // MANAGER: Generate fake realtime readings for sensors in a pond
  async generateFakeRealtimeData(req, res) {
    try {
      const { pond_id, pondId } = req.body;
      const finalPondId = pond_id || pondId;
      const role = String(req.user.role || '').toUpperCase();
      const userId = req.user.user_id;
      const bucketSizeMs = 30000;
      const bucketTimestamp = Math.floor(Date.now() / bucketSizeMs) * bucketSizeMs;
      const bucketStart = new Date(bucketTimestamp);

      if (!finalPondId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ao để tạo dữ liệu giả',
        });
      }

      if (role === 'TECHNICIAN') {
        const assignedPonds = await pondService.getAllPonds(userId, role);
        const hasAccess = assignedPonds.some((pond) => String(pond.pond_id) === String(finalPondId));
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền sinh dữ liệu cho ao này',
          });
        }
      }

      const pondResult = await pool.query(
        'SELECT pond_id, pond_code, pond_name FROM ponds WHERE pond_id = $1',
        [finalPondId]
      );

      if (pondResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Ao nuôi không tồn tại',
        });
      }

      const sensorsResult = await pool.query(
        `
        SELECT sensor_id, sensor_type, sensor_name
        FROM sensors
        WHERE pond_id = $1
        ORDER BY sensor_id ASC
      `,
        [finalPondId]
      );

      if (sensorsResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ao này chưa có cảm biến để sinh dữ liệu giả',
        });
      }

      const sensorIds = sensorsResult.rows.map((sensor) => Number(sensor.sensor_id)).filter((sensorId) => Number.isInteger(sensorId));
      const latestReadingsResult = sensorIds.length > 0
        ? await pool.query(
          `
          SELECT DISTINCT ON (sensor_id) sensor_id, value, recorded_at
          FROM sensor_readings
          WHERE sensor_id = ANY($1::int[])
          ORDER BY sensor_id, recorded_at DESC
        `,
          [sensorIds]
        )
        : { rows: [] };

      const latestReadingMap = new Map(
        latestReadingsResult.rows.map((reading) => [Number(reading.sensor_id), reading])
      );

      const generated = [];

      for (const sensor of sensorsResult.rows) {
        const typeCode = getSensorTypeCode(sensor.sensor_type);
        if (!typeCode) continue;
        const previousReading = latestReadingMap.get(Number(sensor.sensor_id));
        const previousTimestamp = previousReading ? new Date(previousReading.recorded_at).getTime() : 0;

        if (previousTimestamp >= bucketTimestamp) {
          generated.push({
            reading_id: previousReading.reading_id || null,
            sensor_id: sensor.sensor_id,
            value: previousReading.value,
            recorded_at: previousReading.recorded_at,
            sensor_type: getSensorProfile(typeCode)?.label || sensor.sensor_type,
            sensor_name: sensor.sensor_name,
            skipped: true,
          });
          continue;
        }

        const value = generateRealtimeSensorValue(typeCode, previousReading?.value, Number(sensor.sensor_id), bucketTimestamp);

        if (value === null) continue;

        // compute gap-filled reading_id
        const idsRes = await pool.query(`SELECT reading_id FROM sensor_readings ORDER BY reading_id ASC`);
        const existingIds = idsRes.rows.map(r => Number(r.reading_id)).filter(n => Number.isInteger(n) && n > 0);
        let newReadingId = 1;
        if (existingIds.length > 0) {
          const set = new Set(existingIds);
          for (let i = 1; i <= existingIds.length + 1; i++) {
            if (!set.has(i)) {
              newReadingId = i;
              break;
            }
          }
        }

        const inserted = await pool.query(
          `
          INSERT INTO sensor_readings (reading_id, sensor_id, value, recorded_at)
          VALUES ($1, $2, $3, $4)
          RETURNING reading_id, sensor_id, value, recorded_at
        `,
          [newReadingId, sensor.sensor_id, value, bucketStart]
        );

        generated.push({
          ...inserted.rows[0],
          sensor_type: getSensorProfile(typeCode)?.label || sensor.sensor_type,
          sensor_name: sensor.sensor_name,
        });

      }

      // Ensure sequence for reading_id is ahead of max(reading_id) to avoid future collisions
      try {
        const seqNameRes = await pool.query("SELECT pg_get_serial_sequence('sensor_readings','reading_id') AS seq");
        const seqName = seqNameRes.rows[0] && seqNameRes.rows[0].seq;
        if (seqName) {
          await pool.query(
            `SELECT setval($1, (SELECT COALESCE(MAX(reading_id),0) FROM sensor_readings), true)`,
            [seqName]
          );
        }
      } catch (seqErr) {
        logger.warn('Could not update sensor_readings sequence:', seqErr.message || seqErr);
      }

      res.status(201).json({
        success: true,
        message: 'Đã sinh dữ liệu realtime cho cảm biến thành công',
        data: {
          pond: pondResult.rows[0],
          insertedCount: generated.length,
          readings: generated,
        },
      });
    } catch (error) {
      logger.error('Error in generateFakeRealtimeData:', error);
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

      // compute gap-filled reading_id
      const idsRes = await pool.query(`SELECT reading_id FROM sensor_readings ORDER BY reading_id ASC`);
      const existingIds = idsRes.rows.map(r => Number(r.reading_id)).filter(n => Number.isInteger(n) && n > 0);
      let newReadingId = 1;
      if (existingIds.length > 0) {
        const set = new Set(existingIds);
        for (let i = 1; i <= existingIds.length + 1; i++) {
          if (!set.has(i)) {
            newReadingId = i;
            break;
          }
        }
      }

      const result = await pool.query(`
        INSERT INTO sensor_readings (reading_id, sensor_id, value, recorded_at)
        VALUES ($1, $2, $3, $4)
        RETURNING reading_id, sensor_id, value, recorded_at
      `, [newReadingId, sensorId, value, recorded_at || new Date()]);

      // Update sequence to avoid collisions with future default inserts
      try {
        const seqNameRes = await pool.query("SELECT pg_get_serial_sequence('sensor_readings','reading_id') AS seq");
        const seqName = seqNameRes.rows[0] && seqNameRes.rows[0].seq;
        if (seqName) {
          await pool.query(
            `SELECT setval($1, (SELECT COALESCE(MAX(reading_id),0) FROM sensor_readings), true)`,
            [seqName]
          );
        }
      } catch (seqErr) {
        logger.warn('Could not update sensor_readings sequence:', seqErr.message || seqErr);
      }

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
