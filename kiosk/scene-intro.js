import { createSprite, socketMsgHandlerReg, socketMsgSend } from './utils.js'
import { getDirector } from './director.js'
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
  const FRAME_DUR = 600
  const END_DELAY = 480
  const update = function () {
    T = T + 1
    const index = Math.floor(T / FRAME_DUR)
    if (!signalSent && T >= seq.length * FRAME_DUR + END_DELAY) {
      signalSent = true
      socketMsgSend('F')
    }
    disp(index)

    if (!handlerRegistered) {
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

  return {
    update,
    group,
  }
}
