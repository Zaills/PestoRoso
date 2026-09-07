import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'

describe('Home View', () => {
  it('Should render properly ', () => {
    mount(HomeView)
  })
})
