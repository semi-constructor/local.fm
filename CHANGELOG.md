# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub issue templates (Bug Report, Feature Request).
- Pull Request template.
- SECURITY.md, CONTRIBUTING.md, and CODE_OF_CONDUCT.md.
- Dependabot configuration.
- Stale issue workflow.
- **New Public Profile Endpoint**: Added `/api/stats/public/:publicId/profile` for comprehensive public data access.
- **New Public API Alias**: Added `/api/public` for easier access to public stats.
- **Theme Utility**: Centralized theme and font logic in `apps/web/src/lib/theme.ts`.
- **Dashboard Preferences**: Added visibility toggle for the "Recap" section in the Dashboard settings.
- **Improved Settings Persistence**: Settings like "Dev Mode" and dashboard preferences now correctly save and persist across page reloads.

### Fixed
- **Spotify JSON Import**: Support for both Standard ("Account Data") and Extended Spotify history formats.
- **Font Application**: Resolved font loading issues by moving CSS variables to the root `html` tag.
- **Theme Reference Error**: Fixed `applyAccentColor is not defined` crash in `DashboardShell.tsx`.
- **Public Profile Access**: Fixed `authMiddleware` blocking public stats routes.
- **Root Layout Compilation**: Fixed a crash in `apps/web/src/app/layout.tsx` by making `RootLayout` an `async` function and adding missing imports for `headers` and `authClient`.
- **Global Theme Application**: Resolved an issue where dark mode hardcoded primary colors would override user-selected accent colors.
- **Theme State Management**: Fixed a bug where theme changes wouldn't always apply immediately after a session update.
- Preference Storage Bug: Fixed a bug where dashboard and recap preferences were incorrectly stored as JSON objects instead of strings, causing them to fail to load after a reload.
- **Docker Image Optimization**: Optimized `Dockerfile` with multi-stage builds and added `.dockerignore` to reduce image size and improve security.
- **Documentation Overhaul**: Completely rewrote `README.md` for better clarity, including Docker setup instructions and technology credits.
- **CI Build Fix**: Resolved `TS18004` error in `spotifyParser.ts` by fixing shorthand property mapping for `spotifyId`.

### Changed
- Improved project repository infrastructure.
- **Enhanced Public View**: Updated `PublicStatsView.tsx` with top tracks, artists, and recent history.
- **Global Theme Support**: Accent color and font family are now applied globally (including text selection and public profiles).
- **Public Profile Layout**: Modernized the public profile with a richer, more interactive design.
