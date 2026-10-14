import {requireMember} from '../../../../lib/server/supabase';
import {body} from '../../../../lib/server/http';
import {worshipOperationalEnabled} from '../../../../lib/worship-duty/activation';
import {WorshipError} from '../../../../lib/worship-duty/api-contract';
import {handleSetupRequest} from '../../../../lib/worship-duty/setup-handler';
export const dynamic='force-dynamic';
async function authorize(){
 if(!worshipOperationalEnabled(process.env))throw new WorshipError('Worship Duty has not been activated.',503,'disabled');
 try{return await requireMember();}catch{throw new WorshipError('Sign in required.',401,'session');}
}
export async function GET(r:Request){return handleSetupRequest(r,{authorize,readBody:body});}
export async function POST(r:Request){return handleSetupRequest(r,{authorize,readBody:body});}
