import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

export const historyImportQueue = new Queue('history-import', { connection: redisConnection });
export const realtimeSyncQueue = new Queue('realtime-sync', { connection: redisConnection });
export const metadataQueue = new Queue('metadata-enrichment', { connection: redisConnection });
