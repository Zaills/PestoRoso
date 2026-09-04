import { describe, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NotFound from '@/components/NotFound.vue'

describe('Not Founds', () => {
  it('should render properly', () => {
    mount(NotFound)
  })
})
