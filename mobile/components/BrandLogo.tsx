import { Image, type ImageStyle, StyleSheet } from 'react-native';

import horizontalLogo from '../assets/images/branding/eleven-logo-horizontal.png';
import horizontalLightLogo from '../assets/images/branding/eleven-logo-horizontal-light.png';
import stackedLogo from '../assets/images/branding/eleven-logo-stacked.png';

type BrandLogoProps = {
  variant?: 'horizontal' | 'stacked';
  tone?: 'dark' | 'light';
  width?: number;
  style?: ImageStyle;
};

export default function BrandLogo({
  variant = 'horizontal',
  tone = 'dark',
  width = 180,
  style,
}: BrandLogoProps) {
  let source = horizontalLogo;

  if (variant === 'stacked') {
    source = stackedLogo;
  } else if (tone === 'light') {
    source = horizontalLightLogo;
  }

  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[
        styles.logo,
        {
          width,
          aspectRatio:
            variant === 'stacked'
              ? 1
              : 3.2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    height: undefined,
  },
});