# local.fm

A self-hosted music statistics dashboard that brings scrobbling back to your own hardware. Track your listening habits on Spotify with detailed analytics, daily summaries, and yearly recaps.

## Features

- Spotify Realtime Sync: Automatically track your listening habits from Spotify.
- Historical Data: Import your entire Spotify streaming history (JSON exports).
- In-Depth Analytics: View top tracks, artists, and albums over various timeframes.
- Public Stats Sharing: Share your listening statistics with a public link.
- Visual Insights: Interactive heatmaps, habit distributions, and genre breakdowns.
- Privacy First: All data is stored in your own PostgreSQL database.
- Modern Interface: Clean, responsive dashboard with dark mode and customizable accent colors.
- Localized: Full support for English and German.

## Tech Stack & Credits

This project is built using modern web technologies and frameworks:

- Frontend: Next.js (React), Tailwind CSS, Framer Motion, Recharts.
- Backend: Node.js (Express), BullMQ, Redis.
- Database: PostgreSQL, Prisma ORM.
- Authentication: BetterAuth.
- Monorepo Management: Turborepo.
- Icons: Lucide React.
- Fonts: Google Fonts (Geist, Archivo Black, Crimson Pro).

Special thanks to the open-source communities behind these projects.

## Getting Started

### Prerequisites

- Docker and Docker Compose (Recommended)
- OR Node.js 20+, PostgreSQL, and Redis.

### Installation via Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/semi-constructor/local.fm.git
   cd local.fm
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your Spotify credentials.
   ```bash
   cp .env.example .env
   ```

3. Launch the stack:
   ```bash
   docker-compose up -d
   ```

4. Access the dashboard:
   The web interface is available at `http://localhost:3000`.

### Manual Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`.

3. Setup the database schema:
   ```bash
   npx prisma db push --schema=packages/database/prisma/schema.prisma
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development

The project is structured as a monorepo:

- apps/web: Next.js frontend.
- apps/api: Express backend server and background workers.
- packages/database: Shared Prisma schema and database client.
- packages/types: Shared TypeScript interfaces.

## License

Distributed under the MIT License. See `LICENSE` for more information.
