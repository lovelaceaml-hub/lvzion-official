/** Group leaders turn Study Rooms on or off for members of the groups they lead. */
export type GroupAccessMember={id:string;name:string;unit:string;automatic:boolean;enabled:boolean;locked:boolean;self:boolean};
export type GroupAccessData={groups:{id:string;name:string;members:GroupAccessMember[]}[]};
export type GroupAccessCommand={action:'enable'|'disable';memberId:string};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseGroupAccess(input:unknown):GroupAccessCommand{
 if(!input||typeof input!=='object')throw Error('Invalid change.');
 const {action,memberId}=input as Record<string,unknown>;
 if(action!=='enable'&&action!=='disable')throw Error('Invalid change.');
 if(typeof memberId!=='string'||!UUID.test(memberId))throw Error('Invalid member.');
 return {action,memberId};
}

/** What the switch row says about a member. Leaders always have access; manager grants are owner-controlled. */
export function accessState(m:GroupAccessMember):{on:boolean;fixed:boolean;note:string}{
 if(m.automatic)return {on:true,fixed:true,note:'On automatically as a leader'};
 if(m.locked)return {on:true,fixed:true,note:'Reservation manager'};
 return {on:m.enabled,fixed:false,note:m.enabled?'Can book study rooms':'Cannot book yet'};
}
