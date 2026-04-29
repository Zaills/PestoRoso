import { describe, it} from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import PlayerIcon from '@/components/waitingRoom/PlayerIcon.vue'


describe('Player Icon', () => {
  it('should render', () => {
    mount(PlayerIcon, {
        props: {
          player: ""
        }
    })
  })
})
