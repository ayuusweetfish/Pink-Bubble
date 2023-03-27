import { createSprite, socketMsgHandlerReg } from './utils.js'
import { getDirector } from './director.js'

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

  const bubbleAnchor = 0.82
  const spikesAnchor = 0.56

  const sGirl = ['girl-1', 'girl-2', 'girl-3'].map(spriteHere)
  const sSpikesFixed1 = spriteHere('spikes-1')
  sSpikesFixed1.opacity = 0.05
  sSpikesFixed1.setBasedScale(1.2)
  sSpikesFixed1.translation.y = H / 2 +
    (sSpikesFixed1.basedH * (1 - 1.2)) * (spikesAnchor - 0.5)
  const sSpikesFixed2 = spriteHere('spikes-2')
  const sSpikes = ['spikes-1', 'spikes-2', 'spikes-3'].map(spriteHere)
  for (const s of sSpikes) s.opacity = 0.8
  const sBubble = ['bubble-1', 'bubble-2', 'bubble-3'].map(spriteHere)

  let terminalsList = []
  let curBubbleSize = 0
  let targetBaseEnr = 1
  let curBaseEnr = 1

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
    //const x = Math.cos(T / 1800 * Math.PI * 2)
    //const bubbleScaleReal = 1 - 0.2 * Math.pow(Math.abs(x), 0.85) * Math.sign(x)
    curBubbleSize += (terminalsList.length - curBubbleSize) * (1/160)
    curBaseEnr += (targetBaseEnr - curBaseEnr) * (1/160)

    const sBubbleCur = sBubble[sBubbleIndex]
    const bubbleScaleReal =
      (0.8 + curBaseEnr * 0.2) +
      0.4 * (1 - Math.exp(-(curBubbleSize + curBaseEnr * 2) * 0.33))
    const bubbleScale = Math.round(bubbleScaleReal * 30) / 30
    sBubbleCur.setBasedScale(bubbleScale)
    sBubbleCur.translation.y = H / 2 +
      (sBubbleCur.basedH * (1 - bubbleScale)) * (bubbleAnchor - 0.5)

    const sSpikesIndex =
      (Math.max(0, Math.min(2, Math.round((1.04 - bubbleScaleReal) / 0.12))))
    for (let i = 0; i < 3; i++) sSpikes[i].visible = (i === sSpikesIndex)
    const sSpikesCur = sSpikes[sSpikesIndex]
    const spikesScaleReal = 1.09 + (bubbleScaleReal - 1) * 0.6
    const spikesScale = Math.round(spikesScaleReal * 20) / 20
    sSpikesCur.setBasedScale(spikesScale)
    sSpikesCur.translation.y = H / 2 +
      (sSpikesCur.basedH * (1 - spikesScale)) * (spikesAnchor - 0.5)

    const spikesFixed2Scale = Math.round((1 + (spikesScaleReal - 1) * 0.3) * 45) / 45
    sSpikesFixed2.setBasedScale(-1.1 * spikesFixed2Scale, 1.1 * spikesFixed2Scale)
    sSpikesFixed2.opacity = Math.round(Math.max(0, 1.1 - bubbleScale) * 5 / 0.25) * 0.25 * 0.15
    sSpikesFixed2.translation.y = H / 2 +
      (sSpikesFixed2.basedH * (1 - spikesFixed2Scale)) * (spikesAnchor - 0.5)
  }

  socketMsgHandlerReg((text) => {
    const payload = text.substring(1)
    switch (text[0]) {
    case 'L':
      terminalsList = (payload ? payload.split(',') : [])
      break
    case 'S':
      if (payload[0] === 'E') {
        targetBaseEnr = +payload.substring(1) / 100
      }
      break
    }
  })

  return {
    update,
    group,
  }
}
