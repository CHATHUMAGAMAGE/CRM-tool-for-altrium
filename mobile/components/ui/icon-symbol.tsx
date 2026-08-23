// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import {
  OpaqueColorValue,
  type StyleProp,
  type TextStyle,
} from 'react-native';

type IconMapping = Record<
  SymbolViewProps['name'],
  ComponentProps<typeof MaterialIcons>['name']
>;

type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mapping here.
 * - see Material Icons in the Icons Directory.
 * - see SF Symbols in the SF Symbols app.
 */
const MAPPING = {
  'house.fill': 'home',
  'person.2.fill': 'people',
  'person.fill': 'person',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'gearshape.fill': 'settings',
  'lock.fill': 'lock',
  'bell.fill': 'notifications',
  'info.circle.fill': 'info',
  'rectangle.portrait.and.arrow.right': 'logout',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS,
 * and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}