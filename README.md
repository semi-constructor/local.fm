# local.fm

A self-hosted music statistics dashboard that brings scrobbling back to your own hardware. Track your listening habits on Spotify with detailed analytics, daily summaries, and yearly recaps.

## Features

- **Spotify Realtime Sync**: Automatically track your listening habits from Spotify.
- **Historical Data**: Import your entire Spotify streaming history (JSON exports).
- **In-Depth Analytics**: View top tracks, artists, and albums over various timeframes.
- **Public Stats Sharing**: Share your listening statistics with a public link.
- **Visual Insights**: Interactive heatmaps, habit distributions, and genre breakdowns.
- **Privacy First**: All data is stored in your own PostgreSQL database.
- **Modern Interface**: Clean, responsive dashboard with dark mode and customizable accent colors.
- **Localized**: Support for English and German.

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, Recharts.
- **Backend**: Node.js, Express, BullMQ (for background processing).
- **Database**: PostgreSQL, Prisma ORM.
- **Cache/Queue**: Redis.
- **Authentication**: BetterAuth.

## Getting Started

### Prerequisites

- Node.js 18 or higher.
- PostgreSQL database.
- Redis server.
- Spotify Developer Application (for Spotify sync).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/semi-constructor/local.fm.git
   cd local.fm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your credentials.

4. Setup the database:
   ```bash
   npx turbo db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Development

The project is managed as a monorepo using Turbo:

- `apps/web`: Next.js frontend application.
- `apps/api`: Express backend server and workers.
- `packages/database`: Prisma schema and client.
- `packages/types`: Shared TypeScript definitions.

## License

Distributed under the MIT License. See `LICENSE` for more information.
