import { createSprite, socketMsgHandlerReg, socketMsgSend } from './utils.js'
import { getDirector } from './director.js'
import { getAudio, pinkNoise } from './audio.js'
import sceneIdle from './scene-idle.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  const bg = new Two.Rectangle(W / 2, H / 2, W, H)
  bg.fill = '#8a5a6a'
  bg.stroke = 'none'
  group.add(bg)
  // bg.opacity = 0

  const spriteHere = (name) => {
    const s = createSprite(name, W * 0.6)
    group.add(s)
    s.translation.x = W / 2
    s.translation.y = H / 2
    return s
  }
  const seq = [1, 2, 3, 4, 5, 6, 7].map((n) => spriteHere('fall-' + n))

  const disp = (index) => {
    for (let i = 0; i < seq.length; i++) seq[i].visible = (i === index)
  }
  disp(0)

  let handlerRegistered = false
  let T = 0
  const FRAME_DUR = 60
  const START_DELAY = 0
  const END_DELAY = 240
  const update = function () {
    if (T >= seq.length * FRAME_DUR + START_DELAY + END_DELAY) {
      getDirector().replaceScene(sceneIdle())
      return
    }
    T = T + 1
    const index = Math.floor((T - START_DELAY) / FRAME_DUR)
    disp(index)
    // bg.opacity = Math.max(0, Math.min(1, (T - START_DELAY) / (FRAME_DUR * seq.length)))

    if (!handlerRegistered) {
      getAudio('Blumenlied').stop()
      pinkNoise(0, true)
      getAudio('Whip').volume(3)
      getAudio('Whip').play()

      handlerRegistered = true
      socketMsgHandlerReg((text) => {
        return text
      })
    }
  }

  return {
    update,
    group,
  }
}
