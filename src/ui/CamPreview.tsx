import { useEffect, useRef } from 'react'
import { tracker } from '../vision/handTracker'
import { useGame } from '../store'

const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
]

/** Mirrored live camera with the detected hands drawn on top. Pixels never leave the browser. */
export function CamPreview({ className = '', width = 640, height = 480 }: { className?: string; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tracking = useGame((s) => s.tracking)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = ref.current
      const v = tracker.video
      if (!c || v.readyState < 2) return
      const ctx = c.getContext('2d')!
      const W = c.width
      const H = c.height
      ctx.save()
      ctx.translate(W, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0, W, H)
      ctx.fillStyle = 'rgba(18,21,26,0.18)'
      ctx.fillRect(0, 0, W, H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const wrists: { x: number; y: number }[] = []
      for (const lm of tracker.hands) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = Math.max(2, W / 200)
        ctx.beginPath()
        for (const [a, b] of BONES) {
          ctx.moveTo(lm[a].x * W, lm[a].y * H)
          ctx.lineTo(lm[b].x * W, lm[b].y * H)
        }
        ctx.stroke()
        ctx.fillStyle = '#2B5BFF'
        for (const p of lm) {
          ctx.beginPath()
          ctx.arc(p.x * W, p.y * H, Math.max(2.5, W / 190), 0, 7)
          ctx.fill()
        }
        wrists.push({ x: lm[0].x * W, y: lm[0].y * H })
      }
      if (wrists.length >= 2) {
        ctx.strokeStyle = '#2B5BFF'
        ctx.lineWidth = Math.max(3, W / 140)
        ctx.beginPath()
        ctx.moveTo(wrists[0].x, wrists[0].y)
        ctx.lineTo(wrists[1].x, wrists[1].y)
        ctx.stroke()
      }
      ctx.restore()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  const label =
    tracking === 'tracking' ? 'Hands detected' : tracking === 'no-hands' ? 'Show your hands' : tracking === 'loading' ? 'Loading…' : tracking === 'error' ? 'Camera error' : 'Camera off'
  const dot = tracking === 'tracking' ? 'bg-emerald-500' : tracking === 'error' ? 'bg-red-500' : 'bg-white/70'
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink ${className}`}>
      <canvas ref={ref} width={width} height={height} className="block h-full w-full object-cover" />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
    </div>
  )
}
