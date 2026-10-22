# BARCELONA HAND-DRIVEN
Drive through a stylised Eixample with your hands. React, TypeScript, Vite, React Three Fiber, Drei, MediaPipe Hand Landmarker, Tailwind, Zustand.
The camera is processed in your browser. Nothing is recorded or uploaded.

## Run
    npm install
    npm run dev        # http://localhost:5173 (localhost allows the webcam)

The first start downloads the hand model (about 7 MB) from Google. For offline use, save it as `public/models/hand_landmarker.task` (see the note there).
Use Chrome or Edge on a laptop with a webcam.

## Four controls
| Action | Hands | Keyboard |
|---|---|---|
| Forward | Close both fists, as if gripping a wheel | W / ↑ |
| Left | Tilt your hands left (right hand rises) | A / ← |
| Right | Tilt your hands right (right hand drops) | D / → |
| Brake | Open one palm toward the camera (always wins) | Space / S |

If the camera loses your hands, the car coasts and brakes gently.

## Publish on GitHub Pages (HTTPS, the camera works there)
1. Create an empty public repo and push this project to `main`.
2. Settings > Pages > Source: **GitHub Actions**.
3. `.github/workflows/deploy.yml` builds and deploys on every push: `https://<user>.github.io/<repo>/`.

## Structure
`src/vision` hand tracking and gestures · `src/game` city, car, camera · `src/ui` screens and HUD · `src/store.ts` state
