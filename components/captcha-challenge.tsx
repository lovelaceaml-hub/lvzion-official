'use client';
import {useEffect,useRef} from 'react';
import Script from 'next/script';
type Captcha={render:(container:HTMLElement,options:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void};
declare global{interface Window{hcaptcha?:Captcha}}
export default function CaptchaChallenge({siteKey,onToken,onError,resetVersion=0}:{siteKey:string;onToken:(token:string)=>void;onError:()=>void;resetVersion?:number}){
 const container=useRef<HTMLDivElement>(null),widget=useRef<string|null>(null);
 const callbacks=useRef({onToken,onError});callbacks.current={onToken,onError};
 const setup=()=>{if(container.current&&window.hcaptcha&&widget.current===null)widget.current=window.hcaptcha.render(container.current,{sitekey:siteKey,callback:(token:string)=>callbacks.current.onToken(token),'expired-callback':()=>callbacks.current.onToken(''),'error-callback':()=>{callbacks.current.onToken('');callbacks.current.onError();}});};
 useEffect(()=>{if(widget.current&&window.hcaptcha)window.hcaptcha.reset(widget.current);},[resetVersion]);
 useEffect(()=>()=>{if(widget.current&&window.hcaptcha)window.hcaptcha.remove(widget.current);widget.current=null;},[]);
 return <><div className="captcha-box" ref={container}/><Script src="https://js.hcaptcha.com/1/api.js?render=explicit" onReady={setup} onError={()=>callbacks.current.onError()} strategy="afterInteractive"/></>;
}
