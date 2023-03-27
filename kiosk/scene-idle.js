import { createSprite, socketMsgHandlerReg } from './utils.js'
import { getDirector } from './director.js'
import sceneIntro from './scene-intro.js'
import sceneMain from './scene-main.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  let handlerRegistered = false
  const update = function () {
    if (!handlerRegistered) {
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

  return {
    update,
    group,
  }
}
