import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  getAccessToken,
  getAuthSessionState,
  ensureValidSession,
  loginUser,
  logoutUser,
  refreshAccessToken,
  subscribeToAuthSession,
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

  it('discards a delayed refresh response that completes after logout begins', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access: 'authenticated-token' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    await loginUser('user', 'password')

    let resolveRefresh!: (response: Response) => void
    const delayedRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve
    })

    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => delayedRefresh)
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const staleRefresh = refreshAccessToken()
    const logout = logoutUser()

    expect(getAccessToken()).toBeNull()
    expect(getAuthSessionState()).toBe('logging_out')

    resolveRefresh(
      new Response(
        JSON.stringify({ access: 'stale-refresh-token' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    await expect(staleRefresh).rejects.toThrow()
    await logout

    expect(getAccessToken()).toBeNull()
    expect(getAuthSessionState()).toBe('logged_out')
  })

  it('suppresses automatic refresh after explicit logout', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }))

    await logoutUser()
    fetchMock.mockClear()

    await expect(ensureValidSession()).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('publishes logout state immediately so protected routes can react', async () => {
    const states: string[] = []
    const unsubscribe = subscribeToAuthSession((state) => {
      states.push(state)
    })

    let resolveLogout!: (response: Response) => void
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveLogout = resolve
      }),
    )

    const logout = logoutUser()
    expect(states).toContain('logging_out')

    resolveLogout(new Response(null, { status: 200 }))
    await logout
    unsubscribe()

    expect(states).toEqual(['logging_out', 'logged_out'])
  })

  it('allows a new successful login after explicit logout', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access: 'new-login-token' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    await logoutUser()
    await loginUser('user', 'password')

    expect(getAccessToken()).toBe('new-login-token')
    expect(getAuthSessionState()).toBe('authenticated')
  })

  it('restores a legitimate cookie session in a fresh module instance', async () => {
    vi.resetModules()

    const payload = btoa(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 300,
    }))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    const restoredToken = `header.${payload}.signature`

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access: restoredToken }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )

    const freshAuth = await import('./auth')

    await expect(freshAuth.ensureValidSession()).resolves.toBe(true)
    expect(freshAuth.getAccessToken()).toBe(restoredToken)
    expect(freshAuth.getAuthSessionState()).toBe('authenticated')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
