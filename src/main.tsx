import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleHelp, Crosshair, Flame, FlaskConical, Heart, Moon, Pause, Play, RotateCcw, Shield, Skull, Snowflake, Sparkles, Star, Swords, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { ITEMS, MAGIC, battleReducer, createBattle, isWaiting, selectedAbility, timeline, validTargets } from './combat';
import type { Battle, Event, Hit, Unit } from './combat';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import './style.css';

const art=(name:string)=>`./art/${name}.webp`;
const labelTime=(ms:number)=>`${Math.floor(ms/60000)}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}`;
const ElementIcon=({element,size=19}:{element:string;size?:number})=>{
 const Icon=element==='fire'?Flame:element==='ice'?Snowflake:element==='thunder'?Zap:element==='light'?Sparkles:element==='physical'?Swords:element==='item'?FlaskConical:Star;
 return <Icon size={size} strokeWidth={1.7}/>;
};
function Meter({value,max,kind,label}:{value:number;max:number;kind:string;label:string}){
 return <div className={`meter ${kind}`} role="meter" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}><i style={{width:`${Math.max(0,Math.min(100,value/max*100))}%`}}/></div>;
}
function FloatingHit({hit,id}:{hit:Hit;id:number}){
 return <span key={`${id}-${hit.kind}`} className={`floating-hit ${hit.kind}`}>{hit.weak&&<small>WEAK</small>}{hit.kind==='shield'?<Shield size={28}/>:<>{hit.kind!=='damage'?'+':''}{hit.value}{hit.kind==='mp'&&<small>MP</small>}</>}</span>;
}
function Portrait({unit,state,dispatch}:{unit:Unit;state:Battle;dispatch:React.Dispatch<Event>}){
 const ready=unit.atb>=1&&unit.hp>0;
 const hits=state.action?.hits.filter(h=>h.target===unit.id)??[];
 return <button className={`portrait ${ready?'ready':''} ${state.menu?.actor===unit.id?'selected':''} ${unit.hp===0?'fallen':''} ${hits.some(h=>h.kind==='damage')?'hurt':''}`} aria-label={`${unit.name}, ${unit.hp} HP, ${unit.mp} MP, ${unit.hp===0?'fallen':ready?'ready':'charging'}`} data-testid={`portrait-${unit.id}`} onClick={()=>dispatch({type:'open',id:unit.id})} disabled={!ready||!!state.action||state.paused||state.status!=='battle'}>
   <div className="portrait-art"><img src={art(unit.art)} alt={`${unit.name}, ${unit.role}`} draggable={false}/><span className={`ready-tag ${ready?'lit':''}`}>{unit.hp===0?'FALLEN':unit.defending?<><Shield size={9}/> GUARD</>:ready?'READY':'CHARGING'}</span><div className="portrait-name">{unit.name}<small>{unit.role}</small></div></div>
   <div className="portrait-stats"><div className="statline"><span>HP</span><strong>{unit.hp}<small>/{unit.maxHp}</small></strong></div><Meter kind={unit.hp/unit.maxHp<.25?'hp low':'hp'} value={unit.hp} max={unit.maxHp} label={`${unit.name} HP`}/><div className="statline mp-text"><span>MP</span><strong>{unit.mp}<small>/{unit.maxMp}</small></strong></div><Meter kind="mp" value={unit.mp} max={unit.maxMp} label={`${unit.name} MP`}/></div>
   <div className="atb-track"><Meter kind="atb" value={unit.atb*100} max={100} label={`${unit.name} ATB`}/></div>
   {hits.map(h=><FloatingHit key={h.kind} id={state.action!.id} hit={h}/>)}
 </button>;
}
function Enemy({unit,state,dispatch}:{unit:Unit;state:Battle;dispatch:React.Dispatch<Event>}){
 const ability=selectedAbility(state);
 const targetable=state.menu?.level==='targets'&&ability&&validTargets(state,ability).some(u=>u.id===unit.id);
 const hit=state.action?.hits.find(h=>h.target===unit.id);
 const attacking=state.action?.actor===unit.id;
 return <button tabIndex={targetable?0:-1} aria-label={`Target ${unit.name}, ${unit.hp} HP`} aria-disabled={!targetable} data-testid={`enemy-${unit.id}`} onClick={()=>targetable&&dispatch({type:'target',id:unit.id})} className={`enemy-unit ${unit.art} ${unit.id} ${unit.hp===0?'vanquished':''} ${attacking?'attacking':''} ${hit?'struck':''} ${targetable?'targetable':''}`}>
  <span className="enemy-shadow"/><img className="enemy-sprite" src={art(unit.art)} alt={unit.name} draggable={false}/>
  {targetable&&<Crosshair className="target-cross" size={30}/>}
  <span className="enemy-info"><span>{unit.name}</span><Meter kind="enemy-hp" value={unit.hp} max={unit.maxHp} label={`${unit.name} HP`}/></span>
  {hit&&<FloatingHit id={state.action!.id} hit={hit}/>}
  {hit?.kind==='damage'&&<span key={state.action!.id} className={`impact ${state.action?.element}`}><i/><i/><i/></span>}
 </button>;
}
function Commands({state,dispatch}:{state:Battle;dispatch:React.Dispatch<Event>}){
 const menu=state.menu!;const actor=state.units.find(u=>u.id===menu.actor)!;
 const ability=selectedAbility(state);
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{panel.current?.querySelector<HTMLButtonElement>('[data-first]:not(:disabled)')?.focus({preventScroll:true});},[menu.level,menu.actor]);
 const title=menu.level==='commands'?'Your move':menu.level==='magic'?'Magic':menu.level==='items'?'Items':'Choose a target';
 const list=menu.level==='magic'?MAGIC.filter(a=>actor.spells.includes(a.id)):ITEMS;
 return <>
  <button className="dismiss-backdrop" aria-label="Dismiss commands" onClick={()=>dispatch({type:'close'})}/>
  <section ref={panel} className="command-panel" role="dialog" aria-label={`${actor.name}: ${title}`} data-testid="command-panel">
   <header className="command-header"><button aria-label="Back" className="icon-button" onClick={()=>dispatch({type:'back'})}><ArrowLeft size={19}/></button><div><small>{actor.name.toUpperCase()} <span>/</span> {menu.level==='targets'?ability?.name.toUpperCase():actor.role.toUpperCase()}</small><h2>{title}</h2></div><span className="wait-badge"><Pause size={10} fill="currentColor"/> WAIT</span><button className="icon-button close-command" aria-label="Close commands" onClick={()=>dispatch({type:'close'})}><X size={18}/></button></header>
   <div key={`${menu.actor}-${menu.level}`} className={`menu-content ${menu.level==='commands'?'command-grid':'menu-scroll'}`} data-testid="menu-content">
    {menu.level==='commands'?<>
     <button data-first onClick={()=>dispatch({type:'choose',id:'attack'})} className="command-choice"><Swords/><span><strong>Attack</strong><small>Strike an enemy</small></span><ChevronRight size={16}/></button>
     <button onClick={()=>dispatch({type:'menu',level:'magic'})} className="command-choice"><Sparkles/><span><strong>Magic</strong><small>{actor.mp} MP available</small></span><ChevronRight size={16}/></button>
     <button onClick={()=>dispatch({type:'menu',level:'items'})} className="command-choice"><FlaskConical/><span><strong>Items</strong><small>Shared supplies</small></span><ChevronRight size={16}/></button>
     <button onClick={()=>dispatch({type:'defend'})} className="command-choice"><Shield/><span><strong>Defend</strong><small>Take half damage</small></span><ChevronRight size={16}/></button>
    </>:menu.level==='targets'?<>
      {ability&&validTargets(state,ability).map((u,i)=><button data-first={i===0?true:undefined} className="list-choice target-choice" key={u.id} onClick={()=>dispatch({type:'target',id:u.id})}><img src={art(u.art)} alt=""/><span><strong>{u.name}</strong><small>{u.hp} / {u.maxHp} HP {u.weakness===ability.element&&<em>· Weak to {ability.element}</em>}</small></span><Crosshair size={18}/></button>)}
      {ability&&validTargets(state,ability).length===0&&<div className="empty-target"><Heart size={24}/><strong>No fallen allies</strong><span>Everyone is still in the fight.</span><button onClick={()=>dispatch({type:'back'})}>Choose another action</button></div>}
    </>:list.map((a,i)=>{
     const disabled=menu.level==='magic'?a.cost>actor.mp:!state.inventory[a.id];
     return <button data-first={i===0?true:undefined} className={`list-choice element-${a.element}`} disabled={disabled} key={a.id} onClick={()=>dispatch({type:'choose',id:a.id})}><span className="ability-icon"><ElementIcon element={a.element}/></span><span><strong>{a.name}</strong><small>{disabled?(menu.level==='magic'?'Not enough MP':'None remaining'):a.description}</small></span><span className="cost">{menu.level==='magic'?<>{a.cost}<small>MP</small></>:<>×{state.inventory[a.id]}</>}</span><ChevronRight size={15}/></button>;
    })}
   </div>
   <footer className="menu-footer"><span className="small-dot"/> Time is paused. Take a breath.<span>{menu.level==='magic'||menu.level==='items'?'Scroll for more':'Tap outside to close'}</span></footer>
  </section>
 </>;
}
function App(){
 const [state,dispatch]=useReducer(battleReducer,undefined,createBattle);
 const [systemPanel,setSystemPanel]=useState<'pause'|'guide'|'log'|null>(null);
 const [sound,setSound]=useState(false);
 const audio=useRef<AudioContext|null>(null);
 const lastAction=useRef(0);
 const pauseRef=useRef(state.paused);pauseRef.current=state.paused;
 const ready=state.units.filter(u=>u.side==='ally'&&u.hp>0&&u.atb>=1).length;
 useEffect(()=>{
  let last=performance.now();
  const interval=setInterval(()=>{const now=performance.now();if(!document.hidden)dispatch({type:'tick',dt:Math.min(100,now-last)});last=now;},50);
  return ()=>clearInterval(interval);
 },[]);
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(systemPanel){setSystemPanel(null);if(pauseRef.current)dispatch({type:'pause'});}else dispatch({type:'close'});}};
  window.addEventListener('keydown',onKey);return ()=>window.removeEventListener('keydown',onKey);
 },[systemPanel]);
 useEffect(()=>{
  if(!state.action||lastAction.current===state.action.id)return;
  lastAction.current=state.action.id;
  if(sound&&audio.current){
   const context=audio.current;const osc=context.createOscillator();const gain=context.createGain();
   osc.type=state.action.element==='physical'?'triangle':'sine';const now=context.currentTime;
   osc.frequency.setValueAtTime(state.action.hits[0]?.kind==='heal'?520:220,now);osc.frequency.exponentialRampToValueAtTime(state.action.hits[0]?.kind==='heal'?880:90,now+.17);
   gain.gain.setValueAtTime(.055,now);gain.gain.exponentialRampToValueAtTime(.001,now+.25);osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(now+.26);
  }
 },[state.action,sound]);
 function openSystem(which:'pause'|'guide'|'log') {setSystemPanel(which);if(!state.paused&&state.status==='battle')dispatch({type:'pause'});}
 function closeSystem(){setSystemPanel(null);if(state.paused)dispatch({type:'pause'});}
 function restart(){setSystemPanel(null);lastAction.current=0;dispatch({type:'restart'});}
 function toggleSound(){if(!audio.current)audio.current=new AudioContext();void audio.current.resume();setSound(s=>!s);}
 const winner=state.status==='victory';
 return <div className="app-shell">
  <aside className="desktop-note"><Moon size={26} strokeWidth={1}/><span>A POCKET-SIZED ADVENTURE</span><h1>A little magic.<br/>One more turn.</h1><p>Three heroes. One forgotten sanctuary.<br/>Make every moment count.</p><div className="desktop-controls"><span>01</span> Tap a glowing portrait.<br/><span>02</span> Choose your move.<br/><span>03</span> Turn the tide.</div><small>INSPIRED BY THE 16-BIT ERA</small></aside>
  <main className={`game ${isWaiting(state)?'waiting':''} ${state.status}`} aria-label="Moonfall active time battle" data-testid="game" onPointerDown={e=>{if(state.menu&&!(e.target as Element).closest('.command-panel,.portrait,.targetable'))dispatch({type:'close'});}}>
   <div className="world-backdrop"/>
   <header className="topbar"><div className="brand"><Moon size={21} strokeWidth={1.5}/><span>MOONFALL<small>CHRONICLES OF THE HOLLOW</small></span></div><nav><button aria-label={sound?'Mute sound':'Enable sound'} className="icon-button" onClick={toggleSound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button aria-label="Battle guide" className="icon-button" onClick={()=>openSystem('guide')}><CircleHelp size={19}/></button><button aria-label="Pause battle" className="icon-button" onClick={()=>openSystem('pause')} disabled={state.status!=='battle'}><Pause size={19}/></button></nav></header>
   <section className="timeline" aria-label="Upcoming turns"><div className="timeline-caption"><span>UP NEXT <ArrowRight size={11}/></span><span className={isWaiting(state)?'time-state stopped':'time-state'}><i/>{state.status!=='battle'?'BATTLE OVER':isWaiting(state)?'TIME PAUSED':'ACTIVE TIME'}</span></div><div className="turn-track">{timeline(state).map((u,i)=><div key={u.id} className={`turn ${u.side} ${u.atb>=1?'turn-ready':''}`} aria-label={`${i+1}. ${u.name}, ${u.atb>=1?'ready':Math.ceil((1-u.atb)*u.cycle/1000)+' seconds'}`}><img src={art(u.art)} alt=""/><span>{u.side==='ally'?u.name:u.art==='warden'?'Warden':'Wisp'}</span><i/>{i===0&&<small>{u.atb>=1?'NOW':'NEXT'}</small>}</div>)}<span className="timeline-end">···</span></div></section>
   <section className="battlefield" aria-label="The Hollow Sanctuary" data-testid="battlefield"><div className="encounter-title"><span>ENCOUNTER 01 <i/> THE MOONLIT RUINS</span><h1>The Hollow Sanctuary</h1><div className="title-ornament"><i/><Star size={10}/><i/></div></div>
    <div className="motes" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i} style={{left:`${7+i*9}%`,animationDelay:`${-i*1.3}s`,animationDuration:`${7+i%3}s`}}/>)}</div>
    {state.units.filter(u=>u.side==='enemy').map(u=><Enemy key={u.id} unit={u} state={state} dispatch={dispatch}/>)}
    {state.action&&<div key={state.action.id} className={`action-toast ${state.units.find(u=>u.id===state.action?.actor)?.side}`} role="status"><ElementIcon element={state.action.element} size={14}/><strong>{state.units.find(u=>u.id===state.action?.actor)?.name}</strong><span>{state.action.name}</span></div>}
    <div className="battle-hint">{state.menu?<><Pause size={12}/> Time pauses while you choose.</>:state.action?<><Sparkles size={13}/> {state.log[0]}</>:<><span className="hint-diamond"/>{ready>0?'Tap a glowing portrait to act.':'Your heroes are gathering their strength…'}</>}</div>
   </section>
   <section className="party-dock" aria-label="Your party" data-testid="party-dock"><div className="party-caption"><span>YOUR PARTY <small>{ready} READY</small></span><button onClick={()=>openSystem('log')} aria-label="Battle log"><BookOpen size={13}/> BATTLE LOG</button></div><div className="party-grid">{state.units.filter(u=>u.side==='ally').map(u=><Portrait key={u.id} unit={u} state={state} dispatch={dispatch}/>)}</div><div className="dock-footer"><span><i/> WAIT MODE</span><span>THE HOLLOW SANCTUARY <span className="footer-star">✧</span></span></div></section>
   {state.menu&&<Commands state={state} dispatch={dispatch}/>}
   {systemPanel&&<div className="system-backdrop" onClick={closeSystem}><section className="system-panel" role="dialog" aria-modal="true" aria-label={systemPanel==='guide'?'Battle guide':systemPanel==='log'?'Battle log':'Battle paused'} onClick={e=>e.stopPropagation()}><button className="icon-button system-close" aria-label="Close panel" onClick={closeSystem}><X size={20}/></button>
    {systemPanel==='guide'?<><Moon className="panel-emblem" size={33}/><span className="eyebrow">A MOMENT BEFORE THE STORM</span><h2>Every moment matters.</h2><p>Your heroes and enemies each have their own active-time gauge. A glowing portrait means a hero is ready.</p><div className="guide-row"><Swords/><p><strong>Choose any ready hero</strong>Tap their portrait, choose an action, then a target. Commands pause every battle timer.</p></div><div className="guide-row"><Zap/><p><strong>Find their weakness</strong>Thunder fractures stone. Holy light disperses wisps. Use Nyx’s magic and Lyra’s healing.</p></div><div className="guide-row"><Shield/><p><strong>Keep the party standing</strong>Defend halves incoming damage until that hero acts again. Items are shared; feathers revive fallen allies.</p></div><button className="primary-button" onClick={closeSystem}>Into the sanctuary <ArrowRight size={16}/></button><small className="credits">Original artwork & characters. A tribute to classic active-time RPGs. No original game assets.</small></>:
     systemPanel==='log'?<><BookOpen className="panel-emblem"/><span className="eyebrow">THE STORY SO FAR</span><h2>Battle journal</h2><div className="journal">{state.log.map((entry,i)=><p key={i}><span>{String(state.log.length-i).padStart(2,'0')}</span>{entry}</p>)}</div><button className="primary-button" onClick={closeSystem}>Return to battle <Play size={16}/></button></>:
     <><Pause className="panel-emblem" size={30}/><span className="eyebrow">THE WORLD CAN WAIT</span><h2>Take a breath.</h2><p>Your adventure will be here.<br/>All battle timers are paused.</p><button className="primary-button" onClick={closeSystem}><Play size={16}/> Resume battle</button><button className="secondary-button" onClick={restart}><RotateCcw size={16}/> Start a new battle</button></>}
   </section></div>}
   {state.status!=='battle'&&!state.action&&!systemPanel&&<div className="result-backdrop"><section className="result-panel" role="dialog" aria-modal="true" aria-label={winner?'Victory':'Defeat'}><div className="result-emblem">{winner?<Moon size={50} strokeWidth={1}/>:<Skull size={45} strokeWidth={1}/>}</div><span className="eyebrow">{winner?'THE LIGHT RETURNS':'EVEN STARS FALL'}</span><h2>{winner?'Victory':'Defeat'}</h2><p>{winner?'The sanctuary falls quiet.\nA new dawn awaits.':'The hollow claims another story.\nRise, and write a different ending.'}</p><div className="result-stats"><span><strong>{labelTime(state.elapsed)}</strong>BATTLE TIME</span><span><strong>{state.turns}</strong>ACTIONS</span><span><strong>{state.units.filter(u=>u.side==='ally'&&u.hp>0).length}/3</strong>STANDING</span></div><button className="primary-button" onClick={restart}><RotateCcw size={16}/>{winner?'Play again':'Try again'}</button><small>A MOONFALL BATTLE PROTOTYPE</small></section></div>}
  </main>
  <aside className="desktop-footer">MOONFALL <span>✦</span> AN ACTIVE-TIME BATTLE EXPERIMENT</aside>
 </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
