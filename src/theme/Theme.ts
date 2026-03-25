export const Colors = {
  background: '#07080A',
  surface: '#15171E',
  surfaceHighlight: '#1E212B',
  primary: '#7148FC', // Vibrant Purple
  secondary: '#00D59D', // Success/Mint
  accent: '#FF3366', // Pinkish Red for danger or high priority
  text: '#FFFFFF',
  textSecondary: '#A0A4AB',
  textMuted: '#6B6F76',
  border: '#2A2D36',
  vaultBackground: '#000000', // Vault is pitch black
};

export const Typography = {
  header: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
};
