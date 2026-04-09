import { Router, Request, Response } from 'express';
import { prisma } from 'database';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, differenceInDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import axios from 'axios';
import { getValidSpotifyToken } from '../services/spotifyAuth';
import { AuthenticatedRequest } from '../types';
import { auth } from '../auth';
import { NextFunction } from 'express';

const router = Router();

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: new Headers(req.headers as any) });
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    (req as AuthenticatedRequest).user = session.user as any;
    next();
};

type Timeframe = 'lifetime' | 'year' | 'month' | 'week' | 'day';

const getTimeRange = (timeframe: Timeframe, timezone: string = 'UTC') => {
    const now = toZonedTime(new Date(), timezone);

    switch (timeframe) {
        case 'day': return { start: startOfDay(now) };
        case 'week': return { start: startOfWeek(now) };
        case 'month': return { start: startOfMonth(now) };
        case 'year': return { start: startOfYear(now) };
        default: return { start: new Date(0) }; // Lifetime
    }
};

const getDaysInTimeframe = (timeframe: Timeframe, userCreatedAt: Date, timezone: string = 'UTC') => {
    const now = toZonedTime(new Date(), timezone);
    switch (timeframe) {
        case 'day': return 1;
        case 'week': return 7;
        case 'month': return 30;
        case 'year': return 365;
        default: return Math.max(1, differenceInDays(now, userCreatedAt));
    }
};

router.get('/currently-playing', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const token = await getValidSpotifyToken(userId);

    if (!token) return res.json({ isPlaying: false });

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 204 || !response.data) return res.json({ isPlaying: false });

        const { item, progress_ms, is_playing, currently_playing_type } = response.data;
        
        if (!item || currently_playing_type !== 'track') {
            return res.json({ 
                isPlaying: is_playing,
                type: currently_playing_type,
                message: currently_playing_type === 'ad' ? 'Ad is playing' : 'Non-track item is playing'
            });
        }

        res.json({
            isPlaying: is_playing,
            progressMs: progress_ms,
            durationMs: item.duration_ms,
            track: {
                id: item.id,
                name: item.name,
                album: { 
                    name: item.album?.name || 'Unknown Album', 
                    imageUrl: item.album?.images?.[0]?.url 
                },
                artists: item.artists?.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })) || []
            }
        });
    } catch (error) {
        res.json({ isPlaying: false });
    }
});

