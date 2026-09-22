import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getAccessToken,
  loginUser,
  logoutUser,
} from './auth'


afterEach(() => {
  vi.restoreAllMocks()
})


describe('logoutUser', () => {
  it('resolves after a successful server logout', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(null, { status: 200 }),
      )

    await expect(logoutUser()).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/logout/'),
      {
        method: 'POST',
        credentials: 'include',
      },
    )
    expect(getAccessToken()).toBeNull()
  })

  it('rejects a failed server logout instead of pretending it succeeded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ detail: 'Untrusted frontend origin.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await expect(logoutUser()).rejects.toThrow(
      'Untrusted frontend origin.',
    )
    expect(getAccessToken()).toBeNull()
  })

  it('rejects a network failure and still clears the access token', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Network request failed'),
    )

    await expect(logoutUser()).rejects.toThrow(
      'Network request failed',
    )
    expect(getAccessToken()).toBeNull()
  })

  it('clears an existing access token before awaiting the logout response', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access: 'temporary-access-token' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    await loginUser('user', 'password')
    expect(getAccessToken()).toBe('temporary-access-token')

    let resolveLogout!: (response: Response) => void
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveLogout = resolve
      }),
    )

    const pendingLogout = logoutUser()

    expect(getAccessToken()).toBeNull()

    resolveLogout(new Response(null, { status: 200 }))
    await pendingLogout
  })
})
