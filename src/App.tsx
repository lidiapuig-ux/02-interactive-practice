import { useGame } from './store'
import { Game } from './game/Game'
import { Landing, CameraScreen, Hud } from './ui/Screens'

export default function App() {
  const screen = useGame((s) => s.screen)
  return (
    <div className="relative h-full w-full bg-paper">
      {screen === 'game' && <Game />}
      {screen === 'landing' && <Landing />}
      {screen === 'camera' && <CameraScreen />}
      {screen === 'game' && <Hud />}
    </div>
  )
}
