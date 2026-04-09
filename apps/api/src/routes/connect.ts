import { Router, Request, Response } from 'express';
import { prisma } from 'database';
import { getValidSpotifyToken } from '../services/spotifyAuth';
import { AuthenticatedRequest } from '../types';
import { realtimeSyncQueue } from '../lib/queue';

const router = Router();

// Get Spotify connection status
router.get('/spotify/status', async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const account = await prisma.account.findFirst({
            where: { userId, providerId: 'spotify' }
        });

        if (!account) {
            return res.json({ status: 'disconnected' });
        }

        const token = await getValidSpotifyToken(userId);
        if (!token) {
            return res.json({ status: 'expired', message: 'Token could not be refreshed' });
        }

        res.json({ 
            status: 'connected', 
            lastUpdated: account.updatedAt,
            hasRefreshToken: !!account.refreshToken,
            expiresAt: account.accessTokenExpiresAt
        });
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

// Manual sync trigger
router.post('/sync', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    try {
        await realtimeSyncQueue.add('user-sync', { userId });
        res.json({ success: true, message: 'Sync queued' });
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

router.post('/disconnect', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { providerId } = req.body;
    const userId = authReq.user.id;

    try {
        await prisma.account.deleteMany({
            where: { userId, providerId }
        });
        res.json({ success: true });
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;
