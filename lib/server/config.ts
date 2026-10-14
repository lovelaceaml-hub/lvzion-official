import 'server-only';import {resolveSettings} from '../runtime-config';
export function settings(){return resolveSettings(process.env);}
