import SignInForm from '../../components/sign-in-form';
import {settings} from '../../lib/server/config';
export const dynamic='force-dynamic';
export default function SignIn(){let captchaRequired=false;try{captchaRequired=!settings().local&&process.env.LVZ_SIGNUP_CAPTCHA_VERIFIED==='true';}catch{}return <SignInForm captchaRequired={captchaRequired} siteKey={process.env.NEXT_PUBLIC_LVZ_HCAPTCHA_SITE_KEY??''}/>;}
