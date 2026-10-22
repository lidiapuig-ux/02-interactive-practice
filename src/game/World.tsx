import { useMemo } from 'react'
import * as THREE from 'three'

export const BLOCK = 54 // building block size (m)
export const STREET = 18 // street width (m)
export const PITCH = BLOCK + STREET
export const GRID = 7 // GRID x GRID blocks

/** Centre of block (i,j), with the grid centred on the origin. */
export const blockCenter = (i: number, j: number) => ({
  x: (i - (GRID - 1) / 2) * PITCH,
  z: (j - (GRID - 1) / 2) * PITCH,
})

export const HALF_BLOCK = BLOCK / 2

/** Barcelona's Eixample: square blocks with chamfered (octagonal) corners. */
function chamferedShape(size: number, cut: number) {
  const h = size / 2
  const s = new THREE.Shape()
  s.moveTo(-h + cut, -h)
  s.lineTo(h - cut, -h)
  s.lineTo(h, -h + cut)
  s.lineTo(h, h - cut)
  s.lineTo(h - cut, h)
  s.lineTo(-h + cut, h)
  s.lineTo(-h, h - cut)
  s.lineTo(-h, -h + cut)
  s.closePath()
  return s
}

const PALETTE = ['#F6F7F9', '#EDF0F4', '#E4E9EF', '#F1F3F6', '#E9EDF2']

function rand(i: number, j: number, k = 0) {
  const x = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
  return x - Math.floor(x)
}

function Block({ i, j }: { i: number; j: number }) {
  const { x, z } = blockCenter(i, j)
  const h = 14 + Math.floor(rand(i, j) * 3) * 4 // 14, 18, 22 m — Eixample cornice height
  const color = PALETTE[Math.floor(rand(i, j, 1) * PALETTE.length)]
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(chamferedShape(BLOCK, 9), { depth: h, bevelEnabled: false })
    g.rotateX(-Math.PI / 2) // extrude upward
    return g
  }, [h])
  const cornice = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(chamferedShape(BLOCK + 1.2, 9.5), { depth: 0.9, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const courtyard = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(chamferedShape(BLOCK - 22, 5), { depth: 0.3, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} flatShading roughness={0.9} />
      </mesh>
      {/* roof terrace */}
      <mesh geometry={courtyard} position={[0, h, 0]}>
        <meshStandardMaterial color="#C9D8CE" roughness={1} />
      </mesh>
      {/* cornice band */}
      <mesh geometry={cornice} position={[0, h - 1.4, 0]}>
        <meshStandardMaterial color="#CBD3DC" flatShading />
      </mesh>
    </group>
  )
}

function Trees() {
  const spots = useMemo(() => {
    const out: [number, number][] = []
    for (let i = -1; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const x = (i - (GRID - 1) / 2) * PITCH + PITCH / 2
        const z = (j - (GRID - 1) / 2) * PITCH
        for (let k = -2; k <= 2; k++) {
          out.push([x + (k % 2 ? 7.8 : -7.8), z + k * 11])
          out.push([z + k * 11, x + (k % 2 ? 7.8 : -7.8)])
        }
      }
    return out
  }, [])
  return (
    <group>
      {spots.map(([x, z], n) => (
        <group key={n} position={[x, 0, z]}>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.18, 0.25, 2.6, 5]} />
            <meshStandardMaterial color="#8A9199" flatShading />
          </mesh>
          <mesh position={[0, 3.8, 0]} castShadow>
            <icosahedronGeometry args={[1.9, 0]} />
            <meshStandardMaterial color="#B4CBB9" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Dashed lane lines along every street. */
function LaneMarks() {
  const geo = useMemo(() => new THREE.PlaneGeometry(0.25, 3), [])
  const items: JSX.Element[] = []
  const extent = (GRID * PITCH) / 2 + PITCH / 2
  for (let s = 0; s < GRID + 1; s++) {
    const c = (s - GRID / 2) * PITCH
    for (let t = -extent; t < extent; t += 7) {
      items.push(
        <mesh key={`a${s}_${t}`} geometry={geo} rotation-x={-Math.PI / 2} position={[c, 0.03, t]}>
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>,
        <mesh key={`b${s}_${t}`} geometry={geo} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} position={[t, 0.03, c]}>
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>,
      )
    }
  }
  return <group>{items}</group>
}

export function World() {
  const blocks = useMemo(() => {
    const out: JSX.Element[] = []
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) out.push(<Block key={`${i}_${j}`} i={i} j={j} />)
    return out
  }, [])
  const size = GRID * PITCH + 400
  return (
    <group>
      {/* asphalt */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#3A3F47" roughness={1} />
      </mesh>
      <LaneMarks />
      {blocks}
      <Trees />
    </group>
  )
}

/** Axis-aligned collision against building blocks. Returns push-out vector or null. */
export function collideBlocks(x: number, z: number, r: number): { nx: number; nz: number } | null {
  const ci = Math.round(x / PITCH + (GRID - 1) / 2)
  const cj = Math.round(z / PITCH + (GRID - 1) / 2)
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++) {
      if (i < 0 || j < 0 || i >= GRID || j >= GRID) continue
      const { x: bx, z: bz } = blockCenter(i, j)
      const dx = x - bx
      const dz = z - bz
      const px = HALF_BLOCK + r - Math.abs(dx)
      const pz = HALF_BLOCK + r - Math.abs(dz)
      if (px > 0 && pz > 0) {
        // chamfer: ignore the very corner so cars can clip the cut
        if (Math.abs(dx) + Math.abs(dz) > BLOCK - 9 + r * 1.2) continue
        return px < pz ? { nx: Math.sign(dx) * px, nz: 0 } : { nx: 0, nz: Math.sign(dz) * pz }
      }
    }
  return null
}
