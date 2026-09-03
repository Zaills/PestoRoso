import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import InputHandler from '@/components/game/InputHandler.vue'


describe('InputHandler', () => {
  const createProps = () => ({
    onLeft: vi.fn(),
    onRight: vi.fn(),
    onDown: vi.fn(),
    onRotate: vi.fn(),
    onHardDrop: vi.fn(),
    onHold: vi.fn(),
  })

  let props: ReturnType<typeof createProps>

  beforeEach(() => {
    props = createProps()
    vi.clearAllMocks()
  })
  it('triggers correct callbacks and prevents default behavior on mapped key presses', () => {
    mount(InputHandler, { props })

    const mappings = [
      { key: 'ArrowLeft', prop: props.onLeft },
      { key: 'ArrowRight', prop: props.onRight },
      { key: 'ArrowDown', prop: props.onDown },
      { key: 'ArrowUp', prop: props.onRotate },
      { key: ' ', prop: props.onHardDrop },
      { key: 'c', prop: props.onHold },
      { key: 'C', prop: props.onHold },
    ]

    mappings.forEach(({ key, prop }) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      window.dispatchEvent(event)

      expect(prop).toHaveBeenCalledTimes(1)
      expect(preventDefaultSpy).toHaveBeenCalled()

      vi.clearAllMocks()
    })
  })

  it('ignores unmapped keys', () => {
    mount(InputHandler, { props })

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    Object.values(props).forEach((fn) => {
      expect(fn).not.toHaveBeenCalled()
    })
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('registers event listener on mount and removes it on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const wrapper = mount(InputHandler, { props })

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(props.onLeft).not.toHaveBeenCalled()
  })

})
