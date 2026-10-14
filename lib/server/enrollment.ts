import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {signupSettings} from '../signup';
export async function completeEnrollment(client:SupabaseClient){
 signupSettings(process.env);
 const {data,error}=await client.auth.getUser();
 if(error||!data.user?.email_confirmed_at)throw new Error('Confirm your email first.');
 // Display name is untrusted input only. No metadata grants status, placement or roles.
 const name=data.user.user_metadata?.display_name;
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>120)throw new Error('Contact your leader to complete the profile.');
 const result=await client.rpc('complete_self_service_enrollment',{p_name:name.trim()});
 if(result.error||!result.data)throw new Error('Your profile could not be completed. Contact your authorized leader if you already have a member record.');
 return result.data;
}
