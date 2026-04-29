import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import AboutView from '@/views/AboutView.vue'

describe("About View", () => {
  it('Should render properly', () => {
    mount(AboutView)
  })
})
