import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerIcon from '@/components/waitingRoom/PlayerIcon.vue'

describe('Player Icon', () => {
  it('should render', () => {
    mount(PlayerIcon, {
      props: {
        player: '',
      },
    })
  })
})
