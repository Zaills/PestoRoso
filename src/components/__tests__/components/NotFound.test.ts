import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import NotFound from '@/components/NotFound.vue'


describe("Not Founds", () => {
  it('should render properly', () => {
    mount(NotFound)
  })
})
