// IconSymbol.tsx

import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

//
// ✅ 1. Define only the SF Symbols you support
//
type SupportedSymbols =
  | 'house.fill'
  | 'paperplane.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right'
  | 'bell.fill';

//
// ✅ 2. Map SF Symbols → Material Icons (for web & Android)
//
const MAPPING: Record<
  SupportedSymbols,
  ComponentProps<typeof MaterialIcons>['name']
> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bell.fill': 'notifications',
};

//
// ✅ 3. Cross-platform Icon component
//
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SupportedSymbols;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle | ViewStyle>;
  weight?: SymbolWeight;
}) {
  if (Platform.OS === 'ios') {
    // 🍎 On iOS → use SF Symbols
    return (
      <SymbolView
        weight={weight}
        tintColor={color as string}
        resizeMode="scaleAspectFit"
        name={name}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  // 🤖 On Android & Web → fallback to MaterialIcons
  return (
    <MaterialIcons
      color={color as string}
      size={size}
      name={MAPPING[name]}
      style={style as StyleProp<TextStyle>}
    />
  );
}
