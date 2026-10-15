import './globals.css';
import {designTokens} from '../lib/design-tokens.ts';
export const metadata={title:'LV Zion Official',description:'Your LV Zion member space.'};
export const viewport={themeColor:designTokens.accent,viewportFit:'cover'};
export default function RootLayout({children}){return <html lang="en"><body>{children}</body></html>;}
