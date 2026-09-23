export type LogoutFlowOptions = {
  pending: { current: boolean }
  logout: () => Promise<void>
  navigateToLogin: () => void
  setPending: (pending: boolean) => void
  setError: (message: string) => void
  beforeLogout?: () => void
}


export async function runLogoutFlow({
  pending,
  logout,
  navigateToLogin,
  setPending,
  setError,
  beforeLogout,
}: LogoutFlowOptions): Promise<boolean> {
  if (pending.current) {
    return false
  }

  pending.current = true
  setPending(true)
  setError('')
  beforeLogout?.()

  try {
    await logout()
    navigateToLogin()

    return true
  } catch (requestError) {
    setError(
      requestError instanceof Error
        ? requestError.message
        : 'Unable to log out. Please try again.',
    )

    navigateToLogin()

    return false
  } finally {
    pending.current = false
    setPending(false)
  }
}
