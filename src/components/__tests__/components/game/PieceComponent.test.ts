import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import PieceComponent from '@/components/game/PieceComponent.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import BlockRenderer from '@/components/game/BlockRenderer.vue'

// Mock the jsonShape asset
vi.mock('@/assets/tetriminoShape.json', () => ({
  default: {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
}))

describe('Tetrimino.vue', () => {
  const defaultProps = {
    type: 'T' as const,
    cellSize: 20,
    x: 5,
    y: 5,
    r: 0,
  }

  it('renders the correct number of BlockRenderer components for non-zero cells', () => {
    const wrapper = mount(PieceComponent, {
      props: defaultProps,
    })

    // T shape has four '1's in the mock matrix
    const blocks = wrapper.findAllComponents(BlockRenderer)
    expect(blocks.length).toBe(4)
  })

  it('passes correct props down to each BlockRenderer', () => {
    const wrapper = mount(PieceComponent, {
      props: {
        type: 'O',
        cellSize: 30,
        x: 4,
        y: 4,
        r: 0,
      },
    })

    // O shape is 2x2 with length 2, offset is Math.floor(2 / 2) = 1
    // startX = max(4 - 1, 0) = 3
    // startY = max(4 - 1, 0) = 3
    const blocks = wrapper.findAllComponents(BlockRenderer)

    expect(blocks[0].props()).toEqual({
      type: 'O',
      cellSize: 30,
      x: 3,
      y: 3,
      ghost: false,
    })
    expect(blocks[1].props()).toEqual({
      type: 'O',
      cellSize: 30,
      x: 4,
      y: 3,
      ghost: false,
    })
  })

  it('clamps startX and startY to 0 when coordinates are smaller than offset', () => {
    const wrapper = mount(PieceComponent, {
      props: {
        type: 'T', // 3x3 matrix, offset is Math.floor(3 / 2) = 1
        cellSize: 20,
        x: 0,
        y: 0,
        r: 0,
      },
    })

    const blocks = wrapper.findAllComponents(BlockRenderer)
    // First block rendered at row 0, col 1 in the T matrix
    expect(blocks[0].props('x')).toBe(1) // startX (0) + cIndex (1)
    expect(blocks[0].props('y')).toBe(0) // startY (0) + rIndex (0)
  })

  it('rotates shape correctly when r > 0', () => {
    // Original T shape:
    // [0, 1, 0]
    // [1, 1, 1]
    // [0, 0, 0]

    // Rotated 90 deg clockwise (r = 1):
    // [0, 1, 0]
    // [0, 1, 1]
    // [0, 1, 0]
    const wrapper = mount(PieceComponent, {
      props: {
        ...defaultProps,
        r: 1,
      },
    })

    const blocks = wrapper.findAllComponents(BlockRenderer)
    expect(blocks.length).toBe(4)

    // Verify rendered positions after 90 deg rotation
    // startX = max(5 - 1, 0) = 4, startY = 4
    const positions = blocks.map((b) => ({
      x: b.props('x'),
      y: b.props('y'),
    }))

    expect(positions).toEqual([
      { x: 5, y: 4 }, // (row 0, col 1)
      { x: 5, y: 5 }, // (row 1, col 1)
      { x: 6, y: 5 }, // (row 1, col 2)
      { x: 5, y: 6 }, // (row 2, col 1)
    ])
  })
})
