FROM node:20-alpine

# Install necessary system dependencies
RUN apk add --no-cache libc6-compat openssl

# Install turborepo globally
RUN npm install -g turbo

WORKDIR /app

# Copy root configuration files
COPY package.json package-lock.json turbo.json ./

# Copy all package.json files for dependencies
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

# Install dependencies (ignoring scripts as we'll run prisma later)
RUN npm install --include=dev

# Copy the rest of the source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the project
# Note: NEXT_PUBLIC_API_URL should be available at build time for Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Expose ports for Next.js (3000) and API (3001)
EXPOSE 3000 3001

# Start the application
# We use db push to ensure the schema is updated on start
CMD ["sh", "-c", "npx prisma db push --schema=packages/database/prisma/schema.prisma && npm run start"]
