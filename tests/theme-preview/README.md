# Development-Only Theme Fixture Gallery

Run `pnpm theme-preview` to start the static development-only gallery on port `8082` (or set `THEME_PREVIEW_PORT`). It is served from `tests/theme-preview/static`, not Expo Router’s `app/` tree, so it is excluded from the application’s production route tree and server build.

The gallery contains only static synthetic fixture metadata and HTML/CSS. It does not import product screen modules, tRPC, auth hooks, database modules, payment modules, notification modules, or network clients. It is a component fixture aid, not route E2E evidence.

The gallery uses `prefers-color-scheme` CSS, so Safari applies the current system Dark/Light scheme both on live changes and refreshes. Each fixture begins in `WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS` until the owner supplies physical evidence.
