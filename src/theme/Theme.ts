export const MM_Colors = {
  primary: '#4052B6',
  primaryLight: '#8899FF',
  background: '#F9F5FF',
  surface: '#FFFFFF',
  surfaceContainer: '#E9E5FF',
  surfaceContainerHigh: '#E3DFFF',
  surfaceContainerLow: '#F3EEFF',
  surfaceContainerLowest: '#FFFFFF',
  text: '#2C2A51',
  textVariant: '#5A5781',
  outlineVariant: '#ACA8D7',
  onBackground: '#2C2A51',
  onSurface: '#2C2A51',
  onSurfaceVariant: '#5A5781',
  primaryDim: '#3346A9',
  secondary: '#765600',
  secondaryContainer: '#FFCA53',
  onSecondaryContainer: '#5C4300',
  tertiary: '#006947',
  tertiaryContainer: '#69F6B8',
  onTertiaryContainer: '#005A3C',
  error: '#B41340',
  white: '#FFFFFF',
  primaryContainer: '#8899FF',
};

export const Colors = MM_Colors;

export const Typography = {
  header: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: MM_Colors.text,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: MM_Colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: MM_Colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: MM_Colors.textVariant,
  },
};
