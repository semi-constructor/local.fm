import * as fs from 'fs/promises';
import { prisma } from 'database';
import { metadataQueue } from '../lib/queue';

export interface SpotifyHistoryEntry {
  ts: string;
  ms_played: number;
  master_metadata_track_name: string | null;
  master_metadata_album_artist_name: string | null;
  master_metadata_album_album_name: string | null;
  spotify_track_uri: string | null;
}

export interface ParseStats {
  totalParsed: number;
  inserted: number;
  skipped: number;
}

export function isSpotifyHistoryFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.includes('streaminghistory') || 
    lower.includes('endsong_') || 
    lower.includes('streaming-verlauf')
  ) && lower.endsWith('.json');
}

export async function parseSpotifyHistory(filePath: string, userId: string): Promise<ParseStats> {
  const content = await fs.readFile(filePath, 'utf-8');
  const history: SpotifyHistoryEntry[] = JSON.parse(content);

  const stats: ParseStats = {
    totalParsed: 0,
    inserted: 0,
    skipped: 0,
  };

  const artistCache = new Map<string, string>(); 
  const albumCache = new Map<string, string>();  
  const trackCache = new Map<string, string>();  

  const chunkSize = 500;
  for (let i = 0; i < history.length; i += chunkSize) {
    const chunk = history.slice(i, i + chunkSize);
    
    // 1. Collect all unique names in this chunk that are NOT in cache
    const uniqueArtistNames = new Set<string>();
    const uniqueAlbumKeys = new Set<string>(); // "artistName|albumName"
    const uniqueSpotifyTrackIds = new Set<string>();

    for (const entry of chunk) {
      if (!entry.spotify_track_uri || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name || !entry.master_metadata_album_album_name) {
        continue;
      }
      
      const spotifyTrackId = entry.spotify_track_uri.split(':').pop() || '';
      const artistName = entry.master_metadata_album_artist_name;
      const albumName = entry.master_metadata_album_album_name;

      if (!artistCache.has(artistName)) uniqueArtistNames.add(artistName);
      if (!trackCache.has(spotifyTrackId)) uniqueSpotifyTrackIds.add(spotifyTrackId);
      
      const albumKey = `${artistName}|${albumName}`;
      if (!albumCache.has(albumKey)) uniqueAlbumKeys.add(albumKey);
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
      
      // Create missing artists
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
        // This is a bit trickier since album lookup needs artistId
        // For simplicity in batching, we'll group by artist
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
            if (artistName) {
                albumCache.set(`${artistName}|${album.name}`, album.id);
            }
        }

        // Create missing albums
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
    if (uniqueSpotifyTrackIds.size > 0) {
        const existingTracks = await prisma.track.findMany({
            where: { spotifyId: { in: Array.from(uniqueSpotifyTrackIds) } }
        });
        for (const track of existingTracks) {
            trackCache.set(track.spotifyId!, track.id);
            uniqueSpotifyTrackIds.delete(track.spotifyId!);
        }
        
        // The remaining uniqueSpotifyTrackIds need to be created.
        // We'll do this in the main loop to handle associations correctly, 
        // or we could batch create them here if we have all info.
    }

    const streamData = [];

    for (const entry of chunk) {
      stats.totalParsed++;

      if (!entry.spotify_track_uri || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name || !entry.master_metadata_album_album_name) {
        stats.skipped++;
        continue;
      }

      const spotifyTrackId = entry.spotify_track_uri.split(':').pop() || '';
      const artistName = entry.master_metadata_album_artist_name;
      const albumName = entry.master_metadata_album_album_name;

      try {
        const artistId = artistCache.get(artistName)!;
        const albumId = albumCache.get(`${artistName}|${albumName}`)!;
        
        let trackId = trackCache.get(spotifyTrackId);
        if (!trackId) {
            const track = await prisma.track.create({
                data: {
                    spotifyId: spotifyTrackId,
                    name: entry.master_metadata_track_name,
                    duration: entry.ms_played,
                    artistId,
                    albumId,
                }
            });
            trackId = track.id;
            trackCache.set(spotifyTrackId, trackId);
        }

        streamData.push({
          userId,
          trackId,
          playedAt: new Date(entry.ts),
          duration: entry.ms_played,
        });

      } catch (error) {
        stats.skipped++;
      }
    }

    if (streamData.length > 0) {
      const result = await prisma.stream.createMany({
        data: streamData,
        skipDuplicates: true,
      });
      stats.inserted += result.count;
    }
  }

  return stats;
}
