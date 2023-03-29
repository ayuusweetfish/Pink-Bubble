import { createSprite, socketMsgHandlerReg } from './utils.js'
import { getDirector } from './director.js'
import { getAudio } from './audio.js'
import sceneIdle from './scene-idle.js'
import sceneIntro from './scene-intro.js'

const cyrb53 = (str, seed = 0) => {
  let h1 = 20230123 ^ seed,
      h2 = 20230313 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  // return 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return (h1 ^ h2) & 0x7fffffff
}

const roughSpotSvg = (uuid, size, frameIndex) => {
  const svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  let seed = cyrb53(uuid, 221)
  const randNext = () => {
    seed = Math.imul(seed, 1103515245) + 12345
    return seed & 0x7fffffff
  }
  let r, g, b
  while (true) {
    r = randNext() % 128 + 128
    g = randNext() % 256
    b = randNext() % 160 + 96
    if (
      Math.max(r, g, b) - Math.min(r, g, b) >= 20 &&
      Math.min(r, g, b) === g &&
      Math.max(r, g, b) === b &&
      Math.pow(r / 255, 1/2.2) * 0.2126 + Math.pow(g / 255, 1/2.2) * 0.7152 + Math.pow(b / 255, 1/2.2) * 0.0722 >= 0.87 &&
      Math.pow(r / 255, 1/2.2) * 0.2126 + Math.pow(g / 255, 1/2.2) * 0.7152 + Math.pow(b / 255, 1/2.2) * 0.0722 <= 0.92
    )
      break
  }
  while (svgRoot.lastChild) svgRoot.remove(svgRoot.lastChild)
  const roughSvg = rough.svg(svgRoot)
  svgRoot.appendChild(roughSvg.circle(0, 0, size, {
    fill: `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`,
    fillStyle: 'zigzag',
    stroke: `#${[r, g, b].map((x) => Math.floor(x * 0.6).toString(16).padStart(2, '0')).join('')}`,
    strokeWidth: 1.5,
    seed: cyrb53(uuid, frameIndex) + 1,
  }))
  return svgRoot
}

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

  const roughSpotHere = (uuid, size, frameIndex) => {
    return getDirector().two.interpret(roughSpotSvg(uuid, size, frameIndex))
  }

  const bubbleAnchor = 0.82
  const spikesAnchor = 0.56
  const spotsAnchor = 0.75

  const sGirl = ['girl-1', 'girl-2', 'girl-3'].map(spriteHere)
  const sSpikesFixed1 = spriteHere('spikes-1-1')
  sSpikesFixed1.opacity = 0.05
  sSpikesFixed1.setBasedScale(1.4)
  sSpikesFixed1.translation.y = H / 2 +
    (sSpikesFixed1.basedH * (1 - 1.4)) * (spikesAnchor - 0.5)
  const sSpikesFixed2 = spriteHere('spikes-2-1')
  const sSpikes = ['spikes-1-', 'spikes-2-', 'spikes-3-'].map((s) => (
    [1, 2, 3].map((n) => spriteHere(s + n))
  ))
  for (const sSeq of sSpikes) for (const s of sSeq) s.opacity = 0.8
  const sBubble = ['bubble-1', 'bubble-2', 'bubble-3'].map(spriteHere)

  const terminals = {}
  const spotsContainer = new Two.Group()
  group.add(spotsContainer)
  const SPOT_N_SIZEGROUPS = 6
  const SPOT_N_FRAMES = 4
  const SPOT_FRAMELEN = 120
  const addTerminal = (id) => {
    if (terminals[id]) {
      if (terminals[id].timer < 240) terminals[id].timerDir = +1
      return
    }
    const spots = []
    const angle = ((cyrb53(id, 327) / 0x7fffffff) * 0.8 + 0.1) * Math.PI
    const distMin = 1 - 0.48 * Math.abs(angle / Math.PI - 0.5) / 0.4
    const dist = (cyrb53(id, 328) / 0x7fffffff) * (1 - distMin) + distMin
    for (let i = 0; i < SPOT_N_SIZEGROUPS; i++) {
      spots[i] = []
      for (let j = 0; j < SPOT_N_FRAMES; j++) {
        spots[i][j] = roughSpotHere(id,
          sBubble[0].basedH * 0.15 *
          Math.pow((i + 1) / SPOT_N_SIZEGROUPS, 0.85), j)
        spotsContainer.add(spots[i][j])
      }
    }
    terminals[id] = {
      spots,
      offsetX:  Math.cos(angle) * dist, 
      offsetY: -Math.sin(angle) * dist,
      timer: 0,
      timerDir: +1,
    }
  }
  const removeTerminal = (id) => {
    terminals[id].timerDir = -1
  }

  let targetBaseEnr = 1
  let curBaseEnr = 1
  const BUBBLE_SCALE_MIN = 0.8
  const BUBBLE_SCALE_INC = 0.4

  let handlerRegistered = false
  let T = 0
  let tGirl = 0
  let sGirlIndex = 0
  let tBubble = 0
  let sBubbleIndex = 0
  let tSpikes = 0
  let sSpikesFrameIndex = 0
  let spotCycleTimer = 0
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
    curBaseEnr += (targetBaseEnr - curBaseEnr) * (1/160)

    const sBubbleCur = sBubble[sBubbleIndex]
    const bubbleScaleReal =
      BUBBLE_SCALE_MIN +
      BUBBLE_SCALE_INC * (1 - Math.exp(-curBaseEnr * 1.5))
    const bubbleScale = Math.round(bubbleScaleReal * 30) / 30
    sBubbleCur.setBasedScale(bubbleScale)
    sBubbleCur.translation.y = H / 2 +
      (sBubbleCur.basedH * (1 - bubbleScale)) * (bubbleAnchor - 0.5)

    if (++tSpikes >= 150) {
      sSpikesFrameIndex = (sSpikesFrameIndex + 1) % 3
      tSpikes -= 150
    }
    const sSpikesSizeIndex =
      (Math.max(0, Math.min(2, Math.round((1.04 - bubbleScaleReal) / 0.12))))
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        sSpikes[i][j].visible = (i === sSpikesSizeIndex && j === sSpikesFrameIndex)
    const sSpikesCur = sSpikes[sSpikesSizeIndex][sSpikesFrameIndex]
    const spikesScaleReal = 1.3 + (bubbleScaleReal - 1) * 1.1
    const spikesScale = Math.round(spikesScaleReal * 20) / 20
    sSpikesCur.setBasedScale(spikesScale)
    sSpikesCur.translation.y = H / 2 +
      (sSpikesCur.basedH * (1 - spikesScale)) * (spikesAnchor - 0.5)

    const spikesFixed2Scale = Math.round((1 + (spikesScaleReal - 1) * 0.3) * 45) / 45
    sSpikesFixed2.setBasedScale(-1.1 * spikesFixed2Scale, 1.1 * spikesFixed2Scale)
    sSpikesFixed2.opacity = Math.round(Math.max(0, 1.1 - bubbleScale) * 5 / 0.25) * 0.25 * 0.15
    sSpikesFixed2.translation.y = H / 2 +
      (sSpikesFixed2.basedH * (1 - spikesFixed2Scale)) * (spikesAnchor - 0.5)

    // Update light spots
    spotCycleTimer = (spotCycleTimer + 1) % (SPOT_FRAMELEN * SPOT_N_FRAMES)
    for (const [uuid, record] of Object.entries(terminals)) {
      const spots = record.spots
      if (record.timerDir !== 0) {
        record.timer += record.timerDir
        if (record.timerDir === +1 && record.timer === 240)
          record.timerDir = 0
        if (record.timerDir === -1 && record.timer <= 0) {
          for (const sizeGroup of spots)
            for (const spot of sizeGroup) spot.remove()
          delete terminals[uuid]
          continue
        }
      }
      const frameIndex = Math.floor(spotCycleTimer / SPOT_FRAMELEN)
      const sizeGroupIndex = Math.floor(0.5 + (SPOT_N_SIZEGROUPS - 1) * Math.max(0, Math.min(1,
        (record.timer / 240) * ((bubbleScaleReal - BUBBLE_SCALE_MIN) / BUBBLE_SCALE_INC)
      )))
      for (let i = 0; i < SPOT_N_SIZEGROUPS; i++)
        for (let j = 0; j < SPOT_N_FRAMES; j++)
          spots[i][j].visible = (i === sizeGroupIndex && j === frameIndex)
      spots[sizeGroupIndex][frameIndex].translation.x =
        record.offsetX * (sBubbleCur.basedH * bubbleScale * 0.54) + W / 2
      spots[sizeGroupIndex][frameIndex].translation.y =
        record.offsetY * (sBubbleCur.basedH * bubbleScale * 0.54) + H / 2
          + sBubbleCur.basedH * (spotsAnchor - 0.5)
    }

    if (!handlerRegistered) {
      getAudio('Blumenlied').play(true, 60000 / 84 * 3 * 16)
      getAudio('Blumenlied').volume(1)

      handlerRegistered = true
      socketMsgHandlerReg((text) => {
        const payload = text.substring(1)
        switch (text[0]) {
        case 'L': {
          const terminalsSet = new Set(payload ? payload.split(',') : [])
          for (const id in terminals)
            if (!terminalsSet.has(id)) removeTerminal(id)
          for (const id of terminalsSet) addTerminal(id)
          break
        }
        case 'S':
          if (payload[0] === 'E') {
            targetBaseEnr = +payload.substring(1) / 100
          } else if (payload[0] === 'N') {
            getDirector().replaceScene(sceneIdle())
            return [undefined, true]
          } else if (text[1] === 'I') {
            getDirector().replaceScene(sceneIntro())
            return [undefined, true]
          } else {
            return text
          }
          break
        default:
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
