import jwt from 'jsonwebtoken';

export function generateAppleDeveloperToken() {
    const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY || '';
    const teamId = process.env.APPLE_TEAM_ID || '';
    const keyId = process.env.APPLE_KEY_ID || '';

    if (!privateKey || !teamId || !keyId) {
        throw new Error('Apple Music credentials missing');
    }

    const token = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '180d', // Tokens can last up to 6 months
        issuer: teamId,
        header: {
            alg: 'ES256',
            kid: keyId,
        },
    });

    return token;
}
