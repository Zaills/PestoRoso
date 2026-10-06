import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('Vue Router Tests', () => {
  it('should have at least 3 routes configured', () => {
    const routes = router.getRoutes()
    expect(routes.length).toBeGreaterThanOrEqual(3)
  })

  it('should have a home route pointing to /', () => {
    const homeRoute = router.getRoutes().find((r) => r.name === 'home')
    expect(homeRoute?.path).toBe('/')
  })

  it('should have a game route pointing to /:roomId/:name', () => {
    const gameRoute = router.getRoutes().find((r) => r.name === 'game')
    expect(gameRoute?.path).toBe('/:roomId(\\w{1,16})/:name(\\w{1,16})')
  })

  describe('not found', () => {
    it.each(['/room/john/extra', '/a/b/c', `/${'a'.repeat(17)}/john`, '/room/john/'])(
      'resolves %s to the catch-all',
      (path) => {
        expect(router.resolve(path).name).toBe('not-found')
      },
    )
  })
})
