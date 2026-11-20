import {redirect} from 'next/navigation';
import SignInForm from '../../components/sign-in-form';
import {settings} from '../../lib/server/config';
import {requireMember} from '../../lib/server/supabase';
import '../../components/concert/concert.css';
export const dynamic='force-dynamic';
export default async function SignIn({searchParams}:{searchParams:Promise<{continue?:string|string[]}>}){
 const continueToConcert=(await searchParams).continue==='concert';
 if(continueToConcert&&await requireMember().catch(()=>null))redirect('/modules/concert');
 let captchaRequired=false;
 try{captchaRequired=!settings().local&&process.env.LVZ_SIGNUP_CAPTCHA_VERIFIED==='true';}catch{}
 const form=<SignInForm captchaRequired={captchaRequired} siteKey={process.env.NEXT_PUBLIC_LVZ_HCAPTCHA_SITE_KEY??''} continueToConcert={continueToConcert}/>;
 return continueToConcert?<div data-lvz-module="concert" className="cc-auth">{form}</div>:form;
}
