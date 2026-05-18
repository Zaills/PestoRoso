import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import { mount } from '@vue/test-utils'

const AppBackgroundStub = {
  template: '<div class="mock-bg"><slot /></div>',
}

describe('App.vue', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: 'Home' } },
      { path: '/about', name: 'about', component: { template: 'About' } },
      { path: '/game', name: 'game', component: { template: 'Game' } },
    ],
  })

  it('navigates correct routes on click', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: { AppBackground: true },
      },
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await wrapper.findAll('nav a')[0].trigger('click')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('contains the RouterView for rendering pages', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: { AppBackground: true },
      },
    })

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })

})
