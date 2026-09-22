import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { runLogoutFlow } from './logoutFlow'


function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}


describe('runLogoutFlow', () => {
  it('navigates to login only after the server logout resolves', async () => {
    const request = deferred()
    const events: string[] = []

    const flow = runLogoutFlow({
      pending: { current: false },
      logout: async () => {
        events.push('logout-started')
        await request.promise
        events.push('logout-completed')
      },
      navigateToLogin: () => events.push('navigate-login'),
      setPending: () => undefined,
      setError: () => undefined,
    })

    expect(events).toEqual(['logout-started'])

    request.resolve()
    await flow

    expect(events).toEqual([
      'logout-started',
      'logout-completed',
      'navigate-login',
    ])
  })

  it('prevents a second logout while the first request is pending', async () => {
    const request = deferred()
    const pending = { current: false }
    const logout = vi.fn(() => request.promise)
    const navigateToLogin = vi.fn()
    const options = {
      pending,
      logout,
      navigateToLogin,
      setPending: vi.fn(),
      setError: vi.fn(),
    }

    const first = runLogoutFlow(options)
    const second = runLogoutFlow(options)

    await expect(second).resolves.toBe(false)
    expect(logout).toHaveBeenCalledOnce()

    request.resolve()
    await expect(first).resolves.toBe(true)
    expect(navigateToLogin).toHaveBeenCalledOnce()
  })

  it('does not navigate when server logout fails', async () => {
    const navigateToLogin = vi.fn()
    const setError = vi.fn()

    await expect(runLogoutFlow({
      pending: { current: false },
      logout: async () => {
        throw new Error('Unable to clear the server session.')
      },
      navigateToLogin,
      setPending: vi.fn(),
      setError,
    })).resolves.toBe(false)

    expect(navigateToLogin).not.toHaveBeenCalled()
    expect(setError).toHaveBeenLastCalledWith(
      'Unable to clear the server session.',
    )
  })

  it.each([
    'ADMIN',
    'SALES_MANAGER',
    'EXECUTIVE',
  ])('uses the same stable login destination for %s logout', async () => {
    const navigateToLogin = vi.fn()

    await runLogoutFlow({
      pending: { current: false },
      logout: async () => undefined,
      navigateToLogin,
      setPending: () => undefined,
      setError: () => undefined,
    })

    expect(navigateToLogin).toHaveBeenCalledOnce()
  })
})
