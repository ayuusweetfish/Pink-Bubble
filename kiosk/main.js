import { loadImages, socketStartConnection } from './utils.js'
import { getDirector } from './director.js'
import sceneMain from './scene-main.js'

const twoElement = document.getElementById('draw')
const two = new Two({
  type: Two.Types.canvas,
  fullscreen: true,
}).appendTo(twoElement)

const W = two.width
const H = two.height

const _fn = () => {

const director = getDirector(two)
director.pushScene(sceneMain())

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
loadImages([
  'girl-1',
  'girl-2',
  'girl-3',
  'bubble-1',
  'bubble-2',
  'bubble-3',
  'spikes-1',
  'spikes-2',
  'spikes-3',
], function (count, total) {
  loadingElement.style.fontSize = `${document.body.clientHeight * 0.03}px`
  loadingElement.innerText = `加载中~ (${Math.round(count / total * 100)}%)`
  if (count === total) {
    loadingElement.style.display = 'none'
    twoElement.style.display = ''
    _fn()
  }
})
socketStartConnection()
