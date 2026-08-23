import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

export type AppTheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  secondaryText: string;
  mutedText: string;
  border: string;
  divider: string;
  primary: string;
  primarySoft: string;
  inputBackground: string;
  placeholder: string;
  iconBackground: string;
  danger: string;
  dangerBackground: string;
  successBackground: string;
  warningBackground: string;
  statusText: string;
  modalOverlay: string;
};

const LIGHT_COLORS: ThemeColors = {
  background: '#F8FAFF',
  card: '#FFFFFF',
  cardSecondary: '#F7F8FA',
  text: '#111827',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',
  border: '#E1E5EC',
  divider: '#EEF0F4',
  primary: '#1557E8',
  primarySoft: '#EAF1FF',
  inputBackground: '#FFFFFF',
  placeholder: '#8A919F',
  iconBackground: '#EAF1FF',
  danger: '#E53935',
  dangerBackground: '#FEE2E2',
  successBackground: '#DCFCE7',
  warningBackground: '#FFF4D6',
  statusText: '#374151',
  modalOverlay: 'rgba(0, 0, 0, 0.45)',
};

const DARK_COLORS: ThemeColors = {
  background: '#0F1115',
  card: '#181B21',
  cardSecondary: '#20242C',
  text: '#F3F4F6',
  secondaryText: '#A1A7B3',
  mutedText: '#7D8491',
  border: '#2B3039',
  divider: '#292E38',
  primary: '#4B8BFF',
  primarySoft: '#202A40',
  inputBackground: '#181B21',
  placeholder: '#7D8491',
  iconBackground: '#202A40',
  danger: '#FF6B6B',
  dangerBackground: '#422326',
  successBackground: '#173B29',
  warningBackground: '#40351B',
  statusText: '#E5E7EB',
  modalOverlay: 'rgba(0, 0, 0, 0.70)',
};

type ThemeContextValue = {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<
  ThemeContextValue | undefined
>(undefined);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] =
    useState<AppTheme>('light');

  const colors =
    theme === 'dark'
      ? DARK_COLORS
      : LIGHT_COLORS;

  const value = useMemo(
    () => ({
      theme,
      colors,
      setTheme,
    }),
    [theme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useAppTheme must be used inside ThemeProvider.',
    );
  }

  return context;
}