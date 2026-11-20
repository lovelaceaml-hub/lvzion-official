import 'server-only';import nodemailer from 'nodemailer';import {settings} from './config';
export function mailConfigured(){const c=settings();return process.env.LVZ_EMAIL_DELIVERY_ENABLED==='true'&&!!process.env.LVZ_SMTP_HOST&&!!process.env.LVZ_SMTP_FROM&& (c.local||c.production||!!process.env.LVZ_TEST_EMAIL_ALLOWLIST);}
export type MailExtras={html?:string;attachments?:{filename:string;content:Buffer;cid:string;contentType:string}[]};
export function sendAccountEmail(to:string,subject:string,text:string,extras:MailExtras={}){
 return sendEmail('account',to,subject,text,extras);
}
export function sendConcertEmail(to:string,subject:string,text:string,extras:MailExtras={}){
 return sendEmail('concert',to,subject,text,extras);
}
async function sendEmail(kind:'account'|'concert',to:string,subject:string,text:string,extras:MailExtras){
 const c=settings();const env=process.env;const host=env.LVZ_SMTP_HOST;
 const concertPassword=kind==='concert'&&(c.local||c.production)?env.LVZ_CONCERT_SMTP_PASSWORD:undefined;
 const from=concertPassword ? (c.local?'events@example.invalid':'events@lvz.app') : env.LVZ_SMTP_FROM;
 const fromName=concertPassword?'LV Zion Events':'LV Zion Official';
 if(!mailConfigured()||!host||!from||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from))throw new Error('Reviewed mail configuration required.');
 if(c.local){if(host!=='127.0.0.1'||!to.endsWith('@example.invalid')||!from.endsWith('@example.invalid'))throw new Error('Local tests cannot send external mail.');}
 else if(!c.production&&!env.LVZ_TEST_EMAIL_ALLOWLIST?.toLowerCase().split(',').map(x=>x.trim()).includes(to.toLowerCase()))throw new Error('Recipient not approved for isolated testing.');
 const port=Number(env.LVZ_SMTP_PORT??(c.local?'1025':'587'));
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid mail port.');
 const transport=nodemailer.createTransport({host,port,secure:!c.local&&port===465,requireTLS:!c.local,ignoreTLS:c.local,
  auth:env.LVZ_SMTP_USER?{user:env.LVZ_SMTP_USER,pass:concertPassword||env.LVZ_SMTP_PASSWORD}:undefined,
  tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
  disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
 const result=await transport.sendMail({from:{name:fromName,address:from},to:{address:to,name:''},subject,text,textEncoding:'base64',...(extras.html?{html:extras.html}:{}),...(extras.attachments?.length?{attachments:extras.attachments.map(a=>({filename:a.filename,content:a.content,cid:a.cid,contentType:a.contentType,contentDisposition:'inline' as const}))}:{})});
 if(result.rejected.length||result.accepted.length!==1)throw new Error('Delivery not accepted.');
}
