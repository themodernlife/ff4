export type Side = 'ally' | 'enemy';
export type Effect = 'damage' | 'heal' | 'revive' | 'mp' | 'shield' | 'drain' | 'elixir';
export interface Unit {
  id: string; name: string; role: string; side: Side; art: string;
  hp: number; maxHp: number; mp: number; maxMp: number;
  atb: number; cycle: number; attack: number; defense: number; defending: boolean;
  weakness?: string; spells: string[];
}
export interface Ability {
  id: string; name: string; description: string; effect: Effect;
  power: number; cost: number; target: 'enemy' | 'ally' | 'fallen'; element: string;
}
export const MAGIC: Ability[] = [
  {id:'fire',name:'Fire',description:'A searing burst of flame',effect:'damage',power:148,cost:6,target:'enemy',element:'fire'},
  {id:'blizzard',name:'Blizzard',description:'Piercing shards of ice',effect:'damage',power:150,cost:7,target:'enemy',element:'ice'},
  {id:'thunder',name:'Thunder',description:'Lightning • strong against stone',effect:'damage',power:164,cost:9,target:'enemy',element:'thunder'},
  {id:'drain',name:'Drain',description:'Steal HP from an enemy',effect:'drain',power:106,cost:10,target:'enemy',element:'dark'},
  {id:'comet',name:'Comet',description:'A falling star • heavy damage',effect:'damage',power:250,cost:18,target:'enemy',element:'star'},
  {id:'flare',name:'Flare',description:'An eruption of pure magic',effect:'damage',power:340,cost:25,target:'enemy',element:'fire'},
  {id:'cure',name:'Cure',description:'Restore 160 HP',effect:'heal',power:160,cost:5,target:'ally',element:'light'},
  {id:'cura',name:'Cura',description:'Restore 300 HP',effect:'heal',power:300,cost:12,target:'ally',element:'light'},
  {id:'raise',name:'Raise',description:'Revive with half HP',effect:'revive',power:0.5,cost:16,target:'fallen',element:'light'},
  {id:'protect',name:'Protect',description:'Halve damage until their next action',effect:'shield',power:0,cost:7,target:'ally',element:'light'},
  {id:'holy',name:'Holy',description:'Radiant light • strong against wisps',effect:'damage',power:200,cost:15,target:'enemy',element:'light'},
  {id:'smite',name:'Smite',description:'A strike of moonlit steel',effect:'damage',power:160,cost:8,target:'enemy',element:'light'},
];
export const ITEMS: Ability[] = [
  {id:'potion',name:'Potion',description:'Restore 150 HP',effect:'heal',power:150,cost:0,target:'ally',element:'item'},
  {id:'hi-potion',name:'Hi-Potion',description:'Restore 350 HP',effect:'heal',power:350,cost:0,target:'ally',element:'item'},
  {id:'ether',name:'Ether',description:'Restore 30 MP',effect:'mp',power:30,cost:0,target:'ally',element:'item'},
  {id:'phoenix',name:'Phoenix Feather',description:'Revive with half HP',effect:'revive',power:0.5,cost:0,target:'fallen',element:'item'},
  {id:'elixir',name:'Elixir',description:'Fully restore HP and MP',effect:'elixir',power:0,cost:0,target:'ally',element:'item'},
  {id:'ward',name:'Moon Ward',description:'Halve damage until their next action',effect:'shield',power:0,cost:0,target:'ally',element:'item'},
];
export const ATTACK: Ability = {id:'attack',name:'Attack',description:'Strike an enemy',effect:'damage',power:0,cost:0,target:'enemy',element:'physical'};
export interface Menu {actor: string; level: 'commands'|'magic'|'items'|'targets'; ability?: string; source?: 'magic'|'items'|'commands'}
export interface Hit {target: string; value: number; kind: 'damage'|'heal'|'mp'|'shield'; weak?: boolean}
export interface Action {id: number; actor: string; name: string; element: string; hits: Hit[]; remaining: number}
export interface Battle {
  units: Unit[]; inventory: Record<string,number>; menu: Menu|null; action: Action|null;
  status: 'battle'|'victory'|'defeat'; paused: boolean; elapsed: number; sequence: number; seed: number;
  log: string[]; turns: number;
}
export type Event = {type:'tick';dt:number}|{type:'open';id:string}|{type:'close'}|{type:'back'}|
  {type:'menu';level:'magic'|'items'}|{type:'choose';id:string}|{type:'target';id:string}|{type:'defend'}|{type:'pause'}|{type:'restart'};
