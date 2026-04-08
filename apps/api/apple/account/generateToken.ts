import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

interface AppleTokenConfig {
    keyPath: string; //path to the .p8 file
    keyId: string; //the Key ID from Apple Developer account
    teamId: string; //the Team ID from Apple Developer account
    expiresIn?: number; //seconds
}

//generate Token (signed with JWT) for Apple Sign In
export function generateDeveloperToken(config: AppleTokenConfig): string {
    const privateKey = fs.readFileSync(path.resolve(config.keyPath), 'utf8');

    return jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: config.expiresIn,
        issuer: config.teamId,
        header: {
            alg: 'ES256',
            kid: config.keyId,
        },
    });
}

//generate Authentication URL
export function generateAuthLink(
  developerToken: string,
  options: {
    appName: string;
    appBuild?: string;
    redirectUri?: string;
  }
): string {
  const params = new URLSearchParams({
    developerToken,
    app: JSON.stringify({
      name: options.appName,
      build: options.appBuild ?? '1.0.0',
    }),
    ...(options.redirectUri && { redirect_uri: options.redirectUri }),
  });

  return `https://authorize.music.apple.com/woa?${params.toString()}`;
}