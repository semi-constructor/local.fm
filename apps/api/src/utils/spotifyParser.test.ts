import { parseSpotifyHistory } from './spotifyParser';
import { prisma } from 'database';
import * as fs from 'fs/promises';

jest.mock('database', () => ({
  prisma: {
    artist: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    album: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    track: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    stream: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock('fs/promises');
jest.mock('../lib/queue', () => ({
  metadataQueue: { add: jest.fn() },
}));

describe('spotifyParser', () => {
  const mockUserId = 'user-123';
  const mockFilePath = 'mock-path.json';
  const mockHistoryData = [
    {
      ts: '2023-01-01T00:00:00Z',
      master_metadata_track_name: 'Test Track',
      master_metadata_album_artist_name: 'Test Artist',
      master_metadata_album_album_name: 'Test Album',
      spotify_track_uri: 'spotify:track:123',
      ms_played: 180000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse history and call prisma methods', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockHistoryData));
    
    (prisma.artist.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.artist.create as jest.Mock).mockResolvedValue({ id: 'artist-id' });
    (prisma.album.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.album.create as jest.Mock).mockResolvedValue({ id: 'album-id' });
    (prisma.track.create as jest.Mock).mockResolvedValue({ id: 'track-id' });
    (prisma.stream.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const stats = await parseSpotifyHistory(mockFilePath, mockUserId);

    expect(stats.totalParsed).toBe(1);
    expect(stats.inserted).toBe(1);
    expect(prisma.artist.create).toHaveBeenCalled();
    expect(prisma.album.create).toHaveBeenCalled();
    expect(prisma.track.create).toHaveBeenCalled();
    expect(prisma.stream.createMany).toHaveBeenCalled();
  });

  it('should skip entries without track name or uri', async () => {
    const invalidData = [{ ts: '2023-01-01T00:00:00Z', ms_played: 0 }];
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidData));

    const stats = await parseSpotifyHistory(mockFilePath, mockUserId);

    expect(stats.totalParsed).toBe(1);
    expect(stats.inserted).toBe(0);
    expect(stats.skipped).toBe(1);
  });
});
