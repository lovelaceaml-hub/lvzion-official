import 'server-only';
import {requireMember} from '../server/supabase';
import {reply} from '../server/http';

export const signInRequired=()=>reply({code:'SIGN_IN',error:'An active, authorized member sign-in is required.'},401);

/** Signed-in member client, or null when the caller must sign in. Authority is checked in the database. */
export async function memberClient(){
 try{return await requireMember();}catch{return null;}
}
