import { createSprite, socketMsgHandlerReg, socketMsgSend } from './utils.js'
import { getDirector } from './director.js'
import { getAudio, pinkNoise } from './audio.js'
import sceneIdle from './scene-idle.js'
import sceneMain from './scene-main.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  const spriteHere = (name) => {
    const s = createSprite(name, W * 0.6)
    group.add(s)
    s.translation.x = W / 2
    s.translation.y = H / 2
    return s
  }
  const seq = [1, 2, 3].map((n) => spriteHere('intro-' + n))

  const disp = (index) => {
    for (let i = 0; i < seq.length; i++) seq[i].visible = (i === index)
  }
  disp(0)

  let handlerRegistered = false
  let T = 0
  let signalSent = false
  const FRAME_DUR = (240 * 60) / 84 * 3
  const START_DELAY = (240 * 60) / 80 * 1
  const END_DELAY = 480
  const update = function () {
    if (T === 0) socketMsgSend('F')
    T = T + 1
    const index = Math.floor((T - START_DELAY) / FRAME_DUR)
    if (!signalSent && T >= seq.length * FRAME_DUR + START_DELAY + END_DELAY) {
      signalSent = true
    }
    disp(index)

    if (!handlerRegistered) {
      getAudio('Blumenlied').play(true, 60000 / 84 * 3 * 16)
      getAudio('Blumenlied').volume(1)
      pinkNoise(0, true)

      handlerRegistered = true
      socketMsgHandlerReg((text) => {
        if (text[0] === 'S') {
          if (text[1] === 'N') {
            getDirector().replaceScene(sceneIdle())
            return [undefined, true]
          } else if (text[1] === 'I') {
            // No-op
          } else if (text[1] === 'E') {
            getDirector().replaceScene(sceneMain())
            return [text, true]
          } else {
            console.log('Unrecognised status: ' + text.substring(1))
            return text
          }
        } else {
          return text
        }
      })
    }
  }

  const w = Math.min(W, H) * 0.3
  const qr = createSprite('qr', w)
  qr.translation.x = w * 0.55
  qr.translation.y = H - w * 0.55
  group.add(qr)

  return {
    update,
    group,
  }
}
