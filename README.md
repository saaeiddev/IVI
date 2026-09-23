# IVI — Interactive Vehicle Digital Twin

A browser-based **automotive visualization and deterministic telemetry simulator**, built with React, TypeScript, Vite, Three.js / React Three Fiber and Zustand. It is a software demonstration, **not** a real vehicle or OBD connection. All sensor readings and fault codes are simulated.

## Quick start

```bash
npm install
npm run assets      # downloads + validates the licensed premium GLB (required)
npm run dev
npm test
npm run build
npm run preview
```

Open the local Vite URL. A missing model produces an explicit error; the project **never** substitutes a primitive placeholder. The engine model is a single static mesh in the licensed asset; internal pistons and crankshaft, and the suspension internals, are **not** falsely animated. The complete licensed asset includes separate opening panels, detailed brake meshes, interior and actual headlight/taillight materials. Click the car, the hotspot labels, or use navigation to inspect those supported parts. Use mouse/touch orbit and pinch zoom.

## Architecture

- `src/simulation.ts`: centralized deterministic simulation state, dynamics and scenario overrides.
- `src/diagnostics.ts`: reproducible rule-based faults, severity and maintenance advice (not generative AI).
- `src/VehicleScene.tsx`: licensed GLB loader, mesh-level picking, real panel/wheel/light animations and camera presets.
- `src/translations.ts`: EN/FA UI, descriptive and diagnostic translations.
- `src/App.tsx`: telemetry, simulation controls, diagnostics, mobile UI and inspector.

## Third-party 3D asset and license

**Car Concept** — © 2024 Darmstadt Graphics Group GmbH; 3D model and textures by **Eric Chadwick**. **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/ . Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept . The model includes Khronos/3D Commerce logos; those **trademarks are not granted by the model license** and remain owned by their respective holders. IVI is not affiliated with, sponsored by, or endorsed by the Khronos Group or any automaker. The original model is downloaded intact at build time to retain its UVs, textures, hierarchy and licensed attribution.

## Deployment

The GitHub Actions workflow runs `npm install`, fetches + validates the full-size CC-BY licensed GLB, tests, type-checks and builds, then publishes `dist` to GitHub Pages. Vite's base path is `/IVI/`. Under repository **Settings → Pages**, choose **GitHub Actions** as Build and deployment source if needed. Production target: https://saaeiddev.github.io/IVI/ . Page deployment only counts as complete once the Actions run succeeds and the live URL responds.

## Scope and fidelity

Door, hood and hatch transforms use the supplied GLB pivots, while wheels, steering wheel, lighting materials and detailed brake-disc/pad meshes are model-backed. All readings and diagnostic codes are deterministic **simulations**, not OEM specifications. The asset does not provide independent piston, crankshaft, hydraulic, charging-system or suspension subassemblies, so those are explained through synchronized telemetry and clearly marked as non-visualized. No paid or unlicensed models, fake AI diagnosis or static screenshot substitutes are used.


## Interactive engine bay (reference CAD assembly)

Selecting **Engine**, the 3D engine hotspot, or the **Engine bay** camera preset automatically raises the original model's hood using its existing hinge. The camera animates into the bay and a separate, detailed reference engine assembly loads lazily from `public/assets/engine.glb`. The car's minimal default engine block remains visible while the independent model loads; the detailed assembly replaces it once ready. Closing the hood hides the add-on engine and restores the original block. The reference model is centered and fitted to measured bounds, and its loaded state is exposed in the UI for acceptance testing.

**Source and provenance:** `2CylinderEngine.glb` from Khronos [glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0/2CylinderEngine); original JT-to-COLLADA conversion courtesy **Okino Computer Graphics / Okino Polytrans**. This is an educational, generic **two-cylinder assembly**, *not* a genuine Concept GT production powertrain and not a claim of independent piston simulation. The source README does **not** state a precise reuse license; users intending commercial redistribution should obtain permission or replace the engine GLB with an explicitly licensed alternative. The separate car asset's CC BY 4.0 attribution remains unchanged.
