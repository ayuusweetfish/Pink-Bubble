let directorInstance = null

export const getDirector = function (two) {
  if (directorInstance !== null) return directorInstance

  const transitions = {
    NONE: 0,
    FADE_IN: 1,
  }

  const W = two.width
  const H = two.height
  const dims = [W, H]

  const scenes = []
  let curLevel = -1
  const ts = Date.now()

  const pushScene = function (scene, transition) {
    if (curLevel === -1) {
      two.add(scene.group)
    } else {
      transitionFrom = curLevel
      transitionTime = 0
    }
    curLevel++
    scenes.splice(curLevel)
    scenes.push(scene)
    if (curLevel === 0) {
      window.history.replaceState({ts: ts, level: curLevel}, '')
    } else {
      window.history.replaceState({ts: ts, level: curLevel - 1}, '')
      window.history.pushState({ts: ts, level: curLevel}, '')
    }
  }

  const popScene = function (transition) {
    window.history.back()
  }

  const getScene = function () {
    return scenes[curLevel]
  }

  let transitionFrom = -1
  let transitionTime = -1
  const TRANSITION_FADE = 20

  const update = function () {
    getScene().update()
    if (transitionTime >= 0) {
      scenes[transitionFrom].update()

      if (transitionTime === 0)
        two.add(scenes[curLevel].group)

      transitionTime++

      const r = transitionTime / TRANSITION_FADE
      const x = 1 - (1 - r) * Math.exp(-3 * r)
      const direction = (transitionFrom < curLevel ? +1 : -1)
      scenes[transitionFrom].group.opacity = 1 - x
      scenes[transitionFrom].group.translation.x = -direction * W * 0.1 * x
      scenes[curLevel].group.opacity = x
      scenes[curLevel].group.translation.x = direction * W * 0.1 * (1 - x)
      if (r >= 1) {
        transitionTime = -1
        two.remove(scenes[transitionFrom].group)
      }
    }
  }

  const ptHold = function (id, x, y) {
    if (transitionTime !== -1) return
    const fn = getScene().ptHold
    if (fn) fn(id, x, y)
    ptMove(id, x, y)
  }

  const ptMove = function (id, x, y) {
    if (transitionTime !== -1) return
    const fn = getScene().ptMove
    if (fn) fn(id, x, y)
  }

  const ptRelease = function (id, x, y) {
    if (transitionTime !== -1) return
    const fn = getScene().ptRelease
    if (fn) fn(id, x, y)
  }

  window.onpopstate = function (e) {
    let targetLevel = e.state.level
    if ((e.state || {}).ts !== ts) {
      window.history.replaceState({ts: ts, level: 0}, '')
      targetLevel = 0
    }
    if (curLevel === targetLevel) return
    transitionFrom = curLevel
    curLevel = targetLevel
    transitionTime = 0
  }

  return directorInstance = {
    dims,
    transitions,
    pushScene,
    popScene,
    getScene,
    update,
    ptHold,
    ptMove,
    ptRelease,
  }
}
