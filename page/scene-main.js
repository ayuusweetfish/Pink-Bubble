import { createSprite } from './utils.js'
import { getDirector } from './director.js'

export default () => {
  const [W, H] = getDirector().dims
  const group = new Two.Group()

  const sGirl = ['girl-1', 'girl-2', 'girl-3'].map((name) => {
    const s = createSprite(name, W / 2)
    group.add(s)
    s.translation.x = W / 2
    s.translation.y = H / 2
    s.visible = false
    return s
  })

  let T = 0
  let sGirlIndex = 0
  sGirl[sGirlIndex].visible = true
  const update = function () {
    if (++T === 160) {
      sGirl[sGirlIndex].visible = false
      sGirlIndex = (sGirlIndex + 1) % sGirl.length
      sGirl[sGirlIndex].visible = true
      T = 0
    }
  }

  return {
    update,
    group,
  }
}
