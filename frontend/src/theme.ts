import {
  createTheme,
  type PaletteMode,
} from '@mui/material/styles'


const LIGHT_COLORS = {
  bg: '#f7f9fc',
  paper: '#ffffff',
  surfaceSoft: '#fafbfc',
  surfaceRaised: '#ffffff',
  input: '#ffffff',
  text: '#172033',
  textSecondary: '#667085',
  textMuted: '#98a2b3',
  border: '#e4e8ef',
  borderStrong: '#cbd3df',
  primary: '#0b5cff',
  primaryHover: '#084bd1',
  primarySoft: '#eef4ff',
  success: '#039855',
  warning: '#dc6803',
  error: '#d92d20',
  info: '#1570ef',
  hover: '#f7f9fc',
  selected: '#eef4ff',
  disabled: '#f2f4f7',
} as const


const DARK_COLORS = {
  bg: '#090A0C',
  paper: '#111318',
  surfaceSoft: '#171A21',
  surfaceRaised: '#1D2129',
  input: '#0E1014',
  text: '#F8FAFC',
  textSecondary: '#D0D5DD',
  textMuted: '#98A2B3',
  border: '#2A2F38',
  borderStrong: '#414854',
  primary: '#5B8CFF',
  primaryHover: '#7EA5FF',
  primarySoft: '#18233A',
  success: '#32D583',
  warning: '#FDB022',
  error: '#F97066',
  info: '#53B1FD',
  hover: '#1A1E25',
  selected: '#1B263C',
  disabled: '#20242C',
} as const


export function createElevenTheme(
  mode: PaletteMode,
) {
  const colors =
    mode === 'dark'
      ? DARK_COLORS
      : LIGHT_COLORS

  return createTheme({
    palette: {
      mode,

      primary: {
        main: colors.primary,
      },

      success: {
        main: colors.success,
      },

      warning: {
        main: colors.warning,
      },

      error: {
        main: colors.error,
      },

      info: {
        main: colors.info,
      },

      background: {
        default: colors.bg,
        paper: colors.paper,
      },

      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },

      divider: colors.border,

      action: {
        hover: colors.hover,
        selected: colors.selected,
        disabledBackground: colors.disabled,
      },
    },

    typography: {
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },

      h5: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },

      h6: {
        fontWeight: 700,
      },

      button: {
        fontWeight: 600,
        textTransform: 'none',
      },
    },

    shape: {
      borderRadius: 10,
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            colorScheme: mode,
          },

          body: {
            backgroundColor: 'var(--eleven-bg)',
            color: 'var(--eleven-text)',
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
            borderColor: 'var(--eleven-border)',
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },

        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 8,
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: 14,
            fontWeight: 600,
            textTransform: 'none',

            '&.MuiButton-contained': {
              boxShadow: 'none',

              '&:hover': {
                boxShadow: 'none',
              },
            },
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
            borderColor: 'var(--eleven-border)',
            borderRadius: 10,
            boxShadow:
              mode === 'dark'
                ? '0 1px 2px rgba(0, 0, 0, 0.20)'
                : '0 1px 2px rgba(16, 24, 40, 0.03)',
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: {
            '&:last-child': {
              paddingBottom: 24,
            },
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
          },

          rounded: {
            borderRadius: 10,
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
            border: '1px solid var(--eleven-border)',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
            borderColor: 'var(--eleven-border)',
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            color: 'var(--eleven-text)',
            backgroundColor: 'var(--eleven-paper)',
            backgroundImage: 'none',
            borderColor: 'var(--eleven-border)',
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 600,
          },

          sizeSmall: {
            height: 24,
            fontSize: 12,
          },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          head: {
            color: 'var(--eleven-text-secondary)',
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'var(--eleven-surface-soft)',
            borderColor: 'var(--eleven-border)',
          },

          body: {
            color: 'var(--eleven-text)',
            fontSize: 14,
            backgroundColor: 'transparent',
            borderColor: 'var(--eleven-border)',
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text)',
            borderRadius: 8,
            backgroundColor: 'var(--eleven-input-bg)',

            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--eleven-border)',
            },

            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--eleven-border-strong)',
            },

            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--eleven-primary)',
              borderWidth: 1,
            },

            '&.Mui-disabled': {
              backgroundColor: 'var(--eleven-disabled-bg)',
            },
          },

          input: {
            color: 'var(--eleven-text)',

            '&::placeholder': {
              color: 'var(--eleven-text-muted)',
              opacity: 1,
            },

            '&.Mui-disabled': {
              WebkitTextFillColor:
                'var(--eleven-text-muted)',
            },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text-secondary)',

            '&.Mui-focused': {
              color: 'var(--eleven-primary)',
            },

            '&.Mui-disabled': {
              color: 'var(--eleven-text-muted)',
            },
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text-secondary)',
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          icon: {
            color: 'var(--eleven-text-secondary)',
          },
        },
      },

      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: 'var(--eleven-border)',
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            color: 'var(--eleven-text-secondary)',

            '&.Mui-selected': {
              color: 'var(--eleven-primary)',
            },
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: 'var(--eleven-primary)',
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'var(--eleven-hover)',
            },

            '&.Mui-selected': {
              backgroundColor: 'var(--eleven-selected)',
            },

            '&.Mui-selected:hover': {
              backgroundColor: 'var(--eleven-selected)',
            },
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor:
              'var(--eleven-tooltip-bg)',
            color:
              'var(--eleven-tooltip-text)',
          },
        },
      },
    },
  })
}


const theme =
  createElevenTheme(
    'light',
  )


export default theme
