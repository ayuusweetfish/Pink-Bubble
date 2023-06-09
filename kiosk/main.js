import { loadImages, socketStartConnection } from './utils.js'
import { getDirector } from './director.js'
import { preloadAudios } from './audio.js'
import sceneIdle from './scene-idle.js'

const twoElement = document.getElementById('draw')
const two = new Two({
  type: Two.Types.canvas,
  fullscreen: true,
}).appendTo(twoElement)

const W = two.width
const H = two.height

const _fn = () => {

const director = getDirector(two)
director.pushScene(sceneIdle())

const FRAME_INTERVAL = 1000.0 / 240
let globalTime = FRAME_INTERVAL / 2

const update = function () {
  globalTime += two.timeDelta
  while (globalTime >= FRAME_INTERVAL) {
    globalTime -= FRAME_INTERVAL
    director.update()
  }
}

two.renderer.domElement.addEventListener('mousedown', function (e) {
  e.preventDefault()
  director.ptHold(-1, e.clientX, e.clientY)
})

two.renderer.domElement.addEventListener('mousemove', function (e) {
  e.preventDefault()
  director.ptMove(-1, e.clientX, e.clientY)
})

two.renderer.domElement.addEventListener('mouseup', function (e) {
  e.preventDefault()
  director.ptRelease(-1, e.clientX, e.clientY)
})

two.renderer.domElement.addEventListener('touchstart', function (e) {
  e.preventDefault()
  for (const touch of e.changedTouches)
    director.ptHold(touch.identifier, touch.clientX, touch.clientY)
})

two.renderer.domElement.addEventListener('touchmove', function (e) {
  e.preventDefault()
  for (const touch of e.changedTouches)
    director.ptMove(touch.identifier, touch.clientX, touch.clientY)
})

const touchEnd = function (e) {
  e.preventDefault()
  for (const touch of e.changedTouches)
    director.ptRelease(touch.identifier, touch.clientX, touch.clientY)
}
two.renderer.domElement.addEventListener('touchend', touchEnd)
two.renderer.domElement.addEventListener('touchcancel', touchEnd)

two.bind('update', update).play()
}

const loadingElement = document.getElementById('loading')
const imageNames = [
  'qr',
  'qr-inv',
  'intro-1',
  'intro-2',
  'intro-3',
  'girl-1',
  'girl-2',
  'girl-3',
  'bubble-1',
  'bubble-2',
  'bubble-3',
  'spikes-1-1',
  'spikes-1-2',
  'spikes-1-3',
  'spikes-2-1',
  'spikes-2-2',
  'spikes-2-3',
  'spikes-3-1',
  'spikes-3-2',
  'spikes-3-3',
  'fall-1',
  'fall-2',
  'fall-3',
  'fall-4',
  'fall-5',
  'fall-6',
  'fall-7',
]
const imageTotal = imageNames.length
let imageCount = 0
const audioNames = [
  ['res/Blumenlied.mp3'],
  ['res/Whip.wav'],
]
const audioTotal = audioNames.length
let audioCount = 0
const total = imageTotal + audioTotal

const updateLoadingStatus = () => {
  const count = imageCount + audioCount
  loadingElement.style.fontSize = `${document.body.clientHeight * 0.03}px`
  loadingElement.innerText = `加载中~ (${Math.round(count / total * 100)}%)`
  if (count === total) {
    loadingElement.style.display = 'none'
    twoElement.style.display = ''
    _fn()
  }
}

loadImages(imageNames, (count) => {
  imageCount = count
  updateLoadingStatus()
})
preloadAudios(audioNames, (count) => {
  audioCount = count
  updateLoadingStatus()
})
socketStartConnection()
