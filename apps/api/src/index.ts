import { env, isTest, isProduction } from './env';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import statsRouter from './routes/stats';
import connectRouter from './routes/connect';
import IORedis from 'ioredis';
import { prisma } from 'database';
import { historyImportQueue, realtimeSyncQueue } from './lib/queue';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthenticatedRequest } from './types';

// Initialize Workers
import './workers/historyImport';
import './workers/realtimeSync';
import './workers/metadata';

const app = express();
app.set('trust proxy', true);
export { app };
const port = env.PORT;

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

const redisConnection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
});

// Schedule Realtime Sync for all users every 10 minutes
const scheduleSync = async () => {
    await realtimeSyncQueue.add('global-sync-trigger', {}, {
        repeat: { pattern: '*/10 * * * *' }
    });
};

scheduleSync();

app.use(cors({
    origin: [
        env.FRONTEND_URL,
        ...env.ALLOWED_ORIGINS
    ],
    credentials: true
}));


app.use(express.json());

// BetterAuth Handler
app.all("/api/auth/*", toNodeHandler(auth));

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({ headers: new Headers(req.headers as any) });
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    (req as AuthenticatedRequest).user = session.user as any;
    next();
};


app.use('/api/stats', statsRouter);
app.use('/api/public', statsRouter); // Alias for convenience
app.use('/api/connect', authMiddleware, connectRouter);

app.get('/api/setup/status', (req: Request, res: Response) => {
    const isConfigured = !!(
        env.DATABASE_URL &&
        env.SPOTIFY_CLIENT_ID &&
        env.SPOTIFY_CLIENT_SECRET
    );
    res.json({ isConfigured });
});

app.post('/api/setup/validate', async (req: Request, res: Response) => {
    const { databaseUrl, redisUrl } = req.body;
    
    try {
        // 1. Check Database
        const { PrismaClient } = await import('@prisma/client');
        const tempPrisma = new PrismaClient({
            datasources: { db: { url: databaseUrl } },
        });
        await tempPrisma.$connect();
        await tempPrisma.$disconnect();

        // 2. Check Redis
        const tempRedis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
        await tempRedis.ping();
        tempRedis.disconnect();

        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/setup/save', (req: Request, res: Response) => {
    const { databaseUrl, redisUrl, spotifyClientId, spotifyClientSecret, frontendUrl, apiUrl } = req.body;
    
    const envPath = path.join(process.cwd(), '../../.env');
    
    const betterAuthSecret = env.BETTER_AUTH_SECRET || crypto.randomBytes(32).toString('hex');
    
    const content = `DATABASE_URL="${databaseUrl || 'postgresql://postgres:password@localhost:5432/localfm'}"
REDIS_URL="${redisUrl || 'redis://localhost:6379'}"
SPOTIFY_CLIENT_ID="${spotifyClientId}"
SPOTIFY_CLIENT_SECRET="${spotifyClientSecret}"
FRONTEND_URL="${frontendUrl || 'http://localhost:3000'}"
NEXT_PUBLIC_API_URL="${apiUrl || 'http://localhost:3001'}"
BETTER_AUTH_SECRET="${betterAuthSecret}"
`;

    fs.writeFileSync(envPath, content);
    
    setTimeout(() => process.exit(0), 1000);
    res.json({ success: true, message: "Configuration saved. Server is restarting..." });
});


app.get('/api/import/list', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const imports = await prisma.import.findMany({
        where: { userId: authReq.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    res.json(imports);
});

app.post('/api/user/update', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { birthday, accentColor, isPublicStats, fontFamily, dashboardPrefs, recapPrefs, debugMode } = req.body;
    await prisma.user.update({
        where: { id: authReq.user.id },
        data: { 
            birthday: birthday ? new Date(birthday) : undefined,
            accentColor: accentColor || undefined,
            fontFamily: fontFamily || undefined,
            dashboardPrefs: dashboardPrefs ? JSON.stringify(dashboardPrefs) : undefined,
            recapPrefs: recapPrefs ? JSON.stringify(recapPrefs) : undefined,
            isPublicStats: isPublicStats !== undefined ? !!isPublicStats : undefined,
            debugMode: debugMode !== undefined ? !!debugMode : undefined
        }
    });
    res.json({ success: true });
});

app.post('/api/user/delete-data', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    try {
        await prisma.stream.deleteMany({ where: { userId } });
        await prisma.import.deleteMany({ where: { userId } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user/export-data', authMiddleware, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    try {
        const streams = await prisma.stream.findMany({
            where: { userId },
            include: {
                track: {
                    include: { artist: true, album: true }
                }
            },
            orderBy: { playedAt: 'desc' }
        });
        
        const hydrated = streams.map(stream => ({
            ...stream,
            track: {
                ...stream.track,
                artists: [stream.track.artist]
            }
        }));

        res.json(hydrated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/import/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const newImport = await prisma.import.create({
        data: {
            userId: authReq.user.id,
            status: 'PENDING',
            fileName: req.file.filename
        }
    });

    await historyImportQueue.add('process-import', {
        importId: newImport.id,
        filePath: req.file.path,
        userId: authReq.user.id
    });

    res.json({ message: "Import started", importId: newImport.id });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', redis: redisConnection.status });
});


if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
