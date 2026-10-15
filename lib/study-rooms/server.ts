import 'server-only';
import {requireMember} from '../server/supabase';
import {reply} from '../server/http';

export const SIGN_IN_REQUIRED='Authorized sign-in required.';
export const MANAGER_REQUIRED='Reservation-manager access required.';
export const signInRequired=()=>reply({error:SIGN_IN_REQUIRED},401);

/** Signed-in member client, or null when the caller must sign in. */
export async function memberClient(){
 try{return await requireMember();}catch{return null;}
}
