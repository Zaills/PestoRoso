import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useInputHandler, type InputHandlers } from '../useInputHandler'

describe('useInputHandler', () => {
  const createHandlers = (): InputHandlers => ({
    onLeft: vi.fn(),
    onRight: vi.fn(),
    onDown: vi.fn(),
    onRotate: vi.fn(),
    onHardDrop: vi.fn(),
    onHold: vi.fn(),
  })

  // The composable relies on onMounted/onUnmounted, so it needs a host component.
  const mountWith = (handlers: InputHandlers) =>
    mount(
      defineComponent({
        setup() {
          useInputHandler(handlers)
          return () => h('div')
        },
      }),
    )

  let handlers: InputHandlers

  beforeEach(() => {
    handlers = createHandlers()
    vi.clearAllMocks()
  })

  it('triggers correct callbacks and prevents default behavior on mapped key presses', () => {
    mountWith(handlers)

    const mappings = [
      { key: 'ArrowLeft', handler: handlers.onLeft },
      { key: 'ArrowRight', handler: handlers.onRight },
      { key: 'ArrowDown', handler: handlers.onDown },
      { key: 'ArrowUp', handler: handlers.onRotate },
      { key: ' ', handler: handlers.onHardDrop },
      { key: 'c', handler: handlers.onHold },
      { key: 'C', handler: handlers.onHold },
    ]

    mappings.forEach(({ key, handler }) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      window.dispatchEvent(event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(preventDefaultSpy).toHaveBeenCalled()

      vi.clearAllMocks()
    })
  })

  it('ignores unmapped keys', () => {
    mountWith(handlers)

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    window.dispatchEvent(event)

    Object.values(handlers).forEach((handler) => {
      expect(handler).not.toHaveBeenCalled()
    })
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('registers event listener on mount and removes it on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const wrapper = mountWith(handlers)

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(handlers.onLeft).not.toHaveBeenCalled()
  })
})
