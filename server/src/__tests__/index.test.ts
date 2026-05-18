import { describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import request from 'supertest'
import '../index'

vi.mock('./socket', () => ({
  initSocket: vi.fn(),
}))

describe('Express Server', () => {
  it('should have the status API running', async () => {
    const response = await request('http://localhost:3000').get('/api/status')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'API is running' })
  })
})
