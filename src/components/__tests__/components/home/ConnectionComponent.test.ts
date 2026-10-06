import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import ConnectionComponent from '@/components/home/ConnectionComponent.vue'
import { nextTick } from 'vue'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  RouterLink: {
    template: '<a :data-to="to"><slot /></a>',
    props: ['to'],
  },
}))

describe('ConnectionComponent.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the initial state with inputs and a disabled button', () => {
    const wrapper = mount(ConnectionComponent)

    const nameInput = wrapper.find('input[placeholder="NAME"]')
    const roomInput = wrapper.find('input[placeholder="ROOM"]')
    const button = wrapper.find('button.joinButton')

    expect(nameInput.exists()).toBe(true)
    expect(roomInput.exists()).toBe(true)
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('triggers focusRoom() and focuses the room input when Enter is pressed on the name input', async () => {
    const wrapper = mount(ConnectionComponent)

    const nameInput = wrapper.find('input[placeholder="NAME"]')
    const roomInput = wrapper.find('input[placeholder="ROOM"]')

    const focusSpy = vi.spyOn(roomInput.element as HTMLInputElement, 'focus')

    await nameInput.trigger('keyup.enter')

    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it('enables the Join Room link only when both fields are filled', async () => {
    const wrapper = mount(ConnectionComponent)

    const nameInput = wrapper.find('input[placeholder="NAME"]')
    const roomInput = wrapper.find('input[placeholder="ROOM"]')

    await nameInput.setValue('John Doe')
    expect(wrapper.find('button.joinButton').exists()).toBe(true)

    await roomInput.setValue('Room-404')

    expect(wrapper.find('button.joinButton').exists()).toBe(false)

    const routerLink = wrapper.find('.joinButton')
    expect(routerLink.exists()).toBe(true)
  })

  it('triggers ConnectionComponent() and routes correctly when Enter is pressed on the room input', async () => {
    const wrapper = mount(ConnectionComponent)

    const nameInput = wrapper.find('input[placeholder="NAME"]')
    const roomInput = wrapper.find('input[placeholder="ROOM"]')

    await nameInput.setValue('Alex')
    await roomInput.setValue('Dev_Room')

    await roomInput.trigger('keyup.enter')

    expect(mockPush).toHaveBeenCalledWith(
      {
        "name": "game",
        "params": {
        "name": "Alex",
        "roomId": "Dev_Room",
        },
      },
    )
  })

  it('does not trigger ConnectionComponent() if one of the inputs is empty', async () => {
    const wrapper = mount(ConnectionComponent)

    const roomInput = wrapper.find('input[placeholder="ROOM"]')
    const nameInput = wrapper.find('input[placeholder="NAME"]')

    await roomInput.setValue('Dev_Room')
    await nameInput.setValue('')
    await roomInput.trigger('keyup.enter')

    expect(mockPush).not.toHaveBeenCalled()
  })

  describe('input sanitizing', () => {
    it('strips forbidden characters from both inputs', async () => {
      const wrapper = mount(ConnectionComponent)

      const roomInput = wrapper.find('input[placeholder="ROOM"]')
      const nameInput = wrapper.find('input[placeholder="NAME"]')

      await nameInput.setValue('jo hn-é!')
      await roomInput.setValue('Room-404')
      await nextTick()

      expect((nameInput.element as HTMLInputElement).value).toBe('john')
      expect((roomInput.element as HTMLInputElement).value).toBe('Room404')
    })

    it('truncates values to 16 characters', async () => {
      const wrapper = mount(ConnectionComponent)
      const nameInput = wrapper.find('input[placeholder="NAME"]')

      await nameInput.setValue('a'.repeat(20))
      await nextTick()

      expect((nameInput.element as HTMLInputElement).value).toBe('a'.repeat(16))
    })

    it('keeps the button disabled when a field only contains forbidden characters', async () => {
      const wrapper = mount(ConnectionComponent)
      const roomInput = wrapper.find('input[placeholder="ROOM"]')
      const nameInput = wrapper.find('input[placeholder="NAME"]')

      await nameInput.setValue('john')
      await roomInput.setValue('---')
      await nextTick()

      expect(wrapper.find('button.joinButton').exists()).toBe(true)
    })
  })

})
