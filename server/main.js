import { serveDir } from 'https://deno.land/std@0.170.0/http/file_server.ts'

const log = (msg) => console.log(`${(new Date()).toISOString()} ${msg}`)

const port = +Deno.env.get('PORT') || 23123
const server = Deno.listen({ port })
log(`Running at http://localhost:${port}/`)

const kioskSockets = new Set()
const terminalSockets = new Set()
const unicastCount = (s) => {
  const ids = []
  for (const s of terminalSockets) ids.push(s.uuid)
  s.send('L' + ids.join(','))
}
const broadcastCount = () => { for (const s of kioskSockets) unicastCount(s) }

const serveReq = (req) => {
  const url = new URL(req.url)
  if (req.headers.get('Upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    const isKiosk = (url.pathname === '/kiosk/')
    socket.uuid = url.search.substring(1)
    socket.onopen = () => {
      log(`Connected ${url.pathname} ${socket.uuid}`)
      if (isKiosk) {
        kioskSockets.add(socket)
        unicastCount(socket)
      } else {
        terminalSockets.add(socket)
        broadcastCount()
      }
    }
    socket.onclose = (e) => {
      log(`Disconnected: ${e.code}`)
      if (isKiosk) {
        kioskSockets.delete(socket)
      } else {
        terminalSockets.delete(socket)
        broadcastCount()
      }
    }
    return response
  }
  if (url.pathname.startsWith('/kiosk'))
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
