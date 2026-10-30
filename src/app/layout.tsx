import './globals.css';
import PwaRegistration from '@/components/PwaRegistration';
import type { Metadata } from 'next';
export const metadata: Metadata = {
 title:'Codex · Local',
 description:'在私人 VPN 上使用 Ubuntu Codex 的圖形介面',
 robots:'noindex, nofollow',
 applicationName:'Codex',
 appleWebApp:{capable:true,title:'Codex',statusBarStyle:'black-translucent'},
 formatDetection:{telephone:false}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body><PwaRegistration/>{children}</body></html>}
