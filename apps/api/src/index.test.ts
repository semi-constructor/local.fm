import request from 'supertest';
import { app } from './index';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

jest.mock('ioredis');
jest.mock('bullmq');
jest.mock('database', () => ({
  prisma: {
    import: { create: jest.fn() },
  },
}));

jest.mock('./auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('better-auth/node', () => ({
  toNodeHandler: jest.fn(() => (req: any, res: any) => res.status(200).end()),
}));

describe('Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('POST /api/import/upload', () => {
    it('should return 401 if unauthorized', async () => {
      const response = await request(app).post('/api/import/upload');
      expect(response.status).toBe(401);
    });
  });
});
