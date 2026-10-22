import { create } from 'zustand'

/** Per-frame control signal: written by the hand tracker (or keyboard), read by the car. */
export const controls = { steer: 0, throttle: 0, brake: 0 }

/** Car telemetry, written by the car every frame. */
export const telemetry = { speedKmh: 0, x: 0, z: 0, heading: 0 }

export type Screen = 'landing' | 'camera' | 'game'
export type TrackingStatus = 'off' | 'loading' | 'no-hands' | 'tracking' | 'error'
export type Action = 'forward' | 'left' | 'right' | 'brake'

interface State {
  screen: Screen
  setScreen: (s: Screen) => void
  tracking: TrackingStatus
  setTracking: (t: TrackingStatus) => void
  error: string
  setError: (e: string) => void
  /** Which of the four actions are currently recognised (for the UI). */
  active: Record<Action, boolean>
  setActive: (a: Record<Action, boolean>) => void
}

const none = { forward: false, left: false, right: false, brake: false }

export const useGame = create<State>((set) => ({
  screen: 'landing',
  setScreen: (screen) => set({ screen }),
  tracking: 'off',
  setTracking: (tracking) => set((s) => (s.tracking === tracking ? s : { tracking })),
  error: '',
  setError: (error) => set({ error }),
  active: none,
  setActive: (a) =>
    set((s) =>
      s.active.forward === a.forward && s.active.left === a.left && s.active.right === a.right && s.active.brake === a.brake
        ? s
        : { active: a },
    ),
}))
