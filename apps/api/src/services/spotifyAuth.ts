import axios from 'axios';
import { prisma } from 'database';
import { env } from '../env';

export async function getValidSpotifyToken(userId: string) {
    const account = await prisma.account.findFirst({
        where: { userId, providerId: 'spotify' }
    });

    if (!account) return null;

    // If token is still valid (with a 5-minute buffer), return it
    if (account.accessTokenExpiresAt && new Date(account.accessTokenExpiresAt).getTime() > Date.now() + 300000) {
        return account.accessToken;
    }

    // Otherwise, refresh it
    if (!account.refreshToken) return null;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: account.refreshToken,
                client_id: env.SPOTIFY_CLIENT_ID,
                client_secret: env.SPOTIFY_CLIENT_SECRET,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, expires_in, refresh_token: new_refresh_token } = response.data;

        await prisma.account.update({
            where: { id: account.id },
            data: {
                accessToken: access_token,
                refreshToken: new_refresh_token || account.refreshToken, // Spotify doesn't always return a new one
                accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
            }
        });

        return access_token;
    } catch (error: any) {
        console.error(`Failed to refresh Spotify token for user ${userId}:`, error.response?.data || error.message);
        return null;
    }
}
