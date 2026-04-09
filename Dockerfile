# STAGE 1: Builder
FROM node:20-alpine AS builder

# Install necessary system dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install turborepo globally
RUN npm install -g turbo

# Copy root configuration files
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the project
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# STAGE 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["sh", "-c", "npx prisma db push --schema=packages/database/prisma/schema.prisma && npm run start"]
