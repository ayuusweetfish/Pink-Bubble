import { createSprite } from './utils.js'
import { getDirector } from './director.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  const spriteHere = (name) => {
    const s = createSprite(name, W / 2)
    group.add(s)
    s.translation.x = W / 2
    s.translation.y = H / 2
    s.visible = false
    return s
  }

  const sGirl = ['girl-1', 'girl-2', 'girl-3'].map(spriteHere)
  const sBubble = ['bubble-1', 'bubble-2', 'bubble-3'].map(spriteHere)

  let T = 0
  let tGirl = 0
  let sGirlIndex = 0
  let tBubble = 0
  let sBubbleIndex = 0
  const update = function () {
    if (++tGirl >= 160) {
      sGirlIndex = (sGirlIndex + 1) % sGirl.length
      tGirl -= 160
    }
    if (++tBubble >= 128 + Math.PI) {
      sBubbleIndex = (sBubbleIndex + 1) % sBubble.length
      tBubble -= (128 + Math.PI)
    }
    for (let i = 0; i < sGirl.length; i++) sGirl[i].visible = (i === sGirlIndex)
    for (let i = 0; i < sBubble.length; i++) sBubble[i].visible = (i === sBubbleIndex)

    T = (T + 1) % 1800
    const sBubbleCur = sBubble[sBubbleIndex]
    const bubbleScale = Math.round((1 - 0.2 * Math.cos(T / 1800 * Math.PI * 2)) * 30) / 30
    sBubbleCur.setBasedScale(bubbleScale)
    const bubbleAnchor = 0.82
    sBubbleCur.translation.y = H / 2 +
      ((W / 2) / sBubbleCur.aspectRatio * (1 - bubbleScale)) * (bubbleAnchor - 0.5)
  }

  return {
    update,
    group,
  }
}
