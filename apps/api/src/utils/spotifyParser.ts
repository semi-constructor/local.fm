import * as fs from 'fs/promises';
import { prisma } from 'database';
import { metadataQueue } from '../lib/queue';

export interface SpotifyHistoryEntry {
  // Extended format
  ts?: string;
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null;

  // Standard format
  endTime?: string;
  artistName?: string;
  trackName?: string;
  msPlayed?: number;
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
      const artistName = entry.master_metadata_album_artist_name || entry.artistName;
      const trackName = entry.master_metadata_track_name || entry.trackName;
      const albumName = entry.master_metadata_album_album_name || "Unknown Album";
      
      if (!artistName || !trackName) {
        continue;
      }

      const spotifyTrackId = entry.spotify_track_uri ? (entry.spotify_track_uri.split(':').pop() || '') : `legacy|${artistName}|${trackName}`;

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
            where: { 
                OR: [
                    { spotifyId: { in: Array.from(uniqueSpotifyTrackIds).filter(id => !id.startsWith('legacy|')) } },
                    { 
                        AND: [
                            { spotifyId: null },
                            { name: { in: chunk.map(c => c.master_metadata_track_name || c.trackName).filter(Boolean) as string[] } }
                        ]
                    }
                ]
            }
        });
        for (const track of existingTracks) {
            if (track.spotifyId) {
                trackCache.set(track.spotifyId, track.id);
            } else {
                // For legacy tracks, we need a better mapping, but for now we skip batching legacy
            }
        }
    }

    const streamData = [];

    for (const entry of chunk) {
      stats.totalParsed++;

      const artistName = entry.master_metadata_album_artist_name || entry.artistName;
      const trackName = entry.master_metadata_track_name || entry.trackName;
      const albumName = entry.master_metadata_album_album_name || "Unknown Album";
      const msPlayed = entry.ms_played ?? entry.msPlayed ?? 0;
      const playedAt = entry.ts ? new Date(entry.ts) : (entry.endTime ? new Date(entry.endTime) : new Date());

      if (!artistName || !trackName) {
        stats.skipped++;
        continue;
      }

      const spotifyTrackId = entry.spotify_track_uri ? (entry.spotify_track_uri.split(':').pop() || '') : null;

      try {
        const artistId = artistCache.get(artistName)!;
        const albumId = albumCache.get(`${artistName}|${albumName}`)!;
        
        let trackId = spotifyTrackId ? trackCache.get(spotifyTrackId) : null;
        
        if (!trackId) {
            // Find by name if no spotifyId or not in cache
            const existingTrack = await prisma.track.findFirst({
                where: spotifyTrackId ? { spotifyId: spotifyTrackId } : { name: trackName, artistId, albumId }
            });

            if (existingTrack) {
                trackId = existingTrack.id;
            } else {
                const track = await prisma.track.create({
                    data: {
                        spotifyId: spotifyTrackId,
                        name: trackName,
                        duration: msPlayed,
                        artistId,
                        albumId,
                    }
                });
                trackId = track.id;
            }
            if (spotifyTrackId) trackCache.set(spotifyTrackId, trackId);
        }

        streamData.push({
          userId,
          trackId,
          playedAt,
          duration: msPlayed,
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
