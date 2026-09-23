import { useSyncExternalStore } from 'react'

import {
  getAuthSessionState,
  subscribeToAuthSession,
} from '../services/auth'


export function useAuthSessionState() {
  return useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionState,
    getAuthSessionState,
  )
}
