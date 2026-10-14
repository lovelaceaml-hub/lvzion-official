#!/usr/bin/env node
// Offline dry run. Files are explicit user inputs; results intentionally omit personal values.
import {readFile,stat} from 'node:fs/promises';
import {preflightRoster,redactedPreflight,ROSTER_LIMITS} from '../lib/roster-preflight.ts';
const args=process.argv.slice(2);
if(args.length!==2||args.some(v=>v.startsWith('-'))){console.error('Usage: node --experimental-strip-types scripts/roster-preflight.mjs roster.csv authorized-context.json');process.exit(1);}
try{
 for(const file of args)if((await stat(file)).size>ROSTER_LIMITS.chars*4)throw new Error('Input too large.');
 const [csv,raw]=await Promise.all(args.map(p=>readFile(p,'utf8')));const context=JSON.parse(raw);
 if(!Array.isArray(context.units)||!Array.isArray(context.allowedUnitIds)||!Array.isArray(context.existing))throw new Error('Invalid context.');
 const report=preflightRoster(csv,context);console.log(JSON.stringify(redactedPreflight(report),null,2));
 process.exitCode=report.counts.blocked||report.counts.review?2:0;
}catch{console.error('Preflight could not complete. Check the template, file limits and authorized context. No input contents were logged; no records were changed.');process.exitCode=1;}
