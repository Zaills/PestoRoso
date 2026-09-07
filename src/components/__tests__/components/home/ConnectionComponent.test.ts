import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionComponent from '../../../Home/ConnectionComponent.vue'

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
    expect(routerLink.attributes('data-to')).toBe('Room-404/John Doe')
  })

  it('triggers ConnectionComponent() and routes correctly when Enter is pressed on the room input', async () => {
    const wrapper = mount(ConnectionComponent)

    const nameInput = wrapper.find('input[placeholder="NAME"]')
    const roomInput = wrapper.find('input[placeholder="ROOM"]')

    await nameInput.setValue('Alex')
    await roomInput.setValue('Dev-Room')

    await roomInput.trigger('keyup.enter')

    expect(mockPush).toHaveBeenCalledWith('Dev-Room/Alex')
  })

  it('does not trigger ConnectionComponent() if one of the inputs is empty', async () => {
    const wrapper = mount(ConnectionComponent)

    const roomInput = wrapper.find('input[placeholder="ROOM"]')

    await roomInput.setValue('Dev-Room')
    await roomInput.trigger('keyup.enter')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
