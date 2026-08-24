# Development-Only Theme Fixture Gallery

Run `pnpm theme-preview` to start the static development-only gallery on port `8082` (or set `THEME_PREVIEW_PORT`). It is served by `scripts/serve-theme-preview.mjs`, not Expo Router’s `app/` tree, so it is excluded from the application’s production route tree and server build.

Every gallery card has a direct `/fixture/{01..14}` detail URL with previous/next/gallery navigation. The runner examines the intended production module boundary but does not import a component unless it can be isolated without product router, auth, DB, network, payment, location, or integration dependencies. When that cannot be done safely, the detail is explicitly `BLOCKED_COMPONENT_NOT_ISOLATABLE`; it never draws a look-alike substitute. It is not route E2E evidence.

The gallery uses `prefers-color-scheme` CSS, so Safari applies the current system Dark/Light scheme both on live changes and refreshes. Each fixture begins in `WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS` until the owner supplies physical evidence.
