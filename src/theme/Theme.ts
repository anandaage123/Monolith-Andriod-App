import { Platform } from 'react-native';

export const MM_Colors = {
  primary: '#007AFF', // iOS Blue
  primaryLight: '#5856D6', // iOS Purple
  background: '#F2F2F7', // iOS System Gray 6
  surface: '#FFFFFF',
  surfaceContainer: '#E5E5EA', // iOS System Gray 4
  surfaceContainerHigh: '#D1D1D6', // iOS System Gray 3
  surfaceContainerLow: '#F2F2F7',
  surfaceContainerLowest: '#FFFFFF',
  text: '#000000',
  textVariant: '#3C3C43', // iOS Secondary Label (60% opacity)
  outlineVariant: '#C6C6C8', // iOS System Gray 2
  onBackground: '#000000',
  onSurface: '#000000',
  onSurfaceVariant: '#3C3C43',
  primaryDim: '#0056b3',
  secondary: '#FF9500', // iOS Orange
  secondaryContainer: '#FFCC00', // iOS Yellow
  onSecondaryContainer: '#000000',
  tertiary: '#34C759', // iOS Green
  tertiaryContainer: '#E5F9E7',
  onTertiaryContainer: '#1E7D32',
  error: '#FF3B30', // iOS Red
  white: '#FFFFFF',
  primaryContainer: '#007AFF',
};

export const Colors = MM_Colors;

const getFontFamily = (weight: string) => {
  if (Platform.OS === 'ios') return 'System';
  return 'Inter'; // Fallback for Android to match iOS look
};

export const Typography = {
  header: {
    fontFamily: getFontFamily('700'),
    fontSize: 34, // iOS Large Title
    fontWeight: '700' as const,
    color: MM_Colors.text,
    letterSpacing: 0.37,
  },
  title: {
    fontFamily: getFontFamily('600'),
    fontSize: 20, // iOS Title 3
    fontWeight: '600' as const,
    color: MM_Colors.text,
    letterSpacing: -0.45,
  },
  body: {
    fontFamily: getFontFamily('400'),
    fontSize: 17, // iOS Body
    fontWeight: '400' as const,
    color: MM_Colors.text,
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  caption: {
    fontFamily: getFontFamily('400'),
    fontSize: 12, // iOS Caption 2
    fontWeight: '400' as const,
    color: MM_Colors.textVariant,
    letterSpacing: 0,
  },
};

export const Shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4, // for android fallback
  }
};

export const Spacing = {
  padding: 16,
  borderRadius: 12,
};
