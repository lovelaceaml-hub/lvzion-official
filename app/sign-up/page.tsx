import SignupForm from '../../components/signup-form';
import {signupSettings} from '../../lib/signup';
export const dynamic='force-dynamic';
export default function SignUp(){let enabled=false,local=false;try{const c=signupSettings(process.env);local=c.local||c.production;enabled=true;}catch{}
 return <SignupForm enabled={enabled} local={local} siteKey={process.env.NEXT_PUBLIC_LVZ_HCAPTCHA_SITE_KEY??''}/>;
}
