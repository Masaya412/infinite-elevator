import type { Metadata } from 'next';
import Providers from './providers';
import BgmController from '../components/BgmController';
import './globals.css';

export const metadata: Metadata = { title: 'バベルエレベーター - Babel Elevator', description: 'Infinite Elevator game' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><Providers>{children}<BgmController /></Providers></body></html>;
}
