import type { Actor, Capability, Occurrence, RecapContent, Workspace } from './domain';
export const DEMO_SERIES = 'fictional-wm-series';
export const DEMO_NOW = '2026-10-14T06:55:00-07:00';
export const DEMO_SOURCE_SECTIONS = ['central','listening','clarity','follow-through'];
export const DEMO_CONTENT: RecapContent = {
  title: 'A clear message, thoughtfully shared',
  centralMessage: 'Listen carefully, explain one point clearly, and leave room for a thoughtful response.',
  centralSourceSection: 'central',
  points: [
    { label: 'Listen', text: 'Understand the question before preparing your answer.', sourceSection: 'listening' },
    { label: 'Explain', text: 'Keep one main point easy to follow.', sourceSection: 'clarity' },
    { label: 'Follow through', text: 'Return to questions that need more discussion.', sourceSection: 'follow-through' }
  ],
  explanation: [
    { heading: 'The central idea', text: 'This invented example demonstrates a balanced lesson recap. It brings together careful listening, a clear explanation, and thoughtful follow-through. It is interface demonstration content, not a real gathering, approved teaching, quotation, or assignment.', sourceSection: 'central' },
    { heading: 'Listening before answering', text: 'In the fictional source, the speaker first describes how an answer can miss the point when a question has not been understood. The recap retains that distinction rather than inventing a new exercise or adding outside teaching.', sourceSection: 'listening' },
    { heading: 'Keeping the explanation clear', text: 'The example then focuses on one main point at a time. Details belong in the written explanation where they remain readable; the compact graphic carries the central structure without trying to reproduce every paragraph.', sourceSection: 'clarity' },
    { heading: 'Following through thoughtfully', text: 'The fictional closing section returns to questions that need further discussion. No deadline, homework, scripture reference, personal testimony, or quotation is added because none is provided by this demonstration source.', sourceSection: 'follow-through' }
  ]
};
export const PERSONAS: { key: string; label: string; description: string; actor: Actor }[] = [
  ['member','Member','Gathering participation and published recaps only.',['participate','view_recap']],
  ['drafter','Draft editor','Drafting and protected source review; cannot approve or publish.',['view_recap','draft','view_source']],
  ['reviewer','Reviewer','Source access and approval; cannot draft, publish or share.',['view_recap','view_source','approve']],
  ['publisher','Publisher','Publish an approved revision; no source access or external sharing.',['view_recap','publish']],
  ['sharer','Sharing editor','Prepare the approved graphic and text; does not send anything.',['view_recap','share_external']],
  ['coordinator','Schedule coordinator','Occurrence changes and participation; no editorial authority.',['participate','view_recap','manage_schedule']],
  ['technical','Technical administrator only','No WM permissions are inherited from technical administration.',[]]
].map(([key,label,description,capabilities]) => ({ key: key as string, label: label as string, description: description as string, actor: { id: `demo-${key}`, active: true, grants: (capabilities as Capability[]).map(capability => ({ seriesId: DEMO_SERIES, capability })) } }));
export function demoOccurrence(): Occurrence { return { id:'demo-oct14', seriesId:DEMO_SERIES, startsAt:'2026-10-14T07:00:00-07:00', endsAt:'2026-10-14T07:30:00-07:00', originalStartsAt:'2026-10-14T07:00:00-07:00', timezone:'America/Los_Angeles', status:'upcoming', scheduleVerified:true, accessVerified:true, version:1 }; }
export function demoWorkspace(): Workspace {
  const older = structuredClone(DEMO_CONTENT); older.title='Making room for a thoughtful response';
  return {
    seriesId:DEMO_SERIES, version:1,
    sources:Object.fromEntries(['demo-oct12','demo-oct13','demo-oct14'].map(id => [id,{revision:1,kind:'summary',state:'ready',sections:[...DEMO_SOURCE_SECTIONS]}])),
    recaps:[
      { id:'demo-recap12', occurrenceId:'demo-oct12', revision:1, sourceRevision:1, state:'approved', content:older, authorId:'demo-drafter', reviewerId:'demo-reviewer', privacyApproved:true, summaryAcknowledged:true, generatedAt:'2026-10-12T08:00:00-07:00' },
      { id:'demo-recap13', occurrenceId:'demo-oct13', revision:1, sourceRevision:1, state:'approved', content:structuredClone(DEMO_CONTENT), authorId:'demo-drafter', reviewerId:'demo-reviewer', privacyApproved:true, summaryAcknowledged:true, generatedAt:'2026-10-13T08:00:00-07:00' },
      { id:'demo-recap14', occurrenceId:'demo-oct14', revision:1, sourceRevision:1, state:'draft', content:structuredClone(DEMO_CONTENT), authorId:'demo-drafter', privacyApproved:false, summaryAcknowledged:false, generatedAt:'2026-10-14T08:00:00-07:00' }
    ],
    published:{'demo-oct12':'demo-recap12','demo-oct13':'demo-recap13'}, history:[]
  };
}
export const FRIENDLY_ERRORS: Record<string,string> = {
  NOT_AUTHORIZED:'This preview role does not have that separate permission.', REVISION_CONFLICT:'This revision changed. Reload the latest version before continuing.', SOURCE_INCOMPLETE:'Source incomplete. Do not generate or approve a full recap.', UNSUPPORTED_CONTENT:'A point is not linked to a permitted source section.', SOURCE_CHANGED:'The source changed. Review a new revision before publishing or sharing.', INDEPENDENT_REVIEW_REQUIRED:'A different authorized reviewer must approve this draft.', REVIEW_ACKNOWLEDGEMENT_REQUIRED:'Check lesson accuracy, privacy, and the summary-only limitation first.', APPROVAL_REQUIRED:'A reviewed and approved version is required.', INVALID_TRANSITION:'This version is not in the required review state.', ALREADY_PUBLISHED:'This version is already published in the preview.', PRIVACY_REVIEW_REQUIRED:'Private details or links require removal and human review before approval.', LIVE_PIPELINE_DISABLED:'Live ingestion and generation are disabled.'
};
