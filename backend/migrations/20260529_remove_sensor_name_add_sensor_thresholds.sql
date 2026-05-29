ALTER TABLE sensors
  DROP COLUMN IF EXISTS sensor_name;

CREATE TABLE IF NOT EXISTS sensor_thresholds (
    threshold_id BIGSERIAL PRIMARY KEY,
    sensor_id BIGINT UNIQUE REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    min_ph NUMERIC(4,2),
    max_ph NUMERIC(4,2),
    min_temp NUMERIC(5,2),
    max_temp NUMERIC(5,2),
    min_salinity NUMERIC(5,2),
    max_salinity NUMERIC(5,2),
    min_oxygen NUMERIC(5,2),
    max_oxygen NUMERIC(5,2),
    min_turbidity NUMERIC(5,2),
    max_turbidity NUMERIC(5,2),
    alert_level VARCHAR(20) DEFAULT 'WARNING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'environment_thresholds'
    ) THEN
      INSERT INTO sensor_thresholds (
        sensor_id,
        min_ph, max_ph,
        min_temp, max_temp,
        min_salinity, max_salinity,
        min_oxygen, max_oxygen,
        min_turbidity, max_turbidity,
        alert_level, notes
      )
      SELECT
        s.sensor_id,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) = 'PH' THEN et.min_ph END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) = 'PH' THEN et.max_ph END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('TEMP', 'TEMPERATURE') THEN et.min_temp END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('TEMP', 'TEMPERATURE') THEN et.max_temp END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('SAL', 'SALINITY') THEN et.min_salinity END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('SAL', 'SALINITY') THEN et.max_salinity END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('DO', 'DISSOLVED OXYGEN') THEN et.min_oxygen END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('DO', 'DISSOLVED OXYGEN') THEN et.max_oxygen END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('TURB', 'TURBIDITY') THEN et.min_turbidity END,
        CASE WHEN UPPER(COALESCE(s.sensor_type, '')) IN ('TURB', 'TURBIDITY') THEN et.max_turbidity END,
        COALESCE(et.alert_level, 'WARNING'),
        et.notes
      FROM sensors s
      JOIN environment_thresholds et ON et.pond_id = s.pond_id
      ON CONFLICT (sensor_id) DO NOTHING;

      DROP TABLE environment_thresholds;
    END IF;
  END $$;
