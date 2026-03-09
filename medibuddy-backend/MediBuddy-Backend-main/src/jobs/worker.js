/**
 * Job Queue Worker Entry Point
 * Starts all job processors for background task handling
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Import queue processors (they auto-register their handlers)
import './reminder.scheduler.js';
import './ack.watcher.js';
import './sms.sender.js';
import './pdf.generator.js';

import {
    reminderQueue,
    smsQueue,
    pdfQueue,
    ackWatcherQueue,
    caregiverAlertQueue
} from './queues.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medibuddy';

/**
 * Initialize database connection
 */
async function connectDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        logger.info('MongoDB connected for worker');
    } catch (error) {
        logger.error('MongoDB connection failed:', { error: error.message });
        process.exit(1);
    }
}

/**
 * Setup queue event handlers for monitoring
 */
function setupQueueEvents(queue, name) {
    queue.on('completed', (job) => {
        logger.info(`[${name}] Job ${job.id} completed`);
    });

    queue.on('failed', (job, error) => {
        logger.error(`[${name}] Job ${job.id} failed:`, { error: error.message });
    });

    queue.on('stalled', (job) => {
        logger.warn(`[${name}] Job ${job.id} stalled`);
    });

    queue.on('error', (error) => {
        logger.error(`[${name}] Queue error:`, { error: error.message });
    });
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
    logger.info('Shutting down workers...');

    try {
        await reminderQueue.close();
        await smsQueue.close();
        await pdfQueue.close();
        await ackWatcherQueue.close();
        await caregiverAlertQueue.close();
        await mongoose.connection.close();
        logger.info('Workers shut down gracefully');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', { error: error.message });
        process.exit(1);
    }
}

/**
 * Start the worker
 */
async function startWorker() {
    logger.info('Starting MediBuddy Job Workers...');
    logger.info(`Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);

    await connectDatabase();

    // Setup event handlers for all queues
    setupQueueEvents(reminderQueue, 'Reminder');
    setupQueueEvents(smsQueue, 'SMS');
    setupQueueEvents(pdfQueue, 'PDF');
    setupQueueEvents(ackWatcherQueue, 'AckWatcher');
    setupQueueEvents(caregiverAlertQueue, 'CaregiverAlert');

    logger.info('Active Queues: Reminder, SMS, PDF Generation, Ack Watcher, Caregiver Alert');
    logger.info('Workers ready and listening for jobs...');

    // Handle shutdown signals
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
}

startWorker().catch((error) => {
    logger.error('Failed to start worker:', { error: error.message });
    process.exit(1);
});
