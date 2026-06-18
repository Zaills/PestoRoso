import { beforeEach, describe, expect, it, vi } from 'vitest'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import request from 'supertest'

vi.mock('./socket', () => ({
  initSocket: vi.fn(),
}))

const { mockNetworkInterfaces } = vi.hoisted(() => {
  return { mockNetworkInterfaces: vi.fn() };
});
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    networkInterfaces: () => mockNetworkInterfaces(),
    default: {
      ...actual,
      networkInterfaces: () => mockNetworkInterfaces(),
    },
  }
})

import { getLocalIpAddress } from '../index.ts'


describe('Express Server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLocalIpAddress()', () => {
    it('should return the first non-internal IPv4 address found', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: [
          { family: 'IPv6', internal: false, address: 'fe80::1' },
          { family: 'IPv4', internal: true, address: '127.0.0.1' },
          { family: 'IPv4', internal: false, address: '192.168.1.50' },
        ],
      });

      const ip = getLocalIpAddress();
      expect(ip).toBe('192.168.1.50');
    });

    it('should safely skip when a network interface key exists but its value is undefined', () => {
      mockNetworkInterfaces.mockReturnValue({
        brokenInterface: undefined,
        eth0: [{ family: 'IPv4', internal: false, address: '192.168.1.50' }],
      })

      const ip = getLocalIpAddress()

      expect(ip).toBe('192.168.1.50')
    })

    it('should return "localhost" if all interfaces are undefined', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: undefined,
        wlan0: undefined,
      })

      const ip = getLocalIpAddress()
      expect(ip).toBe('localhost')
    })
  });

  it('should have the status API running', async () => {
    const response = await request('http://localhost:3000').get('/api/status')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'API is running' })
  })
})
