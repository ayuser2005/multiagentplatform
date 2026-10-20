# Nexora AI — Frontend

The React single-page application for **Nexora AI**, served as static assets by Nginx in production and by the Vite dev server in development.

```bash
npm install
cp .env.example .env   # add your Firebase web config
npm run dev            # http://localhost:5173
```

The Vite dev server proxies `/api` to the API Gateway (see `vite.config.js`). Override the target with `VITE_DEV_API_TARGET` if the gateway is not on `http://localhost:8000`.

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with hot module reloading |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | ESLint |

Architecture notes, the full API reference and the deployment guide live in the [root README](../README.md).
