import type{ReactNode}from'react';
import Link from'next/link';
export default function FirstSelectedApp({children}:{children:ReactNode}){
 return <><aside style={{maxWidth:680,margin:'0 auto',padding:'16px 22px',background:'#e4efe6',color:'#285845',fontFamily:'Arial,sans-serif',borderBottom:'1px solid #c9decf'}}><small style={{fontSize:10,letterSpacing:1.5,fontWeight:700}}>FIRST OFFICIAL APP SELECTED</small><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,marginTop:7}}><strong style={{fontSize:14}}>Study Room Reservation</strong><Link style={{color:'#275f4c',fontSize:12,fontWeight:700}} href="/study-rooms-preview">Try the fictional booking preview →</Link></div><p style={{fontSize:11,margin:'7px 0 0'}}>Development preview only. The original room scheduler is unchanged.</p></aside>{children}</>;
}
