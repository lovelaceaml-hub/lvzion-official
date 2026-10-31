import {requireMember} from '../../../lib/server/supabase';
import {body} from '../../../lib/server/http';
import {GuidanceError} from '../../../lib/guidance-teachers/domain';
import {handleGuidanceRequest} from '../../../lib/guidance-teachers/http-handler';
export const dynamic='force-dynamic';
async function authorize(){try{return await requireMember();}catch{throw new GuidanceError('Sign in to your LV Zion member account.',401,'session');}}
export async function GET(request:Request){return handleGuidanceRequest(request,{authorize,readBody:body});}
export async function POST(request:Request){return handleGuidanceRequest(request,{authorize,readBody:body});}
