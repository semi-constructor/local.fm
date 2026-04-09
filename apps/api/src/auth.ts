import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "database";
import { env, isProduction } from "./env";

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    advanced: {
        useSecureCookies: isProduction,
    },
    trustedOrigins: [
        env.FRONTEND_URL,
    ],
    user: {
        additionalFields: {
            birthday: {
                type: "date",
                required: false,
                defaultValue: null,
                input: true,
            },
            accentColor: {
                type: "string",
                required: false,
                defaultValue: "violet",
                input: true,
            }
        }
    },
    socialProviders: {
        spotify: {
            clientId: env.SPOTIFY_CLIENT_ID,
            clientSecret: env.SPOTIFY_CLIENT_SECRET,
            scope: ["user-read-recently-played", "user-top-read", "user-read-private", "user-read-email", "user-read-currently-playing", "user-read-playback-state"]
        },
    },
});

