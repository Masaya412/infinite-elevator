import type { Metadata } from 'next';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = { title: '無限エレベーター - Infinite Elevator', description: 'Infinite Elevator game' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><Providers>{children}</Providers></body></html>;
}
