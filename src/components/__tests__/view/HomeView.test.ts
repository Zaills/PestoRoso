import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import HomeView from '@/views/HomeView.vue'

describe('Home View', () => {
  it('Should render properly ', () => {
    mount(HomeView)
  })
})
