'use client';
import {useEffect,useState} from 'react';
import type {DisplayScreenR2,DisplayMotionMode} from '../lib/continuous-display/operations';
import {parseDisplayMotionMode} from '../lib/continuous-display/operations';
type Command=(action:string,extra?:Record<string,unknown>)=>Promise<void>;
const modes:{id:DisplayMotionMode;label:string;description:string}[]=[
 {id:'standard',label:'Standard',description:'Balanced cinematic ambience'},
 {id:'calm',label:'Calm',description:'Slow movement for reading spaces'},
 {id:'lively',label:'Lively',description:'More active but readable motion'},
 {id:'still',label:'Still',description:'No animation or transitions'}
];
export function DisplayMotionEditor({screen,busy,command}:{screen:DisplayScreenR2;busy:boolean;command:Command}){
 const [selected,setSelected]=useState<DisplayMotionMode>(parseDisplayMotionMode(screen.motionMode));
 const current=parseDisplayMotionMode(screen.motionMode);
 useEffect(()=>setSelected(parseDisplayMotionMode(screen.motionMode)),[screen.id,screen.motionMode,screen.configVersion]);
 return <section className="cd-operations" aria-labelledby="cd-motion-title">
  <h3 id="cd-motion-title">Animation and motion</h3>
  <p>Each TV has its own approved presentation speed. Changing motion never publishes or edits church content. System reduced-motion settings always take priority.</p>
  <fieldset className="cd-motion-options">
   <legend>Ambient motion for {screen.label}</legend>
   {modes.map(m=><label key={m.id} className="cd-motion-choice">
    <input type="radio" name={'motion-'+screen.id} checked={selected===m.id} onChange={()=>setSelected(m.id)} />
    <span><strong>{m.label}</strong><small>{m.description}</small></span>
   </label>)}
  </fieldset>
  <p className="cd-subtle">Current setting: {modes.find(m=>m.id===current)?.label}. A paired player checks settings approximately every 12 seconds.</p>
  <button type="button" className="cd-button cd-primary cd-wide" disabled={busy||selected===current}
   onClick={()=>void command('motion',{expectedVersion:screen.configVersion,motionMode:selected})}>
   Save screen motion
  </button>
 </section>;
}
