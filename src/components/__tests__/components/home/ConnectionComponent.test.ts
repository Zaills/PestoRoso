import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import ConnectionComponent from '@/components/Home/ConnectionComponent.vue'

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a><slot /></a>',
    props: ['to'],
  },
}))

describe('Connection Component', () => {
  it('should be there', async () => {
    return true
  })

})
