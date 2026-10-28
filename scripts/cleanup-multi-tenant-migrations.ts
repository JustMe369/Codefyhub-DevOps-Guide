import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const pool = new Pool({ connectionString });

  try {
    // Check current state
    console.log('=== Current state ===');
    const beforeResult = await pool.query(
      `SELECT id, migration_name, finished_at, applied_steps_count, logs IS NOT NULL as has_logs, started_at 
       FROM "_prisma_migrations" 
       WHERE migration_name LIKE '%multi_tenant_foundation%' 
       ORDER BY started_at`
    );
    
    console.table(beforeResult.rows);

    // Identify rows to delete (failed/empty finished_at)
    const toDeleteResult = await pool.query(
      `SELECT id, migration_name, finished_at, applied_steps_count 
       FROM "_prisma_migrations" 
       WHERE migration_name LIKE '%multi_tenant_foundation%' 
       AND (finished_at IS NULL OR applied_steps_count = 0)`
    );

    console.log(`\n=== Rows to delete (${toDeleteResult.rowCount}) ===`);
    console.table(toDeleteResult.rows);

    if (toDeleteResult.rowCount && toDeleteResult.rowCount > 0) {
      const idsToDelete = toDeleteResult.rows.map(r => r.id);
      const deleteResult = await pool.query(
        `DELETE FROM "_prisma_migrations" WHERE id = ANY($1::text[])`,
        [idsToDelete]
      );
      console.log(`\nDeleted ${deleteResult.rowCount} rows`);
    } else {
      console.log('\nNo rows to delete');
    }

    // Check final state
    console.log('\n=== Final state ===');
    const afterResult = await pool.query(
      `SELECT id, migration_name, finished_at, applied_steps_count, started_at 
       FROM "_prisma_migrations" 
       WHERE migration_name LIKE '%multi_tenant_foundation%' 
       ORDER BY started_at`
    );
    console.table(afterResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
