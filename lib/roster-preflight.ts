/** Pure preflight only. No I/O, database writes, account creation, or invitations. */
export const ROSTER_HEADERS = ['external_id','display_name','category_code','group_code','unit_code','status','email','phone'] as const;
export const ROSTER_LIMITS = { chars: 1_048_576, rows: 1000, field: 500 } as const;
export type RosterField = typeof ROSTER_HEADERS[number];
export type RosterRow = Record<RosterField, string>;
export type UnitReference = { id: string; categoryCode: string; groupCode: string; unitCode: string };
export type ExistingPerson = { id: string; externalId?: string; displayName: string; unitId: string; email?: string; phone?: string };
export type PreflightContext = { units: UnitReference[]; allowedUnitIds: string[]; existing: ExistingPerson[] };
export type RowIssue = { code: string; field: RosterField | 'row'; message: string; level: 'block' | 'review' };
export type PreflightRow = { rowNumber: number; data: RosterRow; unitId: string | null; state: 'ready' | 'review' | 'blocked'; issues: RowIssue[] };
export type PreflightReport = { mode: 'dry-run'; rows: PreflightRow[]; counts: { total: number; ready: number; review: number; blocked: number }; writesPerformed: 0 };
export class RosterFormatError extends Error { constructor(message: string) { super(message); this.name = 'RosterFormatError'; } }
const key = (s: string): string => s.normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
const formula = /^[=+\-@]/u;
const phone = /^\+[1-9]\d{7,14}$/;
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;

/** Bounded RFC 4180-style parser. Rejects ambiguous/malformed quoting instead of guessing. */
export function parseRosterCsv(input: string): RosterRow[] {
 if (typeof input !== 'string' || input.length > ROSTER_LIMITS.chars) throw new RosterFormatError('CSV exceeds the one-megabyte text limit.');
 if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(input)) throw new RosterFormatError('CSV contains unsupported control characters.');
 const text = input.replace(/^\uFEFF/u, '');
 const records: string[][] = []; let cells: string[] = [], value = '', quoted = false, closed = false;
 function cell() { if (value.length > ROSTER_LIMITS.field) throw new RosterFormatError('A CSV field exceeds 500 characters.'); cells.push(value.trim()); value = ''; closed = false; if (cells.length > ROSTER_HEADERS.length) throw new RosterFormatError('CSV has too many columns.'); }
 function row() { cell(); if (cells.some(c => c !== '')) records.push(cells); cells = []; if (records.length > ROSTER_LIMITS.rows + 1) throw new RosterFormatError('CSV exceeds 1,000 members.'); }
 for (let i = 0; i < text.length; i++) {
  const c = text[i];
  if (quoted) { if (c === '"') { if (text[i+1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } } else value += c; }
  else if (c === ',') cell();
  else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row(); }
  else if (closed) throw new RosterFormatError('Unexpected text after a closing quote.');
  else if (c === '"') { if (value !== '') throw new RosterFormatError('A quote must begin an empty field.'); quoted = true; }
  else value += c;
  if (value.length > ROSTER_LIMITS.field) throw new RosterFormatError('A CSV field exceeds 500 characters.');
 }
 if (quoted) throw new RosterFormatError('CSV has an unclosed quoted field.');
 if (value || cells.length || closed) row();
 if (records.length === 0) throw new RosterFormatError('CSV is empty.');
 const header = records.shift()!.map(h => h.toLowerCase());
 if (header.length !== ROSTER_HEADERS.length || new Set(header).size !== header.length || header.some(h => !(ROSTER_HEADERS as readonly string[]).includes(h))) throw new RosterFormatError('Use the eight template columns only; role and permission columns are never accepted.');
 return records.map((record, i) => {
  if (record.length !== header.length) throw new RosterFormatError(`Data row ${i+1} does not have all eight columns.`);
  return Object.fromEntries(header.map((h, j) => [h, record[j]])) as RosterRow;
 });
}

