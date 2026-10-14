import 'server-only';
import {checkBotId} from 'botid/server';
import {settings} from './config';
export async function verifyHuman(){
 if(!settings().production)return;
 if(process.env.LVZ_BOT_PROTECTION_ENABLED!=='true')throw new Error('Verification unavailable.');
 const result=await checkBotId({advancedOptions:{checkLevel:'basic'}});
 if(result.isBot!==false||result.isHuman!==true)throw new Error('Verification required.');
}
