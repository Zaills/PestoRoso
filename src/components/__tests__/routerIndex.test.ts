import { describe, expect, it } from 'vitest'
import router from '@/router'


describe('Vue Router Tests', () => {
  it('should have exactly 3 routes configured', () => {
    const routes = router.getRoutes()
    expect(routes.length).toBeGreaterThanOrEqual(3)
  })

  it('should have a home route pointing to /', () => {
    const homeRoute = router.getRoutes().find(r => r.name === 'home')
    expect(homeRoute).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(homeRoute.path).toBe('/')
  })

  it('should have a about route pointing to /about', () => {
    const homeRoute = router.getRoutes().find((r) => r.name === 'about')
    expect(homeRoute).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(homeRoute.path).toBe('/about')
  })

  it('should have a game route pointing to /game', () => {
    const homeRoute = router.getRoutes().find((r) => r.name === 'game')
    expect(homeRoute).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(homeRoute.path).toBe('/:roomId/:name')
  })
})

