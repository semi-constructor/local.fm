import * as fs from 'fs';
import { parse } from 'csv-parse';
import { prisma } from 'database';
import { metadataQueue } from '../lib/queue';

export interface AppleMusicPlayActivity {
    'Artist Name': string;
    'Album Name': string;
    'Track Name': string;
    'Media Duration In Milliseconds': string;
    'Event End Timestamp': string;
    'Play Duration Milliseconds': string;
}

export interface ParseStats {
    totalParsed: number;
    inserted: number;
    skipped: number;
}

export function isAppleMusicHistoryFile(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return (
        lower.includes('play activity') || 
        lower.includes('apple music-verlauf') ||
        (lower.includes('verlauf') && lower.endsWith('.csv'))
    );
}

export async function parseAppleMusicHistory(filePath: string, userId: string): Promise<ParseStats> {
    const stats: ParseStats = {
        totalParsed: 0,
        inserted: 0,
        skipped: 0,
    };

    const artistCache = new Map<string, string>();
    const albumCache = new Map<string, string>();
    const trackCache = new Map<string, string>();

    const parser = fs.createReadStream(filePath).pipe(
        parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
        })
    );

    let chunk: any[] = [];
    const chunkSize = 500;

    for await (const record of parser) {
        chunk.push(record);
        if (chunk.length >= chunkSize) {
            await processChunk(chunk, userId, stats, artistCache, albumCache, trackCache);
            chunk = [];
        }
    }

    if (chunk.length > 0) {
        await processChunk(chunk, userId, stats, artistCache, albumCache, trackCache);
    }

    return stats;
}

async function processChunk(
    chunk: any[], 
    userId: string, 
    stats: ParseStats,
    artistCache: Map<string, string>,
    albumCache: Map<string, string>,
    trackCache: Map<string, string>
) {
    // 1. Collect unique names
    const uniqueArtistNames = new Set<string>();
    const uniqueAlbumKeys = new Set<string>(); // "artistName|albumName"
    const uniqueTrackKeys = new Set<string>(); // "artistName|albumName|trackName"

    for (const record of chunk) {
        const artistName = record['Artist Name'];
        const albumName = record['Album Name'] || 'Unknown Album';
        const trackName = record['Track Name'];

        if (!artistName || !trackName) continue;

        if (!artistCache.has(artistName)) uniqueArtistNames.add(artistName);
        
        const albumKey = `${artistName}|${albumName}`;
        if (!albumCache.has(albumKey)) uniqueAlbumKeys.add(albumKey);

        const trackKey = `${artistName}|${albumName}|${trackName}`;
        if (!trackCache.has(trackKey)) uniqueTrackKeys.add(trackKey);
    }

    // 2. Batch lookup Artists
    if (uniqueArtistNames.size > 0) {
        const existingArtists = await prisma.artist.findMany({
            where: { name: { in: Array.from(uniqueArtistNames) } }
        });
        for (const artist of existingArtists) {
            artistCache.set(artist.name, artist.id);
            uniqueArtistNames.delete(artist.name);
        }
        for (const name of uniqueArtistNames) {
            const newArtist = await prisma.artist.create({ data: { name } });
            artistCache.set(name, newArtist.id);
            await metadataQueue.add('enrich-artist', { 
                artistId: newArtist.id, 
                artistName: name, 
                userId 
            });
        }
    }

    // 3. Batch lookup Albums
    if (uniqueAlbumKeys.size > 0) {
        const albumKeys = Array.from(uniqueAlbumKeys).map(k => {
            const [artistName, albumName] = k.split('|');
            return { artistName, albumName, artistId: artistCache.get(artistName)! };
        });

        const existingAlbums = await prisma.album.findMany({
            where: {
                OR: albumKeys.map(ak => ({
                    name: ak.albumName,
                    artistId: ak.artistId
                }))
            }
        });

        const artistIdToName = new Map<string, string>();
        for (const [name, id] of artistCache.entries()) {
            artistIdToName.set(id, name);
        }

        for (const album of existingAlbums) {
            const artistName = artistIdToName.get(album.artistId);
            if (artistName) albumCache.set(`${artistName}|${album.name}`, album.id);
        }

        for (const ak of albumKeys) {
            const cacheKey = `${ak.artistName}|${ak.albumName}`;
            if (!albumCache.has(cacheKey)) {
                const newAlbum = await prisma.album.create({
                    data: { name: ak.albumName, artistId: ak.artistId }
                });
                albumCache.set(cacheKey, newAlbum.id);
            }
        }
    }

    // 4. Batch lookup Tracks
    if (uniqueTrackKeys.size > 0) {
        const trackKeys = Array.from(uniqueTrackKeys).map(k => {
            const [artistName, albumName, trackName] = k.split('|');
            return { 
                artistName, 
                albumName, 
                trackName, 
                albumId: albumCache.get(`${artistName}|${albumName}`)!,
                artistId: artistCache.get(artistName)!
            };
        });

        const existingTracks = await prisma.track.findMany({
            where: {
                OR: trackKeys.map(tk => ({
                    name: tk.trackName,
                    albumId: tk.albumId
                }))
            }
        });

        const albumIdToKey = new Map<string, string>();
        for (const [key, id] of albumCache.entries()) {
            albumIdToKey.set(id, key); // key is "artistName|albumName"
        }

        for (const track of existingTracks) {
            const albumKey = albumIdToKey.get(track.albumId);
            if (albumKey) {
                trackCache.set(`${albumKey}|${track.name}`, track.id);
            }
        }
    }

    const streamData = [];

    for (const record of chunk) {
        stats.totalParsed++;

        const artistName = record['Artist Name'];
        const albumName = record['Album Name'] || 'Unknown Album';
        const trackName = record['Track Name'];
        const playedAt = new Date(record['Event End Timestamp']);
        const playDuration = parseInt(record['Play Duration Milliseconds']) || 0;
        const mediaDuration = parseInt(record['Media Duration In Milliseconds']) || 0;

        if (!artistName || !trackName || !playedAt || isNaN(playedAt.getTime())) {
            stats.skipped++;
            continue;
        }

        try {
            const artistId = artistCache.get(artistName)!;
            const albumId = albumCache.get(`${artistName}|${albumName}`)!;
            const trackKey = `${artistName}|${albumName}|${trackName}`;
            
            let trackId = trackCache.get(trackKey);
            if (!trackId) {
                const track = await prisma.track.create({
                    data: { 
                        name: trackName, 
                        albumId, 
                        artistId, 
                        duration: mediaDuration 
                    }
                });
                trackId = track.id;
                trackCache.set(trackKey, trackId);
            }

            streamData.push({
                userId,
                trackId,
                playedAt,
                duration: playDuration
            });
        } catch (error) {
            stats.skipped++;
        }
    }

    if (streamData.length > 0) {
        const result = await prisma.stream.createMany({
            data: streamData,
            skipDuplicates: true
        });
        stats.inserted += result.count;
    }
}
