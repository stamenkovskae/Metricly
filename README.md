# Simplana

Prometheus charts without writing PromQL. Snap together plain-language blocks ("Requests, per minute, by endpoint") and get a live chart. The generated PromQL stays one click away so you can learn it.

See [`PRODUCT.md`](PRODUCT.md) for users, purpose and design principles.

## Stack

Angular 22 (standalone components, SSR + hydration), Tailwind CSS v4 + DaisyUI v5, Chart.js via ng2-charts, Express for the SSR server and the `/api/query` proxy. Tests run on Vitest.

## Getting started

Requires Node 20+ and a reachable Prometheus.

```bash
npm install
npm start        # http://localhost:4300
```

The dev server runs on port **4300**, not the Angular default 4200.

## Configuration

| Variable | Purpose |
|---|---|
| `PROMETHEUS_URL` | Prometheus base URL that `POST /api/query` forwards queries to (see `src/server.ts`). |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build (SSR output in `dist/simplana/`) |
| `npm run watch` | Dev-configuration watch build |
| `npm run serve:ssr:simplana` | Run the built SSR Express server |
| `npm test` | Unit tests (Vitest, jsdom) |
| `npm run lint` | angular-eslint + eslint for CSS, JSON and Markdown |

## Project layout

```
src/
  server.ts            Express SSR entry and /api/query proxy
  app/
    components/        builder, chart, dashboards, home, suggestions
    query/             block model → PromQL compiler, plain-language descriptions, API client
    chart/             chart series mapping
    dashboards/        saved dashboard store
```

All routes are prerendered, so avoid browser-only APIs (`window`, `localStorage`) at component init.
