/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Vibrant, saturated professional palette inspired by Zepto, Blinkit & BigBasket.
 * High-end modern layout geometry, bold visual typography hierarchies, elegant card spacing.
 */

import { Platform } from 'react-native';

const tintColorLight = '#1DB954';
const tintColorDark = '#0F172A';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#E2E8F0',
  },
};

export const Theme = {
  borderRadius: 16,
  spacing: 8,
  elevation: {
    sm: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    md: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    lg: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Type = {
  display: '32px',
  heading: '24px',
  title: '20px',
  subtitle: '16px',
  body: '14px',
  caption: '12px',
};
