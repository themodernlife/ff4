import { describe, expect, it } from 'vitest';
import { battleReducer as reduce, createBattle, timeline, validTargets, MAGIC } from '../src/combat';
import type { Battle, Event } from '../src/combat';
const unit=(s:Battle,id:string)=>s.units.find(u=>u.id===id)!;
const run=(s:Battle,...events:Event[])=>events.reduce(reduce,s);
const tick=(s:Battle,ms:number)=>{for(let i=0;i<ms;i+=100)s=reduce(s,{type:'tick',dt:100});return s;};
const ready=(s:Battle,id:string)=>{unit(s,id).atb=1;return s;};
function act(s:Battle,id:string,ability:string,target:string,source:'magic'|'items'|'commands'='commands') {
 s=reduce(s,{type:'open',id});if(source!=='commands')s=reduce(s,{type:'menu',level:source});
 return run(s,{type:'choose',id:ability},{type:'target',id:target});
}
describe('active time battle',()=>{
 it('advances each combatant independently and caps ready gauges',()=>{
  const a=createBattle();const b=tick(a,1000);expect(unit(b,'aster').atb).toBe(1);
  expect(unit(b,'lyra').atb).toBeCloseTo(.74+1000/7300);expect(unit(b,'warden').atb).toBeCloseTo(.1+1000/11000);
  expect(unit(a,'lyra').atb).toBe(.74);
 });
 it('freezes all clocks while any command level is open',()=>{
  let s=reduce(createBattle(),{type:'open',id:'aster'});expect(tick(s,10000)).toBe(s);
  s=reduce(s,{type:'menu',level:'magic'});expect(tick(s,10000)).toBe(s);
  s=reduce(s,{type:'choose',id:'smite'});expect(tick(s,10000)).toBe(s);
  s=reduce(s,{type:'close'});expect(tick(s,1000).elapsed).toBe(1000);
 });
 it('pauses manually and resumes without changing resources',()=>{const a=createBattle();const b=reduce(a,{type:'pause'});expect(tick(b,10000)).toBe(b);expect(tick(reduce(b,{type:'pause'}),1000).elapsed).toBe(1000);});
 it('rejects unready, enemy, fallen and busy selection',()=>{
  let s=createBattle();for(const id of ['lyra','warden','missing'])expect(reduce(s,{type:'open',id})).toBe(s);
  unit(s,'aster').hp=0;expect(reduce(s,{type:'open',id:'aster'})).toBe(s);
  s=act(createBattle(),'aster','attack','warden');ready(s,'nyx');expect(reduce(s,{type:'open',id:'nyx'})).toBe(s);
 });
 it('allows switching between any ready heroes while commands wait',()=>{const s=ready(createBattle(),'nyx');const b=run(s,{type:'open',id:'aster'},{type:'open',id:'nyx'});expect(b.menu?.actor).toBe('nyx');});
 it('deals damage, spends one turn, and rejects duplicate confirmation',()=>{
  const s=createBattle();const b=act(s,'aster','attack','warden');expect(unit(b,'warden').hp).toBeLessThan(1150);expect(unit(b,'aster').atb).toBe(0);expect(b.turns).toBe(1);expect(b.menu).toBeNull();expect(reduce(b,{type:'target',id:'warden'})).toBe(b);expect(unit(s,'warden').hp).toBe(1150);
 });
 it('consumes MP only on confirmed spell and exploits weaknesses',()=>{
  let s=ready(createBattle(),'nyx');s=run(s,{type:'open',id:'nyx'},{type:'menu',level:'magic'},{type:'choose',id:'thunder'});
  expect(unit(s,'nyx').mp).toBe(88);const b=reduce(s,{type:'target',id:'warden'});expect(unit(b,'nyx').mp).toBe(79);expect(b.action?.hits[0].weak).toBe(true);expect(b.action!.hits[0].value).toBeGreaterThan(225);
 });
 it('rejects insufficient MP, unavailable spells and empty items',()=>{
  let s=createBattle();unit(s,'aster').mp=0;s=run(s,{type:'open',id:'aster'},{type:'menu',level:'magic'});
  expect(reduce(s,{type:'choose',id:'smite'})).toBe(s);expect(reduce(s,{type:'choose',id:'flare'})).toBe(s);
  s=reduce(s,{type:'menu',level:'items'});s.inventory.potion=0;expect(reduce(s,{type:'choose',id:'potion'})).toBe(s);
 });
 it('cancellation preserves ATB, MP and inventory',()=>{
  const s=run(createBattle(),{type:'open',id:'aster'},{type:'menu',level:'items'},{type:'choose',id:'potion'},{type:'close'});
  expect(unit(s,'aster').atb).toBe(1);expect(s.inventory.potion).toBe(5);expect(unit(s,'aster').mp).toBe(34);
 });
 it('backs from target to its source and then commands',()=>{let s=run(createBattle(),{type:'open',id:'aster'},{type:'menu',level:'items'},{type:'choose',id:'potion'},{type:'back'});expect(s.menu?.level).toBe('items');s=reduce(s,{type:'back'});expect(s.menu?.level).toBe('commands');expect(reduce(s,{type:'back'}).menu).toBeNull();});
 it('heals with a spell without exceeding max HP',()=>{const s=ready(createBattle(),'lyra');unit(s,'aster').hp=500;const b=act(s,'lyra','cure','aster','magic');expect(unit(b,'aster').hp).toBe(560);expect(unit(b,'lyra').mp).toBe(71);});
 it('consumes shared healing items once and restores MP',()=>{let s=createBattle();unit(s,'lyra').hp=200;s=act(s,'aster','potion','lyra','items');expect(unit(s,'lyra').hp).toBe(350);expect(s.inventory.potion).toBe(4);s=tick(s,1000);ready(s,'aster');unit(s,'nyx').mp=1;s=act(s,'aster','ether','nyx','items');expect(unit(s,'nyx').mp).toBe(31);expect(s.inventory.ether).toBe(2);});
 it('targets fallen allies only for revival, restoring half health and empty ATB',()=>{const s=createBattle();unit(s,'nyx').hp=0;unit(s,'nyx').atb=0;expect(validTargets(s,MAGIC.find(a=>a.id==='raise')!).map(u=>u.id)).toEqual(['nyx']);const b=act(s,'aster','phoenix','nyx','items');expect(unit(b,'nyx').hp).toBe(170);expect(unit(b,'nyx').atb).toBe(0);expect(b.inventory.phoenix).toBe(1);});
 it('rejects target on the wrong team and dead offensive targets',()=>{const a=run(createBattle(),{type:'open',id:'aster'},{type:'choose',id:'attack'});expect(reduce(a,{type:'target',id:'lyra'})).toBe(a);unit(a,'warden').hp=0;expect(reduce(a,{type:'target',id:'warden'})).toBe(a);});
 it('defend spends ATB and halves subsequent incoming damage',()=>{
  let s=run(createBattle(),{type:'open',id:'aster'},{type:'defend'});expect(unit(s,'aster').defending).toBe(true);expect(unit(s,'aster').atb).toBe(0);
  s=tick(s,1000);unit(s,'lyra').hp=0;unit(s,'nyx').hp=0;unit(s,'warden').atb=1;
  const bare=structuredClone(s);unit(bare,'aster').defending=false;const a=tick(s,100);const b=tick(bare,100);expect(Math.abs(a.action!.hits[0].value-b.action!.hits[0].value/2)).toBeLessThanOrEqual(0.5);
 });
 it('enemies attack without any player input and only hit living heroes',()=>{const s=createBattle();unit(s,'lyra').hp=0;unit(s,'nyx').hp=0;unit(s,'warden').atb=1;const b=tick(s,100);expect(b.action?.actor).toBe('warden');expect(b.action?.hits[0].target).toBe('aster');expect(unit(b,'warden').atb).toBe(0);});
 it('dead units stop charging and leave the timeline',()=>{const s=createBattle();unit(s,'nyx').hp=0;unit(s,'nyx').atb=0;const b=tick(s,1000);expect(unit(b,'nyx').atb).toBe(0);expect(timeline(b).some(u=>u.id==='nyx')).toBe(false);});
 it('declares victory and stops further combat after final damage',()=>{const s=createBattle();s.units.filter(u=>u.side==='enemy').forEach(u=>u.hp=u.id==='warden'?1:0);const b=act(s,'aster','attack','warden');expect(b.status).toBe('victory');const end=tick(b,3000);expect(end.action).toBeNull();expect(end.turns).toBe(1);expect(end.elapsed).toBe(0);});
 it('declares defeat and can restart a complete clean encounter',()=>{const s=createBattle();s.units.filter(u=>u.side==='ally').forEach(u=>u.hp=u.id==='aster'?1:0);unit(s,'warden').atb=1;const b=tick(s,100);expect(b.status).toBe('defeat');expect(reduce(b,{type:'restart'})).toEqual(createBattle());});
 it('supports a winning battle through normal actions',()=>{
  let s=createBattle();let steps=0;
  while(s.status==='battle'&&steps++<2000){
   if(s.action){s=tick(s,100);continue;}
   const actor=s.units.find(u=>u.side==='ally'&&u.hp>0&&u.atb>=1);
   if(!actor){s=tick(s,100);continue;}
   const enemy=s.units.find(u=>u.side==='enemy'&&u.hp>0)!;
   const injured=s.units.find(u=>u.side==='ally'&&u.hp>0&&u.hp<180);
   if(injured&&s.inventory['hi-potion'])s=act(s,actor.id,'hi-potion',injured.id,'items');
   else if(actor.id==='nyx'&&actor.mp>=9)s=act(s,actor.id,'thunder',enemy.id,'magic');
   else if(actor.id==='lyra'&&actor.mp>=15)s=act(s,actor.id,'holy',enemy.id,'magic');
   else s=act(s,actor.id,'attack',enemy.id);
  }
  expect(s.status).toBe('victory');expect(s.turns).toBeGreaterThan(8);
 });
});
