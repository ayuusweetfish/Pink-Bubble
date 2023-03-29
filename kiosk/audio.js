const audioCtx = new (window.AudioContext || window.webkitAudioContext)()

const audios = {}

const createSound = (urls) => {
  const o = {}

  o.eventHandlers = {load: [], end: []}
  const emit = (name) => {
    for (const fn of o.eventHandlers[name]) fn()
    o.eventHandlers[name].splice(0)
  }
  o.once = (name, fn) => o.eventHandlers[name].push(fn)

  let buf = null
  const tryFetch = (i) => {
    fetch(urls[i]).then((resp) => {
      resp.arrayBuffer().then((dataBuf) => {
        audioCtx.decodeAudioData(dataBuf,
          (pcmBuf) => {
            buf = pcmBuf
            emit('load')
          },
          () => {
            if (i + 1 < urls.length) tryFetch(i + 1)
            // XXX: Throw an exception otherwise?
          }
        )
      })
    })
  }
  tryFetch(0)

  o.duration = () => buf.duration

  let count = 0
  let overallPlaybackRate = 1
  let loopTimer
  const s = {}
  o.stop = (id) => {
    if (id === undefined) {
      for (const id in s) o.stop(id)
      if (loopTimer) clearInterval(loopTimer)
    } else if (s[id]) {
      s[id].nSource.stop()
      s[id].nSource.disconnect()
      s[id].nGain.disconnect()
      delete s[id]
    }
  }
  o.play = (avoidDup, loopDur) => {
    if (avoidDup) for (const id in s) return id
    const id = count++
    const nSource = audioCtx.createBufferSource()
    nSource.buffer = buf
    nSource.playbackRate.setValueAtTime(
      overallPlaybackRate, audioCtx.currentTime)
    nSource.start()
    nSource.onended = () => {
      emit('end')
      o.stop(id)
    }
    const nGain = audioCtx.createGain()
    nSource.connect(nGain)
    nGain.connect(audioCtx.destination)
    s[id] = {
      nSource: nSource,
      nGain: nGain,
    }
    if (loopDur) {
      loopTimer = setInterval(() => {
        o.play()
      }, loopDur)
    }
    return id
  }

  o.volume = (vol, id) => {
    if (id === undefined) {
      for (const id in s) o.volume(vol, id)
      return
    }
    if (vol === undefined) {
      if (!s[id]) return 0
      return s[id].nGain.gain.value
    }
    s[id].nGain.gain.value = vol
  }
  o.fade = (from, to, dur, id) => {
    if (id === undefined) {
      for (const id in s) o.fade(from, to, dur, id)
      return
    }
    if (!s[id]) return
    const g = s[id].nGain.gain
    const t = audioCtx.currentTime
    if (from === undefined) from = g.value
    g.setValueAtTime(from, t)
    g.linearRampToValueAtTime(to, t + dur)
  }
  o.rate = (rate) => {
    // Only overall setting is necessary, and only applies to new instances
    overallPlaybackRate = rate
  }

  return o
}

export const preloadAudios = (paths, callback) => {
  let count = 0
  for (const pathList of paths) {
    const name = pathList[0].split('/').pop().split('.')[0]
    const audio = createSound(pathList)
    audio.once('load', () => {
      callback(++count, paths.length)
    })
    audios[name] = audio
  }
}

export const getAudio = (name) => audios[name]

let pinkNoiseNode, pinkNoiseGainNode
export const pinkNoise = (vol, hard) => {
  if (!pinkNoiseNode) {
    // https://noisehack.com/generate-noise-web-audio-api/
    const bufferSize = 4096
    let b0, b1, b2, b3, b4, b5, b6
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    const node = audioCtx.createScriptProcessor(bufferSize, 1, 1)
    node.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        output[i] *= 0.11  // (roughly) compensate for gain
        b6 = white * 0.115926
      }
    }
    const nGain = audioCtx.createGain()
    node.connect(nGain)
    nGain.connect(audioCtx.destination)
    nGain.gain.setValueAtTime(0, audioCtx.currentTime)
    pinkNoiseNode = node
    pinkNoiseGainNode = nGain
  }
  const g = pinkNoiseGainNode.gain
  const t = audioCtx.currentTime
  if (hard) {
    g.cancelScheduledValues(t)
    g.setValueAtTime(vol, t)
  } else {
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(vol, t + 0.2)
  }
}
