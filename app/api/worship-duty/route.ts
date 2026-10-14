import {requireMember} from '../../../lib/server/supabase';
import {body} from '../../../lib/server/http';
import {settings} from '../../../lib/server/config';
import {worshipOperationalEnabled} from '../../../lib/worship-duty/activation';
import {WorshipError} from '../../../lib/worship-duty/api-contract';
import {handleWorshipRequest} from '../../../lib/worship-duty/http-handler';
export const dynamic='force-dynamic';
async function authorize(){
 if(!worshipOperationalEnabled(process.env))throw new WorshipError('Worship Duty has not been activated.',503,'disabled');
 try{settings();}catch{throw new WorshipError('Worship Duty configuration is not ready.',503,'disabled');}
 try{return await requireMember();}catch{throw new WorshipError('Sign in to an authorized member account.',401,'session');}
}
export async function GET(request:Request){return handleWorshipRequest(request,{authorize,readBody:body});}
export async function POST(request:Request){return handleWorshipRequest(request,{authorize,readBody:body});}
