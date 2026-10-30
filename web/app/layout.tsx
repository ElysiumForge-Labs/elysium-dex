import type { Metadata } from 'next';
import { Providers } from './providers';
import './style.css';
export const metadata:Metadata={title:'Elysium DEX',description:'Elysium DEX. An independent HYPE and USDC exchange on Elysium testnet.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
