'use client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  styles: { global: { body: { bg: '#050608', color: '#ece9e1' }, '*': { WebkitTapHighlightColor: 'transparent' } } },
  fonts: { heading: '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif', body: '"Yu Gothic", "Hiragino Kaku Gothic ProN", system-ui, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  colors: { elevator: { dark: '#080a0d', panel: '#11151a', accent: '#d8d4ca', blood: '#7b1820', steel: '#606872' } },
  components: {
    Button: {
      baseStyle: { fontWeight: '800' }
    }
  }
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
