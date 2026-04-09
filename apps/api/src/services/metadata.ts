import axios from 'axios';
import { prisma } from 'database';

export async function enrichArtistMetadata(artistId: string, spotifyId: string, accessToken: string) {
    try {
        const response = await axios.get(`https://api.spotify.com/v1/artists/${spotifyId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const { genres, images } = response.data;
        const imageUrl = images[0]?.url;

        await prisma.artist.update({
            where: { id: artistId },
            data: {
                genres: genres,
                imageUrl: imageUrl
            }
        });

        console.log(`Enriched artist ${artistId} with genres: ${genres.join(', ')}`);
    } catch (error: any) {
        console.error(`Failed to enrich artist ${artistId}:`, error.message);
    }
}

export async function findSpotifyIdByName(name: string, accessToken: string) {
    try {
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
            params: { q: name, type: 'artist', limit: 1 },
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const artist = response.data.artists.items[0];
        if (artist) {
            return {
                spotifyId: artist.id,
                genres: artist.genres,
                imageUrl: artist.images[0]?.url
            };
        }
        return null;
    } catch (error: any) {
        console.error(`Failed to search artist ${name}:`, error.message);
        return null;
    }
}
