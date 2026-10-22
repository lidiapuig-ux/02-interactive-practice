import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Four actions, nothing else:
 *  FORWARD  close your fists (hands on an imaginary wheel)
 *  LEFT     tilt the wheel left   (your left hand rises, right hand drops)
 *  RIGHT    tilt the wheel right
 *  BRAKE    open one palm toward the camera (always wins)
 */
export type Pose = 'open' | 'fist' | 'other'

const d = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y)

// [fingertip, knuckle (MCP)]
const FINGERS: [number, number][] = [
  [8, 5],
  [12, 9],
  [16, 13],
  [20, 17],
]

export function extendedFingers(lm: NormalizedLandmark[]): number {
  const w = lm[0]
  return FINGERS.filter(([tip, mcp]) => d(lm[tip], w) > d(lm[mcp], w) * 1.45).length
}

export function classify(lm: NormalizedLandmark[]): Pose {
  const n = extendedFingers(lm)
  if (n >= 4) return 'open'
  if (n <= 1) return 'fist'
  return 'other'
}

/**
 * Wheel angle in radians from the two wrists. Raw webcam frames are not mirrored, so the player's
 * right hand has the smaller x. Positive = clockwise = turn right.
 */
export function wheelAngle(hands: NormalizedLandmark[][]): number | null {
  if (hands.length < 2) return null
  const [r, l] = [...hands].sort((a, b) => a[0].x - b[0].x)
  return Math.atan2(r[0].y - l[0].y, Math.max(0.05, l[0].x - r[0].x))
}
