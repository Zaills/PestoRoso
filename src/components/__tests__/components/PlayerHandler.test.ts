import { beforeEach, describe, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerHandler from '../../PlayerHandler.vue'

describe('PlayerHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    GameBoard: true,
  }

  it('Should render properly', () => {
    const wrapper = mount(PlayerHandler, { global: { stubs } })
  })
})
