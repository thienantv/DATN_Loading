#!/usr/bin/env node
/**
 * Safe utility to ensure primary key integer columns have sequences/defaults
 * and optionally backfill NULL values. Default is dry-run (no changes).
 *
 * Usage:
 *   node scripts/fix_table_ids.js          # dry-run, report
 *   node scripts/fix_table_ids.js --apply  # create sequences/alter defaults
 *   node scripts/fix_table_ids.js --apply --fill-null  # also fill NULL ids
 *
 * NOTE: This script will NOT reassign existing PK values or create placeholder
 * rows for gaps. Repairing gaps or changing existing PKs is dangerous and must
 * be done manually with a DB backup.
 */

const pool = require('../src/config/database')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const FILL_NULL = args.includes('--fill-null')

function quoteIdent(identifier) {
  return '"' + String(identifier).replace(/"/g, '""') + '"'
}

async function getTables() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
  return res.rows.map(r => r.table_name)
}

async function getPrimaryKey(table) {
  const sql = `SELECT kcu.column_name, c.data_type
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.columns c
      ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name AND c.table_schema = kcu.table_schema
    WHERE tc.constraint_type='PRIMARY KEY' AND tc.table_schema='public' AND tc.table_name=$1`;
  const res = await pool.query(sql, [table])
  return res.rows[0]
}

async function getColumnDefault(table, column) {
  const res = await pool.query(`SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`, [table, column])
  return res.rows[0] && res.rows[0].column_default
}

async function getMaxId(table, column) {
  const res = await pool.query(`SELECT COALESCE(MAX(${column}), 0) AS max_id FROM ${table}`)
  return Number(res.rows[0].max_id || 0)
}

async function countNullIds(table, column) {
  const res = await pool.query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE ${column} IS NULL`)
  return Number(res.rows[0].cnt || 0)
}

async function reportGaps(table, column, maxId, limit = 100) {
  if (maxId <= 1) return { missingCount: 0, sample: [] }
  const gapCountRes = await pool.query(
    `WITH seq AS (SELECT generate_series(1, $1) AS id)
     SELECT COUNT(*) FROM seq LEFT JOIN ${table} t ON t.${column} = seq.id WHERE t.${column} IS NULL`,
    [maxId]
  )
  const missingCount = Number(gapCountRes.rows[0].count || 0)
  const sampleRes = await pool.query(
    `WITH seq AS (SELECT generate_series(1, $1) AS id)
     SELECT seq.id FROM seq LEFT JOIN ${table} t ON t.${column} = seq.id WHERE t.${column} IS NULL LIMIT $2`,
    [maxId, limit]
  )
  const sample = sampleRes.rows.map(r => r.id)
  return { missingCount, sample }
}

async function ensureSequence(table, column, maxId) {
  const seqName = `${table}_${column}_seq`
  const checkSeqSql = `SELECT 1 FROM pg_class WHERE relkind='S' AND relname=$1`;
  const seqExists = (await pool.query(checkSeqSql, [seqName])).rowCount > 0
  if (seqExists) {
    console.log(`  - sequence exists: ${seqName}`)
    return seqName
  }

  const start = maxId + 1
  console.log(`  - will create sequence ${seqName} START WITH ${start}`)
  if (APPLY) {
    const quotedSeqName = quoteIdent(seqName)
    const quotedTable = quoteIdent(table)
    const quotedColumn = quoteIdent(column)
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS ${quotedSeqName} START WITH ${start}`)
    await pool.query(`ALTER SEQUENCE ${quotedSeqName} OWNED BY ${quotedTable}.${quotedColumn}`)
    console.log(`    -> created`)
  }
  return seqName
}

async function setDefaultNextval(table, column, seqName) {
  const colDef = await getColumnDefault(table, column)
  if (colDef && colDef.toString().toLowerCase().includes('nextval')) {
    console.log(`  - column ${column} already has nextval default: ${colDef}`)
    return
  }
  console.log(`  - will ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT nextval('${seqName}'::regclass)`)
  if (APPLY) {
    await pool.query(`ALTER TABLE ${table} ALTER COLUMN ${column} SET DEFAULT nextval('${seqName}'::regclass)`)
    console.log('    -> default set')
  }
}

async function fillNullIds(table, column, seqName) {
  const nullCount = await countNullIds(table, column)
  if (nullCount === 0) {
    console.log('  - no NULL ids to fill')
    return 0
  }
  console.log(`  - will assign ids for ${nullCount} rows with NULL ${column}`)
  if (APPLY && FILL_NULL) {
    // Do updates in a transaction
    await pool.query('BEGIN')
    try {
      const res = await pool.query(`UPDATE ${table} SET ${column} = nextval('${seqName}'::regclass) WHERE ${column} IS NULL RETURNING ${column}`)
      await pool.query('COMMIT')
      console.log(`    -> filled ${res.rowCount} rows`)
      return res.rowCount
    } catch (err) {
      await pool.query('ROLLBACK')
      throw err
    }
  }
  return nullCount
}

async function processTable(table) {
  console.log(`Table: ${table}`)
  const pk = await getPrimaryKey(table)
  if (!pk) {
    console.log('  - no primary key detected, skipping')
    return
  }
  const { column_name: col, data_type: type } = pk
  console.log(`  - primary key: ${col} (${type})`)
  if (!['integer','bigint','smallint'].includes(type)) {
    console.log('  - primary key is not integer type, skipping')
    return
  }

  const colDef = await getColumnDefault(table, col)
  const maxId = await getMaxId(table, col)
  console.log(`  - current max ${col}: ${maxId}`)

  const { missingCount, sample } = await reportGaps(table, col, maxId)
  console.log(`  - missing ids between 1..${maxId}: ${missingCount}`)
  if (missingCount > 0) console.log(`    sample missing ids: ${sample.join(', ')}`)

  // Ensure sequence exists
  const seqName = `${table}_${col}_seq`
  await ensureSequence(table, col, maxId)

  // Set default nextval if missing
  await setDefaultNextval(table, col, seqName)

  // Optionally fill NULLs
  if (FILL_NULL) {
    await fillNullIds(table, col, seqName)
  }
}

async function main() {
  console.log('fix_table_ids: dry-run by default. Use --apply to make changes. Use --fill-null with --apply to fill NULL ids.')
  console.log(`Options: APPLY=${APPLY} FILL_NULL=${FILL_NULL}`)

  try {
    const tables = await getTables()
    console.log(`Found ${tables.length} tables`)
    for (const t of tables) {
      try {
        await processTable(t)
      } catch (err) {
        console.error(`Error processing ${t}:`, err.message)
      }
      console.log('')
    }
  } catch (err) {
    console.error('Fatal error:', err)
  } finally {
    await pool.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
