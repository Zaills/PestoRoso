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
    NextPiecesHandler: {
      template: '<div id="next-stub" />',
      methods: { newPieces: vi.fn() },
    },
    HoldComponent: {
      template: '<div id="hold-stub" />',
      methods: { addHold: vi.fn() },
    },
    GroundHandler: {
      template: '<div id="ground-stub" />',
      methods: { addGround: vi.fn() },
    },
    PieceComponent: true,
  }

  it('calculates the game board dimensions correctly', () => {
    const wrapper = mount(GameBoard, { global: { stubs } })
    const gameBoard = wrapper.find('.game')

    // cellSize(22) * height(19) = 418
    // cellSize(22) * width(10) = 220
    expect(gameBoard.attributes('style')).toContain('height: 418px')
    expect(gameBoard.attributes('style')).toContain('width: 220px')
  })

  // it('calls newPieces on the NextPiecesHandler when "New Pieces" is clicked', async () => {
  //   // Force Math.random to return 'I' (index 0 of types array)
  //   vi.spyOn(Math, 'random').mockReturnValue(0)
  //
  //   const wrapper = mount(GameBoard, { global: { stubs } })
  //
  //   // Find the NextPiecesHandler instance via the ref
  //   // Note: useTemplateRef works with the 'ref' attribute in template
  //   const nextChild = wrapper.findComponent({ ref: 'nextChild' })
  //   const spy = vi.spyOn(nextChild.vm, 'newPieces')
  //
  //   await wrapper.find('button').trigger('click') // First button is "New Pieces"
  //
  //   expect(spy).toHaveBeenCalledWith('I')
  // })
  //
  // it('calls addHold on the HoldComponent when "Hold Piece" is clicked', async () => {
  //   vi.spyOn(Math, 'random').mockReturnValue(0.5) // Should pick 'O' or 'S'
  //
  //   const wrapper = mount(GameBoard, { global: { stubs } })
  //   const holdChild = wrapper.findComponent({ ref: 'holdChild' })
  //   const spy = vi.spyOn(holdChild.vm, 'addHold')
  //
  //   // Find button by text to be safe
  //   const buttons = wrapper.findAll('button')
  //   const holdButton = buttons.find((b) => b.text() === 'Hold Piece')
  //
  //   await holdButton?.trigger('click')
  //
  //   expect(spy).toHaveBeenCalled()
  // })
})
