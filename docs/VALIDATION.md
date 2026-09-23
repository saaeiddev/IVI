# IVI validation

This repository verifies deterministic vehicle simulations and performs a strict TypeScript production build via GitHub Actions. Successful CI does not by itself confirm the public Pages URL. Deployment is handled by `.github/workflows/pages.yml` when changes merge into `main`.

Production smoke tests: car render, orbit, touch gestures, component selection, synchronized telemetry, engine and brake controls, EN/FA, diagnostics, phone layout, and a live HTTP 200 from the Pages URL.
