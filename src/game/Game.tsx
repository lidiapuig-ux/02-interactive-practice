import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { controls, telemetry } from '../store'
import { collideBlocks, World, PITCH } from './World'

const MAX_SPEED = 16 // m/s (~58 km/h): easy to control with hands
const ACCEL = 6
const BRAKE = 18
const WHEELBASE = 3.2
const CAR_R = 1.6

/** Keyboard fallback (arrows / WASD / space). */
const keys = new Set<string>()
function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())
      if (e.key === ' ') e.preventDefault()
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.clear()
    }
  }, [])
}

function Car() {
  const group = useRef<THREE.Group>(null!)
  const frontWheels = useRef<THREE.Mesh[]>([])
  const st = useRef({ x: PITCH / 2 + 4.5, z: 150, heading: 0, v: 0, steerAngle: 0 })
  useKeyboard()

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current

    let steer = controls.steer
    let thr = controls.throttle
    let brk = controls.brake
    const any = (...k: string[]) => k.some((x) => keys.has(x))
    if (any('arrowup', 'arrowleft', 'arrowright', 'arrowdown', 'w', 'a', 'd', 's', ' ')) {
      steer = (any('arrowright', 'd') ? 1 : 0) - (any('arrowleft', 'a') ? 1 : 0)
      thr = any('arrowup', 'w') ? 1 : 0
      brk = any(' ', 'arrowdown', 's') ? 1 : 0
    }

    if (brk > 0.05) s.v = Math.max(0, s.v - BRAKE * brk * dt)
    else s.v += ACCEL * thr * (1 - s.v / MAX_SPEED) * dt
    if (thr < 0.05) s.v = Math.max(0, s.v - 2.2 * dt) // coast down
    s.v = THREE.MathUtils.clamp(s.v, 0, MAX_SPEED)

    const lock = THREE.MathUtils.lerp(0.6, 0.3, Math.min(1, s.v / 14))
    s.steerAngle = THREE.MathUtils.lerp(s.steerAngle, steer * lock, 1 - Math.exp(-7 * dt))
    s.heading -= (s.v / WHEELBASE) * Math.tan(s.steerAngle) * dt

    s.x += -Math.sin(s.heading) * s.v * dt
    s.z += -Math.cos(s.heading) * s.v * dt

    const hit = collideBlocks(s.x, s.z, CAR_R)
    if (hit) {
      s.x += hit.nx
      s.z += hit.nz
      s.v *= 0.4
    }

    const g = group.current
    g.position.set(s.x, 0, s.z)
    g.rotation.y = s.heading
    frontWheels.current.forEach((w) => (w.rotation.y = -s.steerAngle * 0.9))
    telemetry.speedKmh = s.v * 3.6
    telemetry.x = s.x
    telemetry.z = s.z
    telemetry.heading = s.heading
  })

  const wheel = (i: number, x: number, z: number) => (
    <mesh key={i} position={[x, 0.35, z]} rotation-z={Math.PI / 2} ref={(m) => m && i < 2 && (frontWheels.current[i] = m)}>
      <cylinderGeometry args={[0.35, 0.35, 0.3, 14]} />
      <meshStandardMaterial color="#1D2026" />
    </mesh>
  )
  return (
    <group ref={group}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.8, 0.7, 4.0]} />
        <meshStandardMaterial color="#2B5BFF" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.2, 0.2]} castShadow>
        <boxGeometry args={[1.5, 0.55, 2.0]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.35} />
      </mesh>
      {[wheel(0, -0.95, -1.3), wheel(1, 0.95, -1.3), wheel(2, -0.95, 1.3), wheel(3, 0.95, 1.3)]}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.85, 2.02]}>
          <boxGeometry args={[0.4, 0.14, 0.05]} />
          <meshStandardMaterial color="#FF4D5A" emissive="#FF4D5A" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Sun() {
  const ref = useRef<THREE.DirectionalLight>(null!)
  useFrame(() => {
    const l = ref.current
    l.position.set(telemetry.x + 110, 150, telemetry.z + 70)
    l.target.position.set(telemetry.x, 0, telemetry.z)
    l.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={ref}
      intensity={2}
      color="#FFFFFF"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-70}
      shadow-camera-right={70}
      shadow-camera-top={70}
      shadow-camera-bottom={-70}
      shadow-camera-far={500}
    />
  )
}

function FollowCam() {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3(0, 8, 20))
  const look = useRef(new THREE.Vector3())
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { x, z, heading, speedKmh } = telemetry
    const back = 9 + speedKmh * 0.04
    const target = new THREE.Vector3(x + Math.sin(heading) * back, 4.8, z + Math.cos(heading) * back)
    pos.current.lerp(target, 1 - Math.exp(-5 * dt))
    camera.position.copy(pos.current)
    look.current.set(x - Math.sin(heading) * 8, 1.4, z - Math.cos(heading) * 8)
    camera.lookAt(look.current)
  })
  return null
}

export function Game() {
  return (
    <Canvas flat shadows dpr={[1, 1.75]} camera={{ fov: 60, near: 0.5, far: 900, position: [0, 6, 22] }}>
      <color attach="background" args={['#E3EAF1']} />
      <fog attach="fog" args={['#E3EAF1', 80, 380]} />
      <hemisphereLight args={['#FFFFFF', '#AEBBC9', 1.0]} />
      <Sun />
      <World />
      <Car />
      <FollowCam />
    </Canvas>
  )
}
