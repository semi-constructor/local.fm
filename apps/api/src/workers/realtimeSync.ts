import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from 'database';
import axios from 'axios';
import { getValidSpotifyToken } from '../services/spotifyAuth';
import { metadataQueue } from '../lib/queue';
import { env } from '../env';

const redisConnection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
});

interface RealtimeSyncData {
    userId: string;
}

async function syncSpotify(userId: string) {
    const accessToken = await getValidSpotifyToken(userId);
    if (!accessToken) return;

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const items = response.data.items;
        if (!items || items.length === 0) return;

        // Process in a single pass to collect all entities
        for (const item of items) {
            const trackData = item.track;
            const playedAt = new Date(item.played_at);

            // 1. Check for existing stream (fast check)
            const existing = await prisma.stream.findUnique({
                where: {
                    userId_trackId_playedAt: {
                        userId,
                        trackId: (await prisma.track.findUnique({ where: { spotifyId: trackData.id }, select: { id: true } }))?.id || '',
                        playedAt
                    }
                }
            });
            if (existing) continue;

            // 2. Ensure Artist
            const artist = await prisma.artist.upsert({
                where: { spotifyId: trackData.artists[0].id },
                update: {
                    imageUrl: trackData.artists[0].images?.[0]?.url
                },
                create: { 
                    spotifyId: trackData.artists[0].id, 
                    name: trackData.artists[0].name,
                    imageUrl: trackData.artists[0].images?.[0]?.url
                }
            });

            if (artist.genres.length === 0) {
                await metadataQueue.add('enrich-artist', { 
                    artistId: artist.id, 
                    spotifyId: artist.spotifyId, 
                    userId 
                });
            }

            // 3. Ensure Album
            const album = await prisma.album.upsert({
                where: { spotifyId: trackData.album.id },
                update: {
                    imageUrl: trackData.album.images?.[0]?.url
                },
                create: { 
                    spotifyId: trackData.album.id, 
                    name: trackData.album.name, 
                    artistId: artist.id,
                    imageUrl: trackData.album.images?.[0]?.url
                }
            });

            // 4. Ensure Track
            const track = await prisma.track.upsert({
                where: { spotifyId: trackData.id },
                update: {},
                create: { 
                    spotifyId: trackData.id, 
                    name: trackData.name, 
                    duration: trackData.duration_ms, 
                    artistId: artist.id, 
                    albumId: album.id 
                }
            });

            // 5. Create Stream
            await prisma.stream.upsert({
                where: {
                    userId_trackId_playedAt: {
                        userId,
                        trackId: track.id,
                        playedAt
                    }
                },
                update: {},
                create: { 
                    userId, 
                    trackId: track.id, 
                    playedAt, 
                    duration: trackData.duration_ms 
                }
            });
        }
    } catch (error: any) {
        console.error(`Spotify sync failed for user ${userId}:`, error.message);
    }
}

export const realtimeSyncWorker = new Worker(
    'realtime-sync',
    async (job: Job<any>) => {
        if (job.name === 'global-sync-trigger') {
            const users = await prisma.user.findMany({
                where: { accounts: { some: { providerId: 'spotify' } } },
                select: { id: true }
            });
            
            // Re-importing queue here for background job scope
            const { realtimeSyncQueue } = await import('../lib/queue');
            for (const user of users) {
                await realtimeSyncQueue.add('user-sync', { userId: user.id });
            }
        } else if (job.name === 'user-sync') {
            const { userId } = job.data;
            await syncSpotify(userId);
        }
    },
    { connection: redisConnection }
);

