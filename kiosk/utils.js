const texRegistry = {}
export const loadImages = function (images, callback) {
  let count = 0
  for (const name of images) {
    const i = new Image()
    i.onload = function () {
      i.onload = undefined
      texRegistry[name] = new Two.Texture(i)
      // XXX: Workaround for two.js SVG renderer not setting these
      texRegistry[name]._renderer.scale = {x: 1, y: 1}
      texRegistry[name]._renderer.offset = {x: i.width / 2, y: i.height / 2}
      count += 1
      callback(count, images.length)
    }
    if (name.endsWith('.jpg'))
      i.src = `res/${name}`
    else i.src = `res/${name}.png`
  }
}

export const createSprite = function (name, w, h, ax, ay) {
  const tex = texRegistry[name]
  const w0 = tex._image.width
  const h0 = tex._image.height
  const sprite = new Two.Rectangle(0, 0, w0, h0)
  sprite.noStroke()
  sprite.fill = tex

  // Scaling
  const wFinite = isFinite(w)
  const hFinite = isFinite(h)
  let xScale, yScale
  if (wFinite && hFinite) {
    xScale = w / w0
    yScale = h / h0
  } else if (wFinite) {
    xScale = yScale = w / w0
  } else if (hFinite) {
    xScale = yScale = h / h0
  } else {
    xScale = yScale = 1
  }

  sprite.basedW = w0 * xScale
  sprite.basedH = h0 * yScale
  sprite.setBasedScale = function (x, y) {
    if (!isFinite(y)) y = x
    this.scale = new Two.Vector(x * xScale, y * yScale)
  }
  sprite.setBasedScale(1)
  sprite.texture = tex
  if (name === 'peach_1f351') window.qwqwq = sprite

  return sprite
}

let socket
const socketMsgBuffer = []
let socketMsgFn

const socketMsgFnCall = () => {
  if (socketMsgFn) {
    const fn = socketMsgFn  // Prevent change mid-way
    let stopped = false
    for (const msg of socketMsgBuffer.splice(0)) {
      const putBack = (stopped ? msg : fn(msg))
      if (putBack) {
        if (putBack instanceof Array && putBack[1]) {
          if (putBack[0]) socketMsgBuffer.push(putBack[0])
          stopped = true
        } else {
          socketMsgBuffer.push(putBack)
        }
      }
    }
  }
}
export const socketMsgHandlerReg = (fn) => {
  socketMsgFn = fn
  socketMsgFnCall()
}

const socketOutboundMsgBuffer = []
const socketTrySendAll = () => {
  if (!socket) return
  for (const msg of socketOutboundMsgBuffer.splice(0))
    socket.send(msg)
}
export const socketMsgSend = (msg) => {
  socketOutboundMsgBuffer.push(msg)
  socketTrySendAll()
}

const reconnect = () => {
  if (socket) return
  socket = new WebSocket(
    (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
    window.location.host + window.location.pathname)
  socket.onopen = () => {
    socketTrySendAll()
  }
  socket.onclose = () => {
    socket = undefined
    setTimeout(() => reconnect(), 1000)
  }
  socket.onmessage = (e) => {
    const text = e.data
    socketMsgBuffer.push(text)
    socketMsgFnCall()
  }
}
export const socketStartConnection = reconnect
