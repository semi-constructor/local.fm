import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "../../../api/src/auth";

const isServer = typeof window === 'undefined';
const defaultUrl = isServer ? 'http://127.0.0.1:3001' : `${window.location.protocol}//${window.location.hostname}:3001`;

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || defaultUrl,
    plugins: [
        inferAdditionalFields<typeof auth>()
    ]
});