const hero = (id:string,name:string,role:string,hp:number,mp:number,atb:number,cycle:number,attack:number,spells:string[]):Unit =>
  ({id,name,role,side:'ally',art:id,hp,maxHp:hp,mp,maxMp:mp,atb,cycle,attack,defense:9,defending:false,spells});
const foe = (id:string,name:string,art:string,hp:number,atb:number,cycle:number,attack:number,weakness:string):Unit =>
  ({id,name,role:art==='warden'?'Ancient guardian':'Void spirit',side:'enemy',art,hp,maxHp:hp,mp:0,maxMp:0,atb,cycle,attack,defense:art==='warden'?16:5,defending:false,weakness,spells:[]});
export function createBattle(): Battle {
 return {units:[
  hero('aster','Aster','Moon knight',560,34,1,6200,108,['smite','cure','protect']),
  hero('lyra','Lyra','Dawn healer',390,76,0.74,7300,48,['cure','cura','raise','protect','holy','fire']),
  hero('nyx','Nyx','Star mage',340,88,0.9,6800,57,['fire','blizzard','thunder','drain','comet','flare']),
  foe('warden','Moonstone Warden','warden',1150,0.10,11000,83,'thunder'),
  foe('wisp-a','Dusk Wisp','wisp',290,0.22,9300,48,'light'),
  foe('wisp-b','Dawn Wisp','wisp',290,0.04,10200,48,'light')
 ],inventory:{potion:5,'hi-potion':2,ether:3,phoenix:2,elixir:1,ward:2},menu:null,action:null,status:'battle',paused:false,elapsed:0,sequence:0,seed:7123,log:['The sanctuary stirs. Choose a ready hero.'],turns:0};
}
export function validTargets(state:Battle, ability:Ability):Unit[] {
 return state.units.filter(u=>ability.target==='enemy'?u.side==='enemy'&&u.hp>0:ability.target==='fallen'?u.side==='ally'&&u.hp===0:u.side==='ally'&&u.hp>0);
}
export function selectedAbility(state:Battle):Ability|undefined {
 const m=state.menu;
 return m?.ability==='attack'?ATTACK:(m?.source==='items'?ITEMS:MAGIC).find(a=>a.id===m?.ability);
}
export function timeline(state:Battle):Unit[] {
 return state.units.filter(u=>u.hp>0).sort((a,b)=>(1-a.atb)*a.cycle-(1-b.atb)*b.cycle);
}
export const isWaiting = (state:Battle)=>!!state.menu||state.paused;
function checkResult(state:Battle) {
 if(!state.units.some(u=>u.side==='enemy'&&u.hp>0)) state.status='victory';
 else if(!state.units.some(u=>u.side==='ally'&&u.hp>0)) state.status='defeat';
 if(state.status!=='battle') state.menu=null;
}
function pushLog(state:Battle,text:string) {state.log=[text,...state.log].slice(0,12);}
function rand(state:Battle) {state.seed=(Math.imul(1664525,state.seed)+1013904223)>>>0;return state.seed/4294967296;}
function hitDamage(state:Battle,actor:Unit,target:Unit,power:number,element:string):Hit {
 const weak=element===target.weakness;
 const variance=0.94+rand(state)*0.12;
 const damage=Math.max(1,Math.round((power-(element==='physical'?target.defense:0))*variance*(weak?1.5:1)*(target.defending?0.5:1)));
 const actual=Math.min(target.hp,damage); target.hp-=actual;
 if(target.hp===0){target.atb=0;target.defending=false;}
 void actor;
 return {target:target.id,value:actual,kind:'damage',weak};
}
function perform(state:Battle,actor:Unit,target:Unit,ability:Ability) {
 actor.defending=false; actor.atb=0;actor.mp-=ability.cost;
 const hits:Hit[]=[];
 if(ability.effect==='damage'||ability.effect==='drain') {
  const hit=hitDamage(state,actor,target,ability.id==='attack'?actor.attack:ability.power,ability.element);hits.push(hit);
  if(ability.effect==='drain'){const value=Math.min(actor.maxHp-actor.hp,hit.value);actor.hp+=value;hits.push({target:actor.id,value,kind:'heal'});}
 } else if(ability.effect==='shield') {target.defending=true;hits.push({target:target.id,value:0,kind:'shield'});}
 else if(ability.effect==='mp') {const value=Math.min(target.maxMp-target.mp,ability.power);target.mp+=value;hits.push({target:target.id,value,kind:'mp'});}
 else {
  const value=Math.min(target.maxHp-target.hp,ability.effect==='revive'?Math.ceil(target.maxHp*ability.power):ability.effect==='elixir'?target.maxHp:ability.power);
  target.hp+=value; if(ability.effect==='revive')target.atb=0;
  hits.push({target:target.id,value,kind:'heal'});
  if(ability.effect==='elixir'){const mp=target.maxMp-target.mp;target.mp=target.maxMp;hits.push({target:target.id,value:mp,kind:'mp'});}
 }
 state.action={id:++state.sequence,actor:actor.id,name:ability.name,element:ability.element,hits,remaining:900};state.turns++;
 pushLog(state,`${actor.name} · ${ability.name} → ${target.name}${hits[0].value?' · '+hits[0].value:''}${hits[0].weak?' · Weakness!':''}`);
 state.menu=null;checkResult(state);
}
export function battleReducer(previous:Battle,event:Event):Battle {
 if(event.type==='restart')return createBattle();
 if(event.type==='pause')return previous.status==='battle'?{...previous,paused:!previous.paused,menu:null}:previous;
 if(event.type==='close')return previous.menu?{...previous,menu:null}:previous;
 if(event.type==='tick') {
  if(isWaiting(previous))return previous;
  if(previous.status!=='battle')return previous.action?{...previous,action:previous.action.remaining>event.dt?{...previous.action,remaining:previous.action.remaining-event.dt}:null}:previous;
  const dt=Math.max(0,Math.min(event.dt,200));
  const state:Battle={...previous,units:previous.units.map(u=>({...u})),elapsed:previous.elapsed+dt};
  if(state.action)state.action=state.action.remaining>dt?{...state.action,remaining:state.action.remaining-dt}:null;
  for(const u of state.units)if(u.hp>0)u.atb=Math.min(1,u.atb+dt/u.cycle);
  if(!state.action){
   const enemy=state.units.find(u=>u.side==='enemy'&&u.hp>0&&u.atb>=1);
   if(enemy){const allies=state.units.filter(u=>u.side==='ally'&&u.hp>0);const target=allies[Math.floor(rand(state)*allies.length)];
    if(target)perform(state,enemy,target,{...ATTACK,name:enemy.art==='warden'?'Stone crush':'Night pulse',power:enemy.attack});
   }
  }
  return state;
 }
 if(previous.status!=='battle'||previous.paused)return previous;
 if(event.type==='open') {
  const u=previous.units.find(u=>u.id===event.id);
  if(!u||u.side!=='ally'||u.hp<=0||u.atb<1||previous.action)return previous;
  return {...previous,menu:{actor:u.id,level:'commands'}};
 }
 const menu=previous.menu; if(!menu)return previous;
 const actor=previous.units.find(u=>u.id===menu.actor);
 if(!actor||actor.hp<=0||actor.atb<1||previous.action)return previous;
 if(event.type==='back')return {...previous,menu:menu.level==='commands'?null:{actor:actor.id,level:menu.level==='targets'?menu.source??'commands':'commands'}};
 if(event.type==='menu')return {...previous,menu:{actor:actor.id,level:event.level}};
 if(event.type==='choose') {
  const source=menu.level==='items'?'items':menu.level==='magic'?'magic':'commands';
  const ability=source==='commands'&&event.id==='attack'?ATTACK:(source==='items'?ITEMS:source==='magic'?MAGIC:[]).find(a=>a.id===event.id);
  if(!ability||ability.cost>actor.mp||(source==='items'&&!previous.inventory[ability.id])||(source==='magic'&&!actor.spells.includes(ability.id)))return previous;
  return {...previous,menu:{actor:actor.id,level:'targets',source,ability:ability.id}};
 }
 if(event.type==='defend'){
  if(menu.level!=='commands')return previous;
  const state:Battle={...previous,units:previous.units.map(u=>({...u})),menu:null,sequence:previous.sequence+1,turns:previous.turns+1};
  const unit=state.units.find(u=>u.id===actor.id)!;unit.atb=0;unit.defending=true;
  state.action={id:state.sequence,actor:actor.id,name:'Defend',element:'light',hits:[{target:actor.id,value:0,kind:'shield'}],remaining:650};
  pushLog(state,`${actor.name} is defending. Incoming damage halved.`);return state;
 }
 if(event.type==='target'&&menu.level==='targets'){
  const ability=selectedAbility(previous);
  if(!ability||!validTargets(previous,ability).some(u=>u.id===event.id)||actor.mp<ability.cost||(menu.source==='items'&&!previous.inventory[ability.id]))return previous;
  const state:Battle={...previous,units:previous.units.map(u=>({...u})),inventory:{...previous.inventory}};
  if(menu.source==='items')state.inventory[ability.id]--;
  perform(state,state.units.find(u=>u.id===actor.id)!,state.units.find(u=>u.id===event.id)!,ability);return state;
 }
 return previous;
}
