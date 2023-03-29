import { createSprite, socketMsgHandlerReg } from './utils.js'
import { getDirector } from './director.js'
import { getAudio, pinkNoise } from './audio.js'
import sceneIntro from './scene-intro.js'
import sceneMain from './scene-main.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  const bg = new Two.Rectangle(W / 2, H / 2, W, H)
  bg.fill = '#8a5a6a'
  bg.stroke = 'none'
  group.add(bg)

  let handlerRegistered = false
  const update = function () {
    if (!handlerRegistered) {
      getAudio('Blumenlied').stop()
      pinkNoise(0, true)

      handlerRegistered = true
      socketMsgHandlerReg((text) => {
        if (text[0] === 'S') {
          if (text[1] === 'N') {
            // No-op
          } else if (text[1] === 'I') {
            getDirector().replaceScene(sceneIntro())
            return [undefined, true]  // Stop processing to avoid double scene replacement
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
  const qr = createSprite('qr-inv', w)
  qr.translation.x = w * 0.55
  qr.translation.y = H - w * 0.55
  group.add(qr)

  return {
    update,
    group,
  }
}
