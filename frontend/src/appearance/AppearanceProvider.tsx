import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  ThemeProvider,
  type PaletteMode,
} from '@mui/material/styles'

import {
  createElevenTheme,
} from '../theme'


export type AppearanceMode =
  | 'light'
  | 'dark'
  | 'system'


type AppearanceContextValue = {
  appearance: AppearanceMode
  resolvedMode: PaletteMode
  setAppearance: (mode: AppearanceMode) => void
}


const STORAGE_KEY =
  'eleven_appearance'


const AppearanceContext =
  createContext<AppearanceContextValue | null>(
    null,
  )


function readStoredAppearance():
AppearanceMode {
  try {
    const stored =
      localStorage.getItem(
        STORAGE_KEY,
      )

    if (
      stored === 'light' ||
      stored === 'dark' ||
      stored === 'system'
    ) {
      return stored
    }
  } catch {
    // Browser storage may be unavailable.
  }

  return 'system'
}


function getSystemDarkPreference():
boolean {
  return (
    typeof window !==
      'undefined' &&
    typeof window.matchMedia ===
      'function' &&
    window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
  )
}


export function AppearanceProvider({
  children,
}: {
  children: ReactNode
}) {
  const [
    appearance,
    setAppearanceState,
  ] =
    useState<AppearanceMode>(
      readStoredAppearance,
    )

  const [
    systemPrefersDark,
    setSystemPrefersDark,
  ] =
    useState(
      getSystemDarkPreference,
    )


  useEffect(
    () => {
      if (
        typeof window.matchMedia !==
        'function'
      ) {
        return
      }

      const media =
        window.matchMedia(
          '(prefers-color-scheme: dark)',
        )

      const handleChange =
        (
          event:
            MediaQueryListEvent,
        ) => {
          setSystemPrefersDark(
            event.matches,
          )
        }

      media.addEventListener(
        'change',
        handleChange,
      )

      return () => {
        media.removeEventListener(
          'change',
          handleChange,
        )
      }
    },
    [],
  )


  const resolvedMode:
  PaletteMode =
    appearance ===
      'system'
      ? systemPrefersDark
        ? 'dark'
        : 'light'
      : appearance


  useLayoutEffect(
    () => {
      document
        .documentElement
        .dataset
        .elevenTheme =
        resolvedMode

      document
        .documentElement
        .dataset
        .elevenAppearance =
        appearance

      document
        .querySelector(
          'meta[name="theme-color"]',
        )
        ?.setAttribute(
          'content',
          resolvedMode === 'dark'
            ? '#090a0c'
            : '#f7f9fc',
        )
    },
    [
      appearance,
      resolvedMode,
    ],
  )


  const setAppearance =
    (
      mode:
        AppearanceMode,
    ) => {
      setAppearanceState(
        mode,
      )

      try {
        localStorage.setItem(
          STORAGE_KEY,
          mode,
        )
      } catch {
        // Browser storage may be unavailable.
      }
    }


  const theme =
    useMemo(
      () =>
        createElevenTheme(
          resolvedMode,
        ),
      [
        resolvedMode,
      ],
    )


  const contextValue =
    useMemo(
      () => ({
        appearance,
        resolvedMode,
        setAppearance,
      }),
      [
        appearance,
        resolvedMode,
      ],
    )


  return (
    <AppearanceContext.Provider
      value={
        contextValue
      }
    >
      <ThemeProvider
        theme={
          theme
        }
      >
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  )
}


export function useAppearance():
AppearanceContextValue {
  const context =
    useContext(
      AppearanceContext,
    )

  if (
    !context
  ) {
    throw new Error(
      'useAppearance must be used within AppearanceProvider.',
    )
  }

  return context
}
