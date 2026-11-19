# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server (`ng serve`) on **port 4300** (overridden in `angular.json`, not the default 4200)
- `npm run build` — production build (SSR output in `dist/simplana/`); `npm run watch` for dev-config watch build
- `npm run lint` — `ng lint` (angular-eslint + eslint for css/json/markdown)
- `npm test` — `ng test` (Vitest via Angular builder, jsdom); single file: `ng test --include src/app/components/home/home.spec.ts`
- `npm run serve:ssr:simplana` — run the built SSR Express server

Prettier: 100 cols, single quotes, `angular` parser for `.html`.

## Architecture

Simplana is a Grafana-style dashboard app (early stage). Angular 22 with **standalone components** (no NgModules), SSR + client hydration:

- `src/main.ts` / `src/main.server.ts` / `src/server.ts` — browser bootstrap, server bootstrap, Express SSR entry (`outputMode: "server"`).
- `src/app/app.config.ts` (browser providers: router, hydration) and `app.config.server.ts` (server overrides).
- `src/app/app.routes.ts` — client routes (`''` → `/home`, `home`, `dashboards`). `app.routes.server.ts` sets `RenderMode.Prerender` for all (`**`) routes, so every new route is prerendered — avoid browser-only APIs (`window`, `localStorage`) at component init.
- Feature components live in `src/app/components/<name>/<name>.component.{ts,html,css,spec.ts}`; the root `App` shell (`app.html`) hosts the nav and `<router-outlet>`.

## Styling

Tailwind CSS v4 + DaisyUI v5, configured in CSS rather than a config file: `src/styles.css` imports `tailwindcss`, loads `@plugin "daisyui"`, and defines the custom `light` theme (oklch tokens) via `@plugin "daisyui/theme"`. Change colors/radii there; prefer DaisyUI/Tailwind classes in templates over per-component CSS. PostCSS is wired through `.postcssrc.json`.
