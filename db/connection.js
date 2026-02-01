const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(config);

// Handle pool events
pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Database connection error:', err);
  process.exit(-1);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection test failed:', err);
  } else {
    logger.info('Database connection test successful:', res.rows[0]);
  }
});

// Function to execute queries with automatic connection management
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Function to execute queries within a transaction
const transaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Function to set RLS context (current user ID and role)
const setRLSContext = async (client, userId, userRole) => {
  await client.query(`SET LOCAL rls.current_user_id = '${userId}'`);
  await client.query(`SET LOCAL rls.current_user_role = '${userRole}'`);
};

// Function to get a client with RLS context set
const getClientWithRLS = async (userId, userRole) => {
  const client = await pool.connect();
  await setRLSContext(client, userId, userRole);
  return client;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connection pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connection pool...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  pool,
  query,
  transaction,
  setRLSContext,
  getClientWithRLS
};