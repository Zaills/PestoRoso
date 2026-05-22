import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import GameBoard from '@/components/game/GameBoard.vue'

describe('GameBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const stubs = {
    NextPiecesHandler: true,
    HoldComponent: true,
    InputHandler: true,
    BlockRenderer: true,
  }

  it('calculates the game board dimensions correctly', () => {
    const wrapper = mount(GameBoard, { global: { stubs } })
    const gameArea = wrapper.find('.game-area')

    // cellSize(22) * VISIBLE_ROWS(20) = 440
    // cellSize(22) * COLS(10) = 220
    expect(gameArea.attributes('style')).toContain('height: 440px')
    expect(gameArea.attributes('style')).toContain('width: 220px')
  })
})
