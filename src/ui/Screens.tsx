import { useEffect, useState } from 'react'
import { telemetry, useGame } from '../store'
import { tracker } from '../vision/handTracker'
import { CamPreview } from './CamPreview'
import { Actions } from './Actions'

const Button = ({ children, onClick, disabled, ghost }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ghost?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-full px-7 py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
      ghost ? 'border border-line bg-white text-ink hover:border-ink' : 'bg-ink text-white hover:bg-accent'
    }`}
  >
    {children}
  </button>
)

export function Landing() {
  const setScreen = useGame((s) => s.setScreen)
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-12">
      <div className="flex items-center justify-between text-xs font-semibold text-mute">
        <span>Master in Applied AI for Arts and Design</span>
        <span>Barcelona</span>
      </div>
      <div className="max-w-3xl">
        <h1 className="text-[clamp(2.6rem,8vw,6.5rem)] font-extrabold leading-[0.95] tracking-tight">
          Barcelona
          <br />
          <span className="text-accent">Hand-Driven</span>
        </h1>
        <p className="mt-5 text-lg text-mute">Your hands are the steering wheel.</p>
        <div className="mt-8">
          <Button
            onClick={() => {
              setScreen('camera')
              tracker.start()
            }}
          >
            Start with camera
          </Button>
        </div>
      </div>
      <p className="text-xs text-mute">The camera is processed on your device. Nothing is recorded or uploaded.</p>
    </div>
  )
}

export function CameraScreen() {
  const tracking = useGame((s) => s.tracking)
  const error = useGame((s) => s.error)
  const setScreen = useGame((s) => s.setScreen)
  const ready = tracking === 'tracking' || tracking === 'no-hands'

  return (
    <div className="absolute inset-0 overflow-auto">
      <div className="mx-auto grid min-h-full w-full max-w-5xl content-center gap-8 p-6 md:grid-cols-[1.15fr_1fr] md:p-10">
        <CamPreview className="aspect-[4/3] w-full" />
        <div className="flex flex-col justify-center gap-5">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Try your controls</h2>
            <p className="mt-2 text-sm text-mute">
              Hold both hands up as if gripping a wheel. Each control lights up when the camera sees it.
            </p>
          </div>
          <Actions />
          {tracking === 'loading' && <p className="text-sm text-mute">Starting the camera and loading the hand model…</p>}
          {tracking === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
              <button className="ml-2 font-bold underline" onClick={() => tracker.start()}>
                Try again
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setScreen('game')} disabled={!ready}>
              Drive
            </Button>
            <Button ghost onClick={() => setScreen('game')}>
              Use keyboard instead
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hud() {
  const setScreen = useGame((s) => s.setScreen)
  const [kmh, setKmh] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setKmh(Math.round(telemetry.speedKmh)), 80)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 flex items-center gap-3">
        <button
          onClick={() => setScreen('camera')}
          className="pointer-events-auto rounded-full bg-white/90 px-4 py-2 text-xs font-bold shadow-sm backdrop-blur hover:bg-white"
        >
          ← Back
        </button>
      </div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-2xl bg-white/90 px-6 py-3 text-center shadow-sm backdrop-blur">
        <div className="text-4xl font-extrabold leading-none tabular-nums">{kmh}</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-mute">km/h</div>
      </div>
      <div className="absolute bottom-5 left-5 w-[260px] space-y-2">
        <CamPreview className="h-[150px] w-full shadow-lg" width={320} height={240} />
        <Actions compact />
      </div>
    </div>
  )
}