router.get('/summary', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const timezone = (authReq.query.timezone as string) || 'UTC';
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe, timezone);

    try {
        const stats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: bigint; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${userId} AND "playedAt" >= ${start}
        `;

        const artistStats = await prisma.$queryRaw<[{ distinctArtists: bigint }]>`
            SELECT COUNT(DISTINCT "Track"."artistId") as "distinctArtists"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" >= ${start}
        `;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        let percentOfLife = null;
        const listenMs = Number(stats[0].totalDurationMs);
        if ((user as any)?.birthday && timeframe === 'lifetime') {
            const ageInMs = new Date().getTime() - new Date((user as any).birthday).getTime();
            percentOfLife = (listenMs / ageInMs) * 100;
        }

        res.json({
            totalDurationMs: listenMs,
            totalStreams: Number(stats[0].totalStreams),
            distinctSongs: Number(stats[0].distinctSongs),
            distinctArtists: Number(artistStats[0].distinctArtists),
            percentOfLife,
            timeframe
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});


router.get('/habits', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe);

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const streams = await prisma.stream.findMany({
            where: { userId, playedAt: { gte: start } },
            select: { playedAt: true, duration: true }
        });

        // Hourly: 0-23
        const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, streams: 0, minutes: 0 }));
        // Weekday: 0 (Sun) - 6 (Sat)
        const weekdayDistribution = Array.from({ length: 7 }, (_, day) => ({ day, streams: 0, minutes: 0 }));

        let totalStreams = 0;
        let totalMinutes = 0;

        streams.forEach(stream => {
            const date = new Date(stream.playedAt);
            const hour = date.getHours();
            const day = date.getDay();
            const minutes = stream.duration / 60000;

            hourlyDistribution[hour].streams += 1;
            hourlyDistribution[hour].minutes += minutes;

            weekdayDistribution[day].streams += 1;
            weekdayDistribution[day].minutes += minutes;

            totalStreams += 1;
            totalMinutes += minutes;
        });

        const daysInPeriod = getDaysInTimeframe(timeframe, user?.createdAt || new Date());
        
        res.json({
            hourly: hourlyDistribution,
            weekday: weekdayDistribution,
            averages: {
                streamsPerDay: daysInPeriod > 0 ? totalStreams / daysInPeriod : 0,
                minutesPerDay: daysInPeriod > 0 ? totalMinutes / daysInPeriod : 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
});

router.get('/heatmap', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const oneYearAgo = subDays(new Date(), 365);

    try {
        const activity = await prisma.$queryRaw<[{ date: string; count: bigint }]>`
            SELECT DATE("playedAt") as "date", COUNT(*) as "count"
            FROM "Stream"
            WHERE "userId" = ${userId} AND "playedAt" >= ${oneYearAgo}
            GROUP BY "date"
            ORDER BY "date" ASC
        `;

        res.json(activity.map(a => ({
            date: format(new Date(a.date), 'yyyy-MM-dd'),
            count: Number(a.count)
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

router.get('/top-tracks', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const limit = Number(authReq.query.limit) || 50;
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe);

    try {
        const topTracks = await prisma.stream.groupBy({
            by: ['trackId'],
            where: { userId, playedAt: { gte: start } },
            _count: { id: true },
            _sum: { duration: true },
            orderBy: { _sum: { duration: 'desc' } },
            take: limit
        });

        const hydrated = await Promise.all(topTracks.map(async (item) => {
            const track = await prisma.track.findUnique({
                where: { id: item.trackId },
                include: { artist: true, album: true }
            });
            if (!track) return null;
            return { 
                ...track, 
                artists: [track.artist], // Wrap in array for frontend compatibility
                playCount: item._count.id, 
                totalDuration: item._sum.duration 
            };
        }));

        res.json(hydrated.filter(t => t !== null));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top tracks' });
    }
});

router.get('/top-artists', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const limit = Number(authReq.query.limit) || 50;
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe);

    try {
        const artists = await prisma.$queryRaw<{ id: string; name: string; imageUrl: string | null; spotifyId: string | null; playCount: bigint; totalDuration: bigint }[]>`
            SELECT 
                "Artist"."id", "Artist"."name", "Artist"."imageUrl", "Artist"."spotifyId",
                COUNT("Stream"."id") as "playCount",
                SUM("Stream"."duration") as "totalDuration"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" >= ${start}
            GROUP BY "Artist"."id"
            ORDER BY "totalDuration" DESC
            LIMIT ${limit}
        `;

        res.json(artists.map(a => ({ ...a, playCount: Number(a.playCount), totalDuration: Number(a.totalDuration) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top artists' });
    }
});

router.get('/top-albums', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const limit = Number(authReq.query.limit) || 50;
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe);

    try {
        const albums = await prisma.$queryRaw<{ id: string; name: string; imageUrl: string | null; spotifyId: string | null; artistName: string; playCount: bigint; totalDuration: bigint }[]>`
            SELECT 
                "Album"."id", "Album"."name", "Album"."imageUrl", "Album"."spotifyId",
                "Artist"."name" as "artistName",
                COUNT("Stream"."id") as "playCount",
                SUM("Stream"."duration") as "totalDuration"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Album" ON "Track"."albumId" = "Album"."id"
            JOIN "Artist" ON "Album"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" >= ${start}
            GROUP BY "Album"."id", "Artist"."name"
            ORDER BY "totalDuration" DESC
            LIMIT ${limit}
        `;

        res.json(albums.map(a => ({ ...a, playCount: Number(a.playCount), totalDuration: Number(a.totalDuration) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch top albums' });
    }
});

router.get('/track/:id', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const trackId = authReq.params.id;

    try {
        const track = await prisma.track.findUnique({
            where: { id: trackId },
            include: { artist: true, album: true }
        });

        if (!track) return res.status(404).json({ error: 'Track not found' });

        const stats = await prisma.stream.aggregate({
            where: { userId, trackId },
            _count: { id: true },
            _sum: { duration: true },
            _min: { playedAt: true },
            _max: { playedAt: true }
        });

        const dailyStats = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
            SELECT DATE("playedAt") as "date", COUNT(*) as "count"
            FROM "Stream"
            WHERE "userId" = ${userId} AND "trackId" = ${trackId}
            GROUP BY "date"
            ORDER BY "date" ASC
        `;

        res.json({
            track: {
                ...track,
                artists: [track.artist]
            },
            playCount: stats._count.id,
            totalDuration: stats._sum.duration || 0,
            firstPlayed: stats._min.playedAt,
            lastPlayed: stats._max.playedAt,
            history: dailyStats.map(d => ({ date: format(new Date(d.date), 'yyyy-MM-dd'), count: Number(d.count) }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch track details' });
    }
});

router.get('/artist/:id', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const artistId = authReq.params.id;

    try {
        const artist = await prisma.artist.findUnique({ where: { id: artistId } });
        if (!artist) return res.status(404).json({ error: 'Artist not found' });

        const stats = await prisma.stream.aggregate({
            where: { userId, track: { artistId } },
            _count: { id: true },
            _sum: { duration: true },
            _min: { playedAt: true }
        });

        const topTracks = await prisma.$queryRaw<{ id: string; name: string; playCount: bigint }[]>`
            SELECT "Track"."id", "Track"."name", COUNT("Stream"."id") as "playCount"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${userId} AND "Track"."artistId" = ${artistId}
            GROUP BY "Track"."id"
            ORDER BY "playCount" DESC
            LIMIT 5
        `;

        const monthlyStats = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
            SELECT DATE_TRUNC('month', "playedAt") as "month", COUNT(*) as "count"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${userId} AND "Track"."artistId" = ${artistId}
            GROUP BY "month"
            ORDER BY "month" ASC
        `;

        res.json({
            artist,
            playCount: stats._count.id,
            totalDuration: stats._sum.duration || 0,
            discoveryDate: stats._min.playedAt,
            topTracks: topTracks.map(t => ({ ...t, playCount: Number(t.playCount) })),
            history: monthlyStats.map(m => ({ month: format(new Date(m.month), 'yyyy-MM'), count: Number(m.count) }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch artist details' });
    }
});

router.get('/recap', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const year = Number(authReq.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    try {
        const stats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: number; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${userId} AND "playedAt" BETWEEN ${start} AND ${end}
        `;

        const topArtist = await prisma.$queryRaw<{ name: string; imageUrl: string | null; count: bigint }[]>`
            SELECT "Artist"."name", "Artist"."imageUrl", COUNT("Stream"."id") as "count"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" BETWEEN ${start} AND ${end}
            GROUP BY "Artist"."id", "Artist"."name", "Artist"."imageUrl"
            ORDER BY "count" DESC
            LIMIT 1
        `;

        const topTrack = await prisma.$queryRaw<{ name: string; imageUrl: string | null; artistName: string; count: bigint }[]>`
            SELECT "Track"."name", "Album"."imageUrl", "Artist"."name" as "artistName", COUNT("Stream"."id") as "count"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Album" ON "Track"."albumId" = "Album"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" BETWEEN ${start} AND ${end}
            GROUP BY "Track"."id", "Track"."name", "Album"."imageUrl", "Artist"."name"
            ORDER BY "count" DESC
            LIMIT 1
        `;

        const mostActiveDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
            SELECT DATE("playedAt") as "date", COUNT(*) as "count"
            FROM "Stream"
            WHERE "userId" = ${userId} AND "playedAt" BETWEEN ${start} AND ${end}
            GROUP BY "date"
            ORDER BY "count" DESC
            LIMIT 1
        `;

        const topGenres = await prisma.$queryRaw<{ genre_name: string; count: bigint }[]>`
            SELECT UNNEST("Artist"."genres") as genre_name, COUNT(*) as "count"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" BETWEEN ${start} AND ${end}
            GROUP BY genre_name
            ORDER BY "count" DESC
            LIMIT 3
        `;

        res.json({
            year,
            totalStreams: Number(stats[0].totalStreams),
            totalMinutes: Math.round(Number(stats[0].totalDurationMs) / 60000),
            distinctSongs: Number(stats[0].distinctSongs),
            topArtist: topArtist[0] ? { ...topArtist[0], count: Number(topArtist[0].count) } : null,
            topTrack: topTrack[0] ? { ...topTrack[0], count: Number(topTrack[0].count) } : null,
            topGenres: topGenres.map(g => g.genre_name),
            mostActiveDay: mostActiveDay[0] ? {
                date: format(new Date(mostActiveDay[0].date), 'MMMM do'),
                count: Number(mostActiveDay[0].count)
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate recap' });
    }
});

router.get('/album/:id', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const albumId = authReq.params.id;

    try {
        const album = await prisma.album.findUnique({
            where: { id: albumId },
            include: { artist: true, tracks: true }
        });

        if (!album) return res.status(404).json({ error: 'Album not found' });

        const stats = await prisma.stream.aggregate({
            where: { userId, track: { albumId } },
            _count: { id: true },
            _sum: { duration: true },
            _min: { playedAt: true }
        });

        const trackStats = await prisma.$queryRaw<{ id: string; name: string; playCount: bigint }[]>`
            SELECT "Track"."id", "Track"."name", COUNT("Stream"."id") as "playCount"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${userId} AND "Track"."albumId" = ${albumId}
            GROUP BY "Track"."id"
            ORDER BY "playCount" DESC
        `;

        res.json({
            album: {
                ...album,
                artist: album.artist,
                artists: [album.artist]
            },
            playCount: stats._count.id,
            totalDuration: stats._sum.duration || 0,
            discoveryDate: stats._min.playedAt,
            tracks: trackStats.map(t => ({ ...t, playCount: Number(t.playCount) }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch album details' });
    }
});

router.get('/top-genres', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const timeframe = (authReq.query.timeframe as Timeframe) || 'lifetime';
    const limit = Number(authReq.query.limit) || 6;
    const userId = authReq.user.id;
    const { start } = getTimeRange(timeframe);

    try {
        const genres = await prisma.$queryRaw<{ genre_name: string; duration: bigint }[]>`
            SELECT UNNEST("Artist"."genres") as genre_name, SUM("Stream"."duration") as duration
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${userId} AND "Stream"."playedAt" >= ${start}
            GROUP BY genre_name
            ORDER BY duration DESC
            LIMIT ${limit}
        `;

        res.json(genres.map(g => ({ name: g.genre_name, duration: Number(g.duration) })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

router.get('/recently-played', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const page = Number(authReq.query.page) || 1;
    const limit = Number(authReq.query.limit) || 20;

    try {
        const streams = await prisma.stream.findMany({
            where: { userId },
            orderBy: { playedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                track: {
                    include: { artist: true, album: true }
                }
            }
        });
        
        const hydrated = streams.map(stream => ({
            ...stream,
            track: {
                ...stream.track,
                artists: [stream.track.artist] // Consistency with Spotify API format
            }
        }));

        res.json(hydrated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recently played' });
    }
});

// Public Routes (No Auth Middleware)
router.get('/public/:publicId/summary', async (req: Request, res: Response) => {
    let publicId = req.params.publicId;
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const timezone = (req.query.timezone as string) || 'UTC';

    try {
        let user;
        if (publicId === 'any') {
            user = await prisma.user.findFirst({
                where: { isPublicStats: true },
                select: { id: true, name: true, image: true, isPublicStats: true, createdAt: true, birthday: true, publicId: true }
            });
        } else {
            user = await prisma.user.findUnique({ 
                where: { publicId },
                select: { id: true, name: true, image: true, isPublicStats: true, createdAt: true, birthday: true, publicId: true }
            });
        }

        if (!user || !user.isPublicStats) {
            return res.status(404).json({ error: 'Stats not found or private' });
        }

        const { start } = getTimeRange(timeframe, timezone);

        const stats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: bigint; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${start}
        `;

        const artistStats = await prisma.$queryRaw<[{ distinctArtists: bigint }]>`
            SELECT COUNT(DISTINCT "Track"."artistId") as "distinctArtists"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
        `;

        let percentOfLife = null;
        const listenMs = Number(stats[0].totalDurationMs);
        if (user.birthday && timeframe === 'lifetime') {
            const ageInMs = new Date().getTime() - new Date(user.birthday).getTime();
            percentOfLife = (listenMs / ageInMs) * 100;
        }

        res.json({
            user: { name: user.name, image: user.image, publicId: user.publicId },
            totalDurationMs: listenMs,
            totalStreams: Number(stats[0].totalStreams),
            distinctSongs: Number(stats[0].distinctSongs),
            distinctArtists: Number(artistStats[0].distinctArtists),
            percentOfLife,
            timeframe
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public summary' });
    }
});

router.get('/public/:publicId/top-tracks', async (req: Request, res: Response) => {
    let publicId = req.params.publicId;
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    try {
        let user;
        if (publicId === 'any') {
            user = await prisma.user.findFirst({
                where: { isPublicStats: true },
                select: { id: true, isPublicStats: true }
            });
        } else {
            user = await prisma.user.findUnique({ 
                where: { publicId },
                select: { id: true, isPublicStats: true }
            });
        }

        if (!user || !user.isPublicStats) {
            return res.status(404).json({ error: 'Stats not found or private' });
        }

        const { start } = getTimeRange(timeframe);

        const topTracks = await prisma.stream.groupBy({
            by: ['trackId'],
            where: { userId: user.id, playedAt: { gte: start } },
            _count: { id: true },
            _sum: { duration: true },
            orderBy: { _sum: { duration: 'desc' } },
            take: limit
        });

        const hydrated = await Promise.all(topTracks.map(async (item) => {
            const track = await prisma.track.findUnique({
                where: { id: item.trackId },
                include: { artist: true, album: true }
            });
            if (!track) return null;
            return { 
                ...track, 
                artists: [track.artist],
                playCount: item._count.id, 
                totalDuration: item._sum.duration 
            };
        }));

        res.json(hydrated.filter(t => t !== null));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public top tracks' });
    }
});

// Global Public Routes (Simplified for single-user)
router.get('/global/summary', async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const timezone = (req.query.timezone as string) || 'UTC';

    try {
        const user = await prisma.user.findFirst({
            where: { isPublicStats: true },
            select: { id: true, name: true, image: true, isPublicStats: true, createdAt: true, birthday: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Global stats are currently private' });
        }

        const { start } = getTimeRange(timeframe, timezone);

        const stats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: bigint; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${start}
        `;

        const artistStats = await prisma.$queryRaw<[{ distinctArtists: bigint }]>`
            SELECT COUNT(DISTINCT "Track"."artistId") as "distinctArtists"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
        `;

        let percentOfLife = null;
        const listenMs = Number(stats[0].totalDurationMs);
        if (user.birthday && timeframe === 'lifetime') {
            const ageInMs = new Date().getTime() - new Date(user.birthday).getTime();
            percentOfLife = (listenMs / ageInMs) * 100;
        }

        res.json({
            user: { name: user.name, image: user.image },
            totalDurationMs: listenMs,
            totalStreams: Number(stats[0].totalStreams),
            distinctSongs: Number(stats[0].distinctSongs),
            distinctArtists: Number(artistStats[0].distinctArtists),
            percentOfLife,
            timeframe
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch global summary' });
    }
});

router.get('/global/top-tracks', async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    try {
        const user = await prisma.user.findFirst({
            where: { isPublicStats: true },
            select: { id: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Global stats are currently private' });
        }

        const { start } = getTimeRange(timeframe);

        const topTracks = await prisma.stream.groupBy({
            by: ['trackId'],
            where: { userId: user.id, playedAt: { gte: start } },
            _count: { id: true },
            _sum: { duration: true },
            orderBy: { _sum: { duration: 'desc' } },
            take: limit
        });

        const hydrated = await Promise.all(topTracks.map(async (item) => {
            const track = await prisma.track.findUnique({
                where: { id: item.trackId },
                include: { artist: true, album: true }
            });
            if (!track) return null;
            return { 
                ...track, 
                artists: [track.artist],
                playCount: item._count.id, 
                totalDuration: item._sum.duration 
            };
        }));

        res.json(hydrated.filter(t => t !== null));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch global top tracks' });
    }
});

router.get('/public/profile', async (req: Request, res: Response) => {
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const timezone = (req.query.timezone as string) || 'UTC';

    try {
        const user = await prisma.user.findFirst({ 
            where: { isPublicStats: true },
            select: { 
                id: true, name: true, image: true, isPublicStats: true, 
                createdAt: true, birthday: true, publicId: true,
                accentColor: true, fontFamily: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'No public stats available' });
        }

        const { start } = getTimeRange(timeframe, timezone);

        // ... (Same data fetching logic as the ID-based route)
        // I'll extract this into a helper if I were doing it properly, 
        // but for now I'll just repeat or call the other logic if possible.
        // Actually, let's just make the ID optional or handle it here.
        
        // 1. Summary
        const summaryStats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: bigint; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${start}
        `;

        const artistStatsCount = await prisma.$queryRaw<[{ distinctArtists: bigint }]>`
            SELECT COUNT(DISTINCT "Track"."artistId") as "distinctArtists"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
        `;

        // 2. Top Tracks
        const topTracksRaw = await prisma.stream.groupBy({
            by: ['trackId'],
            where: { userId: user.id, playedAt: { gte: start } },
            _count: { id: true },
            _sum: { duration: true },
            orderBy: { _sum: { duration: 'desc' } },
            take: 20
        });

        const topTracks = await Promise.all(topTracksRaw.map(async (item) => {
            const track = await prisma.track.findUnique({
                where: { id: item.trackId },
                include: { artist: true, album: true }
            });
            if (!track) return null;
            return { ...track, artists: [track.artist], playCount: item._count.id, totalDuration: item._sum.duration };
        }));

        // 3. Top Artists
        const topArtists = await prisma.$queryRaw<{ id: string; name: string; imageUrl: string | null; playCount: bigint; totalDuration: bigint }[]>`
            SELECT 
                "Artist"."id", "Artist"."name", "Artist"."imageUrl",
                COUNT("Stream"."id") as "playCount",
                SUM("Stream"."duration") as "totalDuration"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
            GROUP BY "Artist"."id"
            ORDER BY "totalDuration" DESC
            LIMIT 20
        `;

        // 4. Heatmap (last year)
        const oneYearAgo = subDays(new Date(), 365);
        const activity = await prisma.$queryRaw<[{ date: string; count: bigint }]>`
            SELECT DATE("playedAt") as "date", COUNT(*) as "count"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${oneYearAgo}
            GROUP BY "date"
            ORDER BY "date" ASC
        `;

        // 5. Recent Tracks
        const recentTracks = await prisma.stream.findMany({
            where: { userId: user.id },
            orderBy: { playedAt: 'desc' },
            take: 10,
            include: { track: { include: { artist: true, album: true } } }
        });

        res.json({
            user: { 
                name: user.name, 
                image: user.image, 
                publicId: user.publicId,
                accentColor: user.accentColor,
                fontFamily: user.fontFamily
            },
            summary: {
                totalDurationMs: Number(summaryStats[0].totalDurationMs),
                totalStreams: Number(summaryStats[0].totalStreams),
                distinctSongs: Number(summaryStats[0].distinctSongs),
                distinctArtists: Number(artistStatsCount[0].distinctArtists),
                timeframe
            },
            topTracks: topTracks.filter(Boolean),
            topArtists: topArtists.map(a => ({ ...a, playCount: Number(a.playCount), totalDuration: Number(a.totalDuration) })),
            heatmap: activity.map(a => ({ date: format(new Date(a.date), 'yyyy-MM-dd'), count: Number(a.count) })),
            recentTracks: recentTracks.map(s => ({ ...s, track: { ...s.track, artists: [s.track.artist] } }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public profile' });
    }
});

router.get('/public/:publicId/profile', async (req: Request, res: Response) => {
    let publicId = req.params.publicId;
    const timeframe = (req.query.timeframe as Timeframe) || 'lifetime';
    const timezone = (req.query.timezone as string) || 'UTC';

    try {
        const user = await prisma.user.findUnique({ 
            where: { publicId },
            select: { 
                id: true, name: true, image: true, isPublicStats: true, 
                createdAt: true, birthday: true, publicId: true,
                accentColor: true, fontFamily: true
            }
        });

        if (!user || !user.isPublicStats) {
            return res.status(404).json({ error: 'Stats not found or private' });
        }

        const { start } = getTimeRange(timeframe, timezone);

        // 1. Summary
        const summaryStats = await prisma.$queryRaw<[{ totalStreams: bigint; totalDurationMs: bigint; distinctSongs: bigint }]>`
            SELECT 
                COUNT(*) as "totalStreams",
                COALESCE(SUM(duration), 0) as "totalDurationMs",
                COUNT(DISTINCT "trackId") as "distinctSongs"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${start}
        `;

        const artistStatsCount = await prisma.$queryRaw<[{ distinctArtists: bigint }]>`
            SELECT COUNT(DISTINCT "Track"."artistId") as "distinctArtists"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
        `;

        // 2. Top Tracks
        const topTracksRaw = await prisma.stream.groupBy({
            by: ['trackId'],
            where: { userId: user.id, playedAt: { gte: start } },
            _count: { id: true },
            _sum: { duration: true },
            orderBy: { _sum: { duration: 'desc' } },
            take: 20
        });

        const topTracks = await Promise.all(topTracksRaw.map(async (item) => {
            const track = await prisma.track.findUnique({
                where: { id: item.trackId },
                include: { artist: true, album: true }
            });
            if (!track) return null;
            return { ...track, artists: [track.artist], playCount: item._count.id, totalDuration: item._sum.duration };
        }));

        // 3. Top Artists
        const topArtists = await prisma.$queryRaw<{ id: string; name: string; imageUrl: string | null; playCount: bigint; totalDuration: bigint }[]>`
            SELECT 
                "Artist"."id", "Artist"."name", "Artist"."imageUrl",
                COUNT("Stream"."id") as "playCount",
                SUM("Stream"."duration") as "totalDuration"
            FROM "Stream"
            JOIN "Track" ON "Stream"."trackId" = "Track"."id"
            JOIN "Artist" ON "Track"."artistId" = "Artist"."id"
            WHERE "Stream"."userId" = ${user.id} AND "Stream"."playedAt" >= ${start}
            GROUP BY "Artist"."id"
            ORDER BY "totalDuration" DESC
            LIMIT 20
        `;

        // 4. Heatmap (last year)
        const oneYearAgo = subDays(new Date(), 365);
        const activity = await prisma.$queryRaw<[{ date: string; count: bigint }]>`
            SELECT DATE("playedAt") as "date", COUNT(*) as "count"
            FROM "Stream"
            WHERE "userId" = ${user.id} AND "playedAt" >= ${oneYearAgo}
            GROUP BY "date"
            ORDER BY "date" ASC
        `;

        // 5. Recent Tracks
        const recentTracks = await prisma.stream.findMany({
            where: { userId: user.id },
            orderBy: { playedAt: 'desc' },
            take: 10,
            include: { track: { include: { artist: true, album: true } } }
        });

        res.json({
            user: { 
                name: user.name, 
                image: user.image, 
                publicId: user.publicId,
                accentColor: user.accentColor,
                fontFamily: user.fontFamily
            },
            summary: {
                totalDurationMs: Number(summaryStats[0].totalDurationMs),
                totalStreams: Number(summaryStats[0].totalStreams),
                distinctSongs: Number(summaryStats[0].distinctSongs),
                distinctArtists: Number(artistStatsCount[0].distinctArtists),
                timeframe
            },
            topTracks: topTracks.filter(Boolean),
            topArtists: topArtists.map(a => ({ ...a, playCount: Number(a.playCount), totalDuration: Number(a.totalDuration) })),
            heatmap: activity.map(a => ({ date: format(new Date(a.date), 'yyyy-MM-dd'), count: Number(a.count) })),
            recentTracks: recentTracks.map(s => ({ ...s, track: { ...s.track, artists: [s.track.artist] } }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch public profile' });
    }
});

export default router;
