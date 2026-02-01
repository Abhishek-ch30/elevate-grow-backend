const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');
const logger = require('../utils/logger');

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database initialization...');
    
    // Create tables
    logger.info('Creating tables...');
    const createTablesSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(createTablesSQL);
    
    // Apply RLS policies
    logger.info('Applying RLS policies...');
    const rlsFiles = [
      'users.sql',
      'training_programs.sql', 
      'enrollments.sql',
      'payments.sql',
      'certificates.sql',
      'certificate_templates.sql',
      'admin_activity_logs.sql'
    ];
    
    for (const file of rlsFiles) {
      const rlsSQL = fs.readFileSync(path.join(__dirname, 'rls', file), 'utf8');
      await client.query(rlsSQL);
      logger.info(`Applied RLS policies from ${file}`);
    }
    
    logger.info('Database initialization completed successfully');
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      logger.info('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };