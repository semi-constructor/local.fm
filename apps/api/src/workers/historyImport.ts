import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from 'database';
import { parseSpotifyHistory, isSpotifyHistoryFile } from '../utils/spotifyParser';
import { parseAppleMusicHistory, isAppleMusicHistoryFile } from '../utils/appleMusicParser';
import path from 'path';
import * as fs from 'fs/promises';
import AdmZip from 'adm-zip';
import os from 'os';
import { env } from '../env';

const redisConnection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
});

interface HistoryImportData {
    importId: string;
    filePath: string;
    userId: string;
}

async function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    }

    return arrayOfFiles;
}

export const historyImportWorker = new Worker(
    'history-import',
    async (job: Job<HistoryImportData>) => {
        const { importId, filePath, userId } = job.data;
        
        const tempDir = path.join(os.tmpdir(), `localfm-import-${importId}`);
        
        try {
            await prisma.import.update({
                where: { id: importId },
                data: { status: 'PROCESSING' }
            });

            const extension = path.extname(filePath).toLowerCase();
            const allStats = { totalParsed: 0, inserted: 0, skipped: 0 };

            if (extension === '.zip') {
                await fs.mkdir(tempDir, { recursive: true });
                const zip = new AdmZip(filePath);
                zip.extractAllTo(tempDir, true);

                const files = await getAllFiles(tempDir);

                for (const file of files) {
                    const fileName = path.basename(file);
                    if (isSpotifyHistoryFile(fileName)) {
                        const stats = await parseSpotifyHistory(file, userId);
                        allStats.totalParsed += stats.totalParsed;
                        allStats.inserted += stats.inserted;
                        allStats.skipped += stats.skipped;
                    } 
                    else if (isAppleMusicHistoryFile(fileName)) {
                        const stats = await parseAppleMusicHistory(file, userId);
                        allStats.totalParsed += stats.totalParsed;
                        allStats.inserted += stats.inserted;
                        allStats.skipped += stats.skipped;
                    }
                }
            } else if (extension === '.json') {
                const stats = await parseSpotifyHistory(filePath, userId);
                allStats.totalParsed = stats.totalParsed;
                allStats.inserted = stats.inserted;
                allStats.skipped = stats.skipped;
            } else if (extension === '.csv') {
                const stats = await parseAppleMusicHistory(filePath, userId);
                allStats.totalParsed = stats.totalParsed;
                allStats.inserted = stats.inserted;
                allStats.skipped = stats.skipped;
            } else {
                throw new Error('Unsupported file format for history import');
            }
            
            await prisma.import.update({
                where: { id: importId },
                data: { status: 'COMPLETED' }
            });
            
            // Cleanup
            await fs.rm(tempDir, { recursive: true, force: true });
            try {
                if (filePath.includes('uploads')) {
                    await fs.unlink(filePath);
                }
            } catch (e) {}
            
        } catch (error: any) {
            await prisma.import.update({
                where: { id: importId },
                data: { status: 'FAILED' }
            });
            await fs.rm(tempDir, { recursive: true, force: true });
            throw error;
        }
    },
    { connection: redisConnection }
);


historyImportWorker.on('completed', (job) => {
    console.log(`${job.id} has completed!`);
});

historyImportWorker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
});
