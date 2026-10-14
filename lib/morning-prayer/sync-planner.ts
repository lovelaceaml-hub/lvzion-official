/** Dormant review planner, not a fetcher. Never contacts Sheets/Firebase, matches names, or writes an occurrence. */
export type SourceRow={sourceId:string;revision:number;occurrenceId:string;hostId:string|null;kind:'gathering'|'app_day'|'cancelled';date:string};
export type CurrentRow={occurrenceId:string;sourceId:string;sourceRevision:number;date:string;kind:SourceRow['kind'];hostId:string|null;override:boolean};
export type Plan={occurrenceId:string;state:'unchanged'|'already_reviewed'|'conflict'|'reconciled'|'needs_review'|'unmapped_host'|'unmatched_occurrence';code:string};
export function planReferenceSync(current:readonly CurrentRow[],incoming:readonly SourceRow[],eligibleIds:readonly string[]):Plan[]{
 if(incoming.length===0||incoming.length>400)throw new Error('INVALID_SOURCE_BATCH');
 const seen=new Set<string>();
 return incoming.map(row=>{
  if(seen.has(row.occurrenceId))throw new Error('DUPLICATE_SOURCE_OCCURRENCE');seen.add(row.occurrenceId);
  if(!row.sourceId||!Number.isSafeInteger(row.revision)||row.revision<1)throw new Error('INVALID_SOURCE_ROW');
  const existing=current.find(c=>c.occurrenceId===row.occurrenceId);
  const result=(state:Plan['state'],code:string):Plan=>({occurrenceId:row.occurrenceId,state,code});
  if(!existing)return result('unmatched_occurrence','NO_AUTOMATIC_DATE_CREATION');
  if(existing.sourceId!==row.sourceId)return result('conflict','SOURCE_ID_CHANGED');
  if(row.revision<=existing.sourceRevision)return result('already_reviewed','NO_REPLAY');
  if(row.hostId&&!eligibleIds.includes(row.hostId))return result('unmapped_host','EXPLICIT_MEMBER_MAPPING_REQUIRED');
  const matches=existing.hostId===row.hostId&&existing.date===row.date&&existing.kind===row.kind;
  if(existing.override)return matches?result('reconciled','PRESERVE_OVERRIDE_HISTORY'):result('conflict','APP_OVERRIDE_PRESERVED');
  return matches?result('unchanged','NO_SCHEDULE_WRITE'):result('needs_review','HUMAN_SCHEDULE_REVIEW_REQUIRED');
 });
}
