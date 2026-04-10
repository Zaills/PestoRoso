import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./assets/game.css', () => ({}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    createApp: vi.fn(() => ({
      use: vi.fn().mockReturnThis(),
      mount: vi.fn(),
    })),
  }
})

vi.mock('pinia', () => ({
  createPinia: vi.fn(() => 'mocked-pinia-instance'),
}))

vi.mock('./App.vue', () => ({ default: { name: 'App' } }))
vi.mock('@/components/AppBackgroud.vue', () => ({ default: { name: 'AppBackground' } }))

describe('Application Entry Point (main.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<div id="app"></div>'
  })

  it('should initialize the Vue app with all plugins', async () => {
    const { createApp } = await import('vue')
    const { createPinia } = await import('pinia')

    await import('@/main.ts')
    expect(createApp).toHaveBeenCalled()

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const mockApp = vi.mocked(createApp).mock.results[0].value

    expect(createPinia).toHaveBeenCalled()
    expect(mockApp.use).toHaveBeenCalledWith('mocked-pinia-instance')

    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })
})
