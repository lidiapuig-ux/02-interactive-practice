import { FilesetResolver, HandLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { controls, useGame } from '../store'
import { classify, wheelAngle, type Pose } from './gestures'

const BASE = import.meta.env.BASE_URL
const WASM = `${BASE}wasm`
const MODEL_LOCAL = `${BASE}models/hand_landmarker.task`
const MODEL_CDN =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const DEAD = 0.12 // rad (~7 degrees) of tilt ignored
const FULL = 0.55 // rad (~31 degrees) = full lock
const TURN_ON = 0.22 // steer value that lights LEFT / RIGHT in the UI

export class HandTracker {
  video: HTMLVideoElement
  hands: NormalizedLandmark[][] = []
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private raf = 0
  private running = false
  private lastTime = -1
  private starting = false

  private steer = 0
  private throttle = 0
  private brake = 0
  private brakeHold = 0
  private lastSeen = 0

  constructor() {
    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
  }

  async start() {
    if (this.running || this.starting) return
    this.starting = true
    const g = useGame.getState()
    g.setTracking('loading')
    g.setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access (use https or localhost).')
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      this.video.srcObject = this.stream
      await this.video.play()

      const fileset = await FilesetResolver.forVisionTasks(WASM)
      const make = (modelAssetPath: string, delegate: 'GPU' | 'CPU') =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        })
      const attempts: [string, 'GPU' | 'CPU'][] = [
        [MODEL_LOCAL, 'GPU'],
        [MODEL_CDN, 'GPU'],
        [MODEL_CDN, 'CPU'],
      ]
      let lastErr: unknown
      for (const [url, delegate] of attempts) {
        try {
          this.landmarker = await make(url, delegate)
          break
        } catch (e) {
          lastErr = e
        }
      }
      if (!this.landmarker) {
        console.error(lastErr)
        throw new Error('Could not download the hand-tracking model. Check your internet connection and try again.')
      }
      this.running = true
      g.setTracking('no-hands')
      this.loop()
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow the camera in your browser and try again.'
          : e instanceof Error
            ? e.message
            : String(e)
      g.setTracking('error')
      g.setError(msg)
      this.stream?.getTracks().forEach((t) => t.stop())
      this.stream = null
    } finally {
      this.starting = false
    }
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.landmarker?.close()
    this.landmarker = null
    this.hands = []
    controls.steer = controls.throttle = controls.brake = 0
    useGame.getState().setTracking('off')
  }

  private loop = () => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const v = this.video
    if (!this.landmarker || v.readyState < 2 || v.currentTime === this.lastTime) return
    this.lastTime = v.currentTime
    const res = this.landmarker.detectForVideo(v, performance.now())
    this.hands = res.landmarks
    this.update(performance.now())
  }

  private update(now: number) {
    const g = useGame.getState()
    const hands = this.hands
    g.setTracking(hands.length ? 'tracking' : 'no-hands')
    if (hands.length) this.lastSeen = now

    const poses: Pose[] = hands.map(classify)
    const anyOpen = poses.includes('open')
    const fists = poses.filter((p) => p === 'fist').length

    // BRAKE: any open palm, held ~3 frames so a stray detection does not stop the car.
    this.brakeHold = anyOpen ? Math.min(3, this.brakeHold + 1) : Math.max(0, this.brakeHold - 1)
    const braking = this.brakeHold >= 3

    // FORWARD: fists closed and no open palm.
    const forward = !braking && !anyOpen && fists >= 1

    // LEFT / RIGHT: tilt of the line between both wrists (needs two hands).
    const angle = wheelAngle(hands)
    let steerTarget = 0
    if (angle !== null) {
      const a = Math.abs(angle)
      steerTarget = a < DEAD ? 0 : Math.sign(angle) * Math.min(1, (a - DEAD) / (FULL - DEAD))
    }
    this.steer = lerp(this.steer, steerTarget, 0.3)

    // Lost hands for a moment: coast, then brake gently (fail-safe).
    const lost = hands.length === 0 && now - this.lastSeen > 400
    this.throttle = lerp(this.throttle, forward ? 1 : 0, forward ? 0.12 : 0.25)
    this.brake = lerp(this.brake, braking ? 1 : lost ? 0.4 : 0, 0.3)

    controls.steer = this.steer
    controls.throttle = braking ? 0 : this.throttle
    controls.brake = this.brake

    g.setActive({
      forward,
      brake: braking,
      left: this.steer < -TURN_ON,
      right: this.steer > TURN_ON,
    })
  }
}

export const tracker = new HandTracker()
