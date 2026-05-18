import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import ConnectionComponent from '@/components/Home/ConnectionComponent.vue'

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a><slot /></a>',
    props: ['to'],
  },
}))

describe('Connection Component', () => {
  it('button should be deactivate is not room or name', async () => {
    const wrapper = mount(ConnectionComponent)

    const button = wrapper.find('button')
    expect(button).toBeDefined()
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('shows RouterLink when inputs are filled', async () => {
    const wrapper = mount(ConnectionComponent)
    const inputs = wrapper.findAll('input')

    await inputs[0].setValue('player')
    await inputs[1].setValue('room')

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(wrapper.vm.room + '/' + wrapper.vm.name).toBe('room/player')
  })
})
