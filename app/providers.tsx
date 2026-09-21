'use client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: { global: { body: { bg: '#080b10', color: 'gray.100' }, '*': { WebkitTapHighlightColor: 'transparent' } } },
  fonts: { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  colors: { elevator: { dark: '#0f141d', panel: '#1a2232', accent: '#00f0ff' } }
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
