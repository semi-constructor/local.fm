import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from 'database';
import { getValidSpotifyToken } from '../services/spotifyAuth';
import { enrichArtistMetadata, findSpotifyIdByName } from '../services/metadata';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

interface MetadataJobData {
    artistId: string;
    spotifyId?: string;
    artistName?: string;
    userId: string;
}

export const metadataWorker = new Worker(
    'metadata-enrichment',
    async (job: Job<MetadataJobData>) => {
        const { artistId, spotifyId, artistName, userId } = job.data;

        const accessToken = await getValidSpotifyToken(userId);
        if (!accessToken) return;

        if (spotifyId) {
            await enrichArtistMetadata(artistId, spotifyId, accessToken);
        } else if (artistName) {
            const found = await findSpotifyIdByName(artistName, accessToken);
            if (found) {
                await prisma.artist.update({
                    where: { id: artistId },
                    data: {
                        spotifyId: found.spotifyId,
                        genres: found.genres,
                        imageUrl: found.imageUrl
                    }
                });
            }
        }
    },
    { 
        connection: redisConnection,
        limiter: {
            max: 5, // Slower for search
            duration: 1000
        }
    }
);
