const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
});

const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('✅ Prisma connected to PostgreSQL');
    } catch (error) {
        logger.error('❌ Prisma connection error:', error);
        process.exit(1);
    }
};

const gracefulShutdown = async () => {
    await prisma.$disconnect();
    logger.info('✅ Prisma disconnected');
};

module.exports = {
    prisma,
    connectDB,
    gracefulShutdown
};
