import { beforeEach, describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import request from 'supertest'
import { app } from '../index.ts'

describe('Express Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have the status API running', async () => {
    const response = await request(app).get('/api/status')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'API is running' })
  })
})
