import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { mount } from '@vue/test-utils'
import AppBackground from '../../AppBackground.vue'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
}))

describe('Background', () => {
  const mockRoute = ref({ path: '/' })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue(mockRoute as never)
  })

  it('sets a background image on mount', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const wrapper = mount(AppBackground)

    const container = wrapper.find('.main-bg-container')
    const style = container.attributes('style')

    expect(style).toContain('background-image: url(')
    expect(randomSpy).toHaveBeenCalled()
  })

  it('updates the background image when the route changes', async () => {
    const wrapper = mount(AppBackground)

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    mockRoute.value = { path: '/lobby' }

    await nextTick()

    const updatedStyle = wrapper.find('.main-bg-container').attributes('style')
    expect(updatedStyle).toBeDefined()
  })
})
