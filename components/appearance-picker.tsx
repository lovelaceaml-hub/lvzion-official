'use client';
import {useState,useSyncExternalStore} from 'react';
import {appearanceChoices,type Appearance} from '../lib/appearance-preference';
import {currentAppearance,saveAppearance,subscribeToAppearance} from '../lib/appearance';
import './appearance.css';

export default function AppearancePicker(){
 // Native radios must not accept a click before hydration installs their
 // handlers; otherwise an immediate change could be lost.
 const selected=useSyncExternalStore<Appearance|null>(subscribeToAppearance,currentAppearance,()=>null);
 const [status,setStatus]=useState('');
 function choose(id:Appearance){
  const saved=saveAppearance(id),name=appearanceChoices.find(c=>c.id===id)!.name;
  setStatus(saved?`${name}. Saved for this device.`:`${name} applied for now. This browser could not save your choice.`);
 }
 return <div className="ui-page">
  <main className="ui-main ui-narrow appearance-main">
   <h1 className="ui-title">Appearance</h1>
   <p className="ui-lede">Choose light or dark for this device. Each app keeps its own colors in both.</p>
   <fieldset className="appearance-options" disabled={selected===null}><legend className="ui-visually-hidden">Appearance</legend>
    {appearanceChoices.map(choice=><label key={choice.id} className="appearance-option" data-selected={selected===choice.id}>
     <input type="radio" name="appearance" value={choice.id} checked={selected===choice.id} onChange={()=>choose(choice.id)}/>
     <span className="appearance-preview" data-preview={choice.id} aria-hidden="true"><i/><i/></span>
     <span className="appearance-option-body"><strong>{choice.name}</strong><small>{choice.detail}</small></span>
    </label>)}
   </fieldset>
   <p className="ui-hint appearance-status" role="status" aria-live="polite">{status}</p>
  </main>
 </div>;
}