export function preflightRoster(csv: string, context: PreflightContext): PreflightReport {
 const parsed = parseRosterCsv(csv), allowed = new Set(context.allowedUnitIds);
 const unitMap = new Map<string, UnitReference[]>();
 const placementKey = (a: string, g: string, u: string) => JSON.stringify([key(a),key(g),key(u)]);
 for (const unit of context.units) { const k = placementKey(unit.categoryCode, unit.groupCode, unit.unitCode); unitMap.set(k, [...(unitMap.get(k) ?? []), unit]); }
 const rows: PreflightRow[] = parsed.map((raw, index) => {
  const data = { ...raw, display_name: raw.display_name.normalize('NFKC').replace(/\s+/gu,' ').trim(), email: raw.email.toLowerCase(), status: raw.status.toLowerCase() || 'active' };
  const issues: RowIssue[] = [];
  const add = (code: string, field: RowIssue['field'], message: string, level: RowIssue['level'] = 'block') => issues.push({code,field,message,level});
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$/.test(data.external_id)) add('invalid_external_id','external_id','Provide a stable source ID of 1–64 letters, numbers, or . _ : -.');
  if (!data.display_name || data.display_name.length > 120) add('invalid_name','display_name','Provide a display name of 1–120 characters.');
  if (!['active','inactive'].includes(data.status)) add('invalid_status','status','Status must be active or inactive.');
  if (data.email && (!email.test(data.email) || data.email.length > 254)) add('invalid_email','email','The optional email has an invalid format.');
  if (data.phone && !phone.test(data.phone)) add('invalid_phone','phone','Use international phone format beginning with + and a country code.');
  for (const field of ROSTER_HEADERS) {
   if (formula.test(data[field]) && !(field === 'phone' && phone.test(data[field]))) add('spreadsheet_formula',field,'Spreadsheet formula-like input is not accepted.');
  }
  const matches = unitMap.get(placementKey(data.category_code,data.group_code,data.unit_code)) ?? [];
  const unitId = matches.length === 1 ? matches[0].id : null;
  if (!unitId) add(matches.length > 1 ? 'ambiguous_placement' : 'unknown_placement','unit_code','The category, group, and unit must match one existing placement.');
  else if (!allowed.has(unitId)) add('outside_scope','unit_code','This placement is outside the reviewing leader’s authorized area.');
  // Matches always require review: never overwrite a person or bind an Auth account automatically.
  const matched = context.existing.filter(p => (p.externalId && key(p.externalId) === key(data.external_id)) || (key(p.displayName) === key(data.display_name) && p.unitId === unitId) || (data.email && p.email && key(p.email) === data.email) || (data.phone && p.phone === data.phone));
  if (matched.length) add('possible_existing_member','row','An existing record may match. Verify identity before any later import.','review');
  return {rowNumber:index+1,data,unitId,state:'ready',issues};
 });
 for (const field of ['external_id','email','phone'] as const) {
  const index = new Map<string, PreflightRow[]>();
  for (const row of rows) { const k = key(row.data[field]); if (k) index.set(k,[...(index.get(k) ?? []),row]); }
  for (const duplicates of index.values()) if (duplicates.length > 1) for (const row of duplicates) row.issues.push({code:field === 'external_id'?'duplicate_source_id':'shared_contact',field,message:field === 'external_id'?'This source ID appears more than once in the file.':'This contact is shared by multiple rows; verify each person.',level:field === 'external_id'?'block':'review'});
 }
 const names = new Map<string, PreflightRow[]>();
 for (const row of rows) { const k = JSON.stringify([key(row.data.display_name),row.unitId]); if (row.data.display_name) names.set(k,[...(names.get(k) ?? []),row]); }
 for (const duplicates of names.values()) if (duplicates.length > 1) for (const row of duplicates) row.issues.push({code:'duplicate_name',field:'display_name',message:'Another row has this name in the same unit. Check for a duplicate.','level':'review'});
 for (const row of rows) row.state = row.issues.some(i => i.level === 'block') ? 'blocked' : row.issues.length ? 'review' : 'ready';
 return {mode:'dry-run',writesPerformed:0,rows,counts:{total:rows.length,ready:rows.filter(r=>r.state==='ready').length,review:rows.filter(r=>r.state==='review').length,blocked:rows.filter(r=>r.state==='blocked').length}};
}
/** Redacted CLI/report summary. Never logs names, contact values, or row content. */
export function redactedPreflight(report: PreflightReport) {
 return { mode:report.mode, writesPerformed:0, counts:report.counts, issues:report.rows.flatMap(r=>r.issues.map(i=>({rowNumber:r.rowNumber,code:i.code,field:i.field,level:i.level}))) };
}
