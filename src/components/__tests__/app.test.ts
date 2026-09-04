import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import { mount } from '@vue/test-utils'

describe('App.vue', () => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: 'Home' } },
      { path: '/:roomId/:name', name: 'game', component: { template: 'Game' } },
    ],
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
