import {
  createTheme,
} from '@mui/material/styles'


const theme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#0b5cff',
    },

    background: {
      default: '#f7f9fc',
      paper: '#ffffff',
    },

    text: {
      primary: '#172033',
      secondary: '#667085',
    },

    divider: '#e5e9f0',
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
        body: {
          backgroundColor:
            '#f7f9fc',
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
          borderRadius: 10,

          boxShadow:
            '0 1px 2px rgba(16, 24, 40, 0.03)',
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
        rounded: {
          borderRadius: 10,
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
          color: '#667085',

          fontSize: 12,

          fontWeight: 600,

          backgroundColor:
            '#fafbfc',

          borderColor:
            '#e5e9f0',
        },

        body: {
          color: '#172033',

          fontSize: 14,

          borderColor:
            '#e5e9f0',
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,

          backgroundColor:
            '#ffffff',

          '& .MuiOutlinedInput-notchedOutline':
            {
              borderColor:
                '#dfe4ec',
            },

          '&:hover .MuiOutlinedInput-notchedOutline':
            {
              borderColor:
                '#cbd3df',
            },

          '&.Mui-focused .MuiOutlinedInput-notchedOutline':
            {
              borderColor:
                '#0b5cff',

              borderWidth: 1,
            },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor:
            '#e5e9f0',
        },
      },
    },
  },
})


export default theme