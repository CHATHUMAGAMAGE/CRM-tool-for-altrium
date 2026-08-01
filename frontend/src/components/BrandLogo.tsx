import { Box, type SxProps, type Theme } from '@mui/material'

import horizontalLogo from '../assets/eleven-logo-horizontal.png'
import horizontalLightLogo from '../assets/eleven-logo-horizontal-light.png'
import stackedLogo from '../assets/eleven-logo-stacked.png'

type BrandLogoProps = {
  variant?: 'horizontal' | 'stacked'
  tone?: 'dark' | 'light'
  alt?: string
  sx?: SxProps<Theme>
}

function BrandLogo({
  variant = 'horizontal',
  tone = 'dark',
  alt = 'ELEVEN CRM',
  sx,
}: BrandLogoProps) {
  let source = horizontalLogo

  if (variant === 'stacked') {
    source = stackedLogo
  } else if (tone === 'light') {
    source = horizontalLightLogo
  }

  return (
    <Box
      component="img"
      src={source}
      alt={alt}
      draggable={false}
      sx={{
        display: 'block',
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
        userSelect: 'none',
        ...sx,
      }}
    />
  )
}

export default BrandLogo