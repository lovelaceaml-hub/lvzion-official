import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {signupSettings} from '../signup';
import {signupNames} from '../signup-name';
export async function completeEnrollment(client:SupabaseClient){
 signupSettings(process.env);
 const {data,error}=await client.auth.getUser();
 if(error||!data.user?.email_confirmed_at)throw new Error('Confirm your email first.');
 // Display name is untrusted input only. No metadata grants status, placement or roles.
 const metadata=data.user.user_metadata??{};
 const name=metadata.display_name;
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>120)throw new Error('Contact your leader to complete the profile.');
 // Accounts created before separate name fields remain on the original, tested path.
 // Never try to split a historical display name heuristically.
 const hasParts=metadata.first_name!==undefined||metadata.last_name!==undefined;
 let args:{p_name:string;p_first_name?:string;p_last_name?:string}={p_name:name.trim()};
 if(hasParts){
  const parts=signupNames({firstName:metadata.first_name,lastName:metadata.last_name});
  if(parts.name!==name)throw new Error('Your signup names are inconsistent. Contact your leader.');
  args={p_name:parts.name,p_first_name:parts.firstName,p_last_name:parts.lastName};
 }
 const result=await client.rpc('complete_self_service_enrollment',args);
 if(result.error||!result.data)throw new Error('Your profile could not be completed. Contact your authorized leader if you already have a member record.');
 return result.data;
}
