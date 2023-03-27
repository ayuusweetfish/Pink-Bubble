const uuid = (typeof crypto.randomUUID === 'function' ?
  crypto.randomUUID() :
  Math.random().toString().substring(2) + Math.random().toString().substring(2))

// Random light spot
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
    seed = Math.imul(seed, 1103515245, 12345)
    return seed & 0x7fffffff
  }
  let r, g, b
  while (true) {
    r = randNext() % 127 + 128
    g = randNext() % 127 + 128
    b = randNext() % 127 + 128
    if (
      Math.max(r, g, b) - Math.min(r, g, b) >= 20 &&
      (r + g) / 2 >= b * 0.8 &&
      Math.pow(r / 255, 1/2.2) * 0.2126 + Math.pow(g / 255, 1/2.2) * 0.7152 + Math.pow(b / 255, 1/2.2) * 0.0722 >= 0.7 &&
      Math.pow(r / 255, 1/2.2) * 0.2126 + Math.pow(g / 255, 1/2.2) * 0.7152 + Math.pow(b / 255, 1/2.2) * 0.0722 <= 0.8
    )
      break
  }
  while (svgRoot.lastChild) svgRoot.remove(svgRoot.lastChild)
  const roughSvg = rough.svg(svgRoot)
  svgRoot.appendChild(roughSvg.circle(0, 0, size, {
    fill: `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`,
    fillStyle: 'zigzag',
    seed: cyrb53(uuid, frameIndex) + 1,
  }))
  return svgRoot
}

const SPOT_N_SIZEGROUPS = 6
const SPOT_N_FRAMES = 4

const svgContainer = document.getElementById('svg-container')
const spots = []
for (let i = 0; i < SPOT_N_SIZEGROUPS; i++) {
  spots[i] = []
  for (let j = 0; j < SPOT_N_FRAMES; j++) {
    const radius = 
      (Math.min(window.innerWidth, window.innerHeight) * 0.5) *
      Math.pow((i + 1) / SPOT_N_SIZEGROUPS, 0.85)
    spots[i][j] = roughSpotSvg(uuid, radius, j)
    spots[i][j].setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    spots[i][j].setAttribute('width', radius * 2)
    spots[i][j].setAttribute('height', radius * 2)
    spots[i][j].setAttribute('viewBox', `${-radius} ${-radius} ${radius * 2} ${radius * 2}`)
    spots[i][j].style.position = 'fixed'
    svgContainer.appendChild(spots[i][j])
  }
}

let currentSizeGroup = undefined
let currentFrameIndex = 0
const displaySpot = (sizeGroupIndex, frameIndex) => {
  for (let i = 0; i < SPOT_N_SIZEGROUPS; i++)
    for (let j = 0; j < SPOT_N_FRAMES; j++)
      spots[i][j].style.display = 'none'
  if (currentSizeGroup !== undefined) {
    const s = spots[sizeGroupIndex][frameIndex]
    s.style.display = 'block'
    s.style.left = Math.round((window.innerWidth - s.clientWidth) / 2) + 'px'
    s.style.top = Math.round((window.innerHeight - s.clientHeight) / 2) + 'px'
  }
}
displaySpot(currentSizeGroup, currentFrameIndex)
setInterval(() => {
  currentFrameIndex = (currentFrameIndex + 1) % SPOT_N_FRAMES
  displaySpot(currentSizeGroup, currentFrameIndex)
}, 525)

let socket
let moreRetries = true
const reconnect = () => {
  socket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host + window.location.pathname +
    '?' + uuid)
  socket.onopen = () => {}
  socket.onclose = () => {
    socket = undefined
    if (moreRetries) setTimeout(() => reconnect(), 1000)
  }
  socket.onmessage = (e) => {
    const text = e.data
    if (text[0] === 'S') {
      if (text[1] === 'E') {
        currentSizeGroup = Math.max(0, Math.min(SPOT_N_SIZEGROUPS - 1,
          Math.round((+text.substring(2) / 100) * (SPOT_N_SIZEGROUPS - 1))
        ))
      } else if (text[1] === 'N') {
        moreRetries = false
        currentSizeGroup = undefined
      } else {
        currentSizeGroup = undefined
      }
    }
  }
}
reconnect()
