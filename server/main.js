import { serveDir } from 'https://deno.land/std@0.170.0/http/file_server.ts'

const log = (msg) => console.log(`${(new Date()).toISOString()} ${msg}`)

const port = +Deno.env.get('PORT') || 23123
const server = Deno.listen({ port })
log(`Running at http://localhost:${port}/`)
log(`Kiosk: http://localhost:${port}/kiosk/`)

let interactionStatus = 'N'
/*
Statuses:
N - idle (white screen)
I - intro sequence
E<energy> - main scene with countdown

Messages:
L<comma-separated IDs> - updated list of connected terminals
S<status> - updated status
*/
const kioskSockets = new Set()
const terminalSockets = new Set()
const terminalsListMessage = () => {
  const ids = []
  for (const s of terminalSockets) ids.push(s.uuid)
  return 'L' + ids.join(',')
}
// const statusMessage = () => 'S' + interactionStatus
const statusMessage = () => {
  console.log('Status: ' + interactionStatus)
  return 'S' + interactionStatus
}
const broadcastKiosk = (msg) => {
  for (const s of kioskSockets) if (s.readyState === 1) s.send(msg)
}
const broadcastAll = (msg) => {
  for (const s of kioskSockets) if (s.readyState === 1) s.send(msg)
  for (const s of terminalSockets) if (s.readyState === 1) s.send(msg)
}

let baseEnr
const restart = () => {
  baseEnr = 100
  const drain = () => {
    baseEnr -= 2
    const totalEnr = baseEnr + Math.round(Math.sqrt(terminalSockets.size) * 20)
    if (totalEnr <= 0) {
      interactionStatus = 'N'
      clearInterval(timer)
    } else {
      interactionStatus = 'E' + totalEnr.toString()
    }
    broadcastAll(statusMessage())
  }
  const timer = setInterval(drain, 1000)
}

const serveReq = (req) => {
  const url = new URL(req.url)
  if (req.headers.get('Upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const isKiosk = (url.pathname === '/kiosk/')
    socket.uuid = url.search.substring(1).replaceAll(',', '-')
    socket.onopen = () => {
      log(`Connected ${url.pathname} ${socket.uuid}`)
      if (isKiosk) {
        kioskSockets.add(socket)
        socket.send(statusMessage())
        if (interactionStatus.startsWith('E'))
          socket.send(terminalsListMessage())
      } else {
        terminalSockets.add(socket)
        if (interactionStatus === 'N') {
          interactionStatus = 'I'
          broadcastAll(statusMessage())
        } else if (interactionStatus.startsWith('E')) {
          broadcastKiosk(terminalsListMessage())
        }
      }
    }
    socket.onmessage = (e) => {
      const text = e.data
      if (isKiosk && text === 'F') {
        restart()
        broadcastAll(statusMessage())
        broadcastKiosk(terminalsListMessage())
      }
    }
    socket.onclose = (e) => {
      log(`Disconnected: ${e.code}`)
      if (isKiosk) {
        kioskSockets.delete(socket)
      } else {
        terminalSockets.delete(socket)
        if (interactionStatus.startsWith('E'))
          broadcastKiosk(terminalsListMessage())
      }
    }
    return response
  }
  if (url.pathname === '/kiosk')
    return new Response('Redirecting to /kiosk/', {
      status: 302,
      headers: { 'Location': '/kiosk/' },
    })
  if (url.pathname.startsWith('/kiosk/'))
    return serveDir(req, { fsRoot: '../kiosk', urlRoot: 'kiosk' })
  return serveDir(req, { fsRoot: '../terminal', urlRoot: undefined })
}

const handleConn = async (conn) => {
  const httpConn = Deno.serveHttp(conn)
  try {
    for await (const evt of httpConn) (async () => {
      const req = evt.request
      try {
        req.conn = conn
        await evt.respondWith(await serveReq(req))
      } catch (e) {
        if (!(e instanceof Deno.errors.Http)) {
          log(`Internal server error: ${e}`)
          try {
            await evt.respondWith(new Response('', { status: 500 }))
          } catch (e) {
            log(`Error writing 500 response: ${e}`)
          }
        }
      }
    })()
  } catch (e) {
    if (!(e instanceof Deno.errors.Http)) {
      log(`Unhandled error: ${e}`)
    }
  }
}
while (true) {
  const conn = await server.accept()
  handleConn(conn)
}
