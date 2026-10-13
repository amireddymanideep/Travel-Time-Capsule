# Travel Time Capsule

A React and Vite frontend for creating travel memory capsules, revisiting trip
timelines, and sharing photos and notes.

## Local development

```sh
npm ci
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:8080`.
Start the backend separately for sign-in, capsule, and upload features.

## GitHub Pages deployment

The `Deploy to GitHub Pages` workflow builds the frontend and deploys it when
changes are pushed to `main`. The Vite base path is configured for this
repository, so the site is published at:

<https://amireddymanideep.github.io/Travel-Time-Capsule/>

In the repository's **Settings → Pages**, set the build and deployment source
to **GitHub Actions**. The first successful workflow run then publishes the
site.

GitHub Pages hosts only the frontend. To enable sign-in and capsule features,
deploy the backend separately, configure the repository variable
`VITE_API_BASE_URL` to its public base URL (without a trailing slash), and
allow the Pages site origin in the backend's CORS configuration. Leave the
variable unset when no public API is available.
