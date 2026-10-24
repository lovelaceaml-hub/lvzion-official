'use client';
import {useState,useSyncExternalStore,type CSSProperties} from 'react';
import {appearanceThemes,DEFAULT_THEME,type ThemeId} from '../lib/appearance-themes';
import {currentTheme,saveThemePreference,subscribeToTheme} from '../lib/appearance';
import {FrameControls} from './app-frame';
import './appearance.css';

export default function AppearancePicker(){
 // Native radios and reset must not accept a click before hydration installs
 // their handlers; otherwise an immediate reset can leave the stored choice.
 const selected=useSyncExternalStore<ThemeId|null>(subscribeToTheme,currentTheme,()=>null);
 const [status,setStatus]=useState('');
 function choose(id:ThemeId){
  const saved=saveThemePreference(id),name=appearanceThemes.find(t=>t.id===id)?.name??'Current app design';
  setStatus(saved?`${name}. Saved for this device.`:`${name} applied for now. This browser could not save your choice.`);
 }
 return <div className="ui-page">
  <FrameControls title="Appearance" left={{label:'My Week',icon:'calendar',href:'/members'}} right={{label:'Profile',icon:'user',href:'/members/manage?tab=profile'}}/>
  <main className="ui-main appearance-main">
   <p className="ui-kicker">Make it feel like you</p><h1 className="ui-title">Appearance</h1>
   <p className="ui-lede">Choose a look for your app. Your choice applies on this device.</p>
   <div className="appearance-actions"><button type="button" className="ui-button ui-button-secondary" disabled={selected===null} onClick={()=>choose(DEFAULT_THEME)}>Use current app design</button><p className="ui-hint" role="status" aria-live="polite">{status}</p></div>
   <fieldset className="appearance-options" disabled={selected===null}><legend className="ui-visually-hidden">App theme</legend>
    <label className="appearance-option appearance-default" data-selected={selected===null||selected===DEFAULT_THEME}>
     <input type="radio" name="app-theme" value="default" checked={selected===null||selected===DEFAULT_THEME} onChange={()=>choose(DEFAULT_THEME)}/>
     <span><strong>Current app design</strong><small>Keep each module’s approved look, including Lavender Softform in Study Rooms.</small></span>
    </label>
    {appearanceThemes.map(theme=><label key={theme.id} className="appearance-option" data-selected={selected===theme.id}>
     <input type="radio" name="app-theme" value={theme.id} checked={selected===theme.id} onChange={()=>choose(theme.id)}/>
     <span className="appearance-option-body"><span className="appearance-swatch" aria-hidden="true" style={{'--swatch-ground':theme.background,'--swatch-panel':theme.surface,'--swatch-accent':theme.accent,'--swatch-text':theme.text} as CSSProperties}><i/><i/><i/></span><strong>{theme.name}</strong><small>{theme.family} · {theme.dark?'Dark':'Light'}</small></span>
    </label>)}
   </fieldset>
  </main>
 </div>;
}
