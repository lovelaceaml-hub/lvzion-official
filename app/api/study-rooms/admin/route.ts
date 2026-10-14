import {requireMember}from'../../../../lib/server/supabase';
import {body,reply}from'../../../../lib/server/http';
import {parseAdminCommand}from'../../../../lib/study-rooms/admin';
export const dynamic='force-dynamic';
export async function GET(){try{const client=await requireMember();const {data,error}=await client.rpc('study_room_admin',{p_command:null});if(error)return reply({error:'Reservation-manager access required.'},403);return reply(data);}catch{return reply({error:'Authorized sign-in required.'},401);}}
export async function POST(request:Request){try{const command=parseAdminCommand(await body(request));const client=await requireMember();const {data,error}=await client.rpc('study_room_admin',{p_command:command});if(error)return reply({error:error.code==='40001'?'Configuration changed. Refresh before retrying.':error.code==='23505'?'This change conflicts with existing reservations. Resolve them explicitly first.':'Management change rejected.'},error.code==='42501'?403:409);return reply(data);}catch{return reply({error:'Invalid or unauthorized configuration request.'},400);}}
