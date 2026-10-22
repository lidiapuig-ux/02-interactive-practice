import { useGame, type Action } from '../store'

export const ACTIONS: { id: Action; label: string; hint: string; glyph: string }[] = [
  { id: 'forward', label: 'Forward', hint: 'Close both fists', glyph: '↑' },
  { id: 'left', label: 'Left', hint: 'Tilt your hands left', glyph: '←' },
  { id: 'right', label: 'Right', hint: 'Tilt your hands right', glyph: '→' },
  { id: 'brake', label: 'Brake', hint: 'Open one palm', glyph: '■' },
]

/** The four controls. Each lights up the moment the camera recognises it. */
export function Actions({ compact = false }: { compact?: boolean }) {
  const active = useGame((s) => s.active)
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2'}`}>
      {ACTIONS.map((a) => {
        const on = active[a.id]
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 rounded-xl border transition-colors duration-150 ${compact ? 'flex-col px-2 py-2 text-center' : 'px-4 py-3'} ${
              on ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink'
            }`}
          >
            <div className={`grid shrink-0 place-items-center rounded-lg font-extrabold ${compact ? 'h-7 w-7 text-base' : 'h-10 w-10 text-xl'} ${on ? 'bg-white/20' : 'bg-paper'}`}>
              {a.glyph}
            </div>
            <div className="min-w-0">
              <div className={`font-bold leading-tight ${compact ? 'text-[11px]' : 'text-sm'}`}>{a.label}</div>
              {!compact && <div className={`text-xs ${on ? 'text-white/80' : 'text-mute'}`}>{a.hint}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
