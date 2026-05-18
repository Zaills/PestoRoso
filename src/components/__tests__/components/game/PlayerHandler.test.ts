import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import PlayerHandler from '@/components/game/PlayerHandler.vue'

describe('PlayerHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    GameBoard: true,
    waitingRoom: true,
  }

  it('Should render properly', () => {
    const wrapper = mount(PlayerHandler, {
      global: { stubs },
      props: {
        playerList: [],
        ViewerList: []
      },
    })
    expect(wrapper.find('div').exists()).toBe(true)
  })
})
