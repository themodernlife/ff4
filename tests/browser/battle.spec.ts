import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function setup(page:Page){
 await page.clock.install({time:new Date('2026-10-28T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-28T12:00:01Z'));
 await page.goto('/');await expect(page.getByRole('heading',{name:'The Hollow Sanctuary',exact:true})).toBeVisible();await page.clock.runFor(1000);
 await page.emulateMedia({reducedMotion:'reduce'});
}
const portrait=(page:Page,id:string)=>page.getByTestId(`portrait-${id}`);
const hp=(page:Page,name:string)=>page.getByRole('meter',{name:`${name} HP`,exact:true});
test('portraits and sprites load; the whole portrait UI fits',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await expect(page.getByRole('heading',{name:'The Hollow Sanctuary',exact:true})).toBeVisible();
 await expect(page.locator('img')).toHaveCount(12);
 await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
 expect(await page.locator('.turn').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>20&&r.x>=0&&r.right<=innerWidth;}))).toBe(true);
 const size=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,w:innerWidth,h:innerHeight}));
 expect(size.width).toBe(size.w);expect(size.height).toBe(size.h);expect(errors).toEqual([]);
 await page.screenshot({path:`test-results/battle-${test.info().project.name}.png`});
});
test('touch opens nested menus in one fixed region and freezes combat',async({page})=>{
 await setup(page);const field=await page.getByTestId('battlefield').boundingBox();const dock=await page.getByTestId('party-dock').boundingBox();
 await portrait(page,'aster').tap();await page.clock.runFor(250);const box=await page.getByTestId('command-panel').boundingBox();expect(box!.y).toBeGreaterThanOrEqual(field!.y);
 const before=await page.getByRole('meter').evaluateAll(es=>es.map(e=>e.getAttribute('aria-valuenow')));
 await page.clock.runFor(20000);expect(await page.getByRole('meter').evaluateAll(es=>es.map(e=>e.getAttribute('aria-valuenow')))).toEqual(before);
 await page.getByRole('button',{name:/Magic .*MP available/}).tap();expect(await page.getByTestId('command-panel').boundingBox()).toEqual(box);
 await page.getByRole('button',{name:/Smite A strike/}).tap();await expect(page.getByRole('heading',{name:'Choose a target'})).toBeVisible();
 expect(await page.getByTestId('command-panel').boundingBox()).toEqual(box);expect(await page.getByTestId('battlefield').boundingBox()).toEqual(field);expect(await page.getByTestId('party-dock').boundingBox()).toEqual(dock);
 await page.getByRole('button',{name:'Back',exact:true}).tap();await expect(page.getByRole('heading',{name:'Magic',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Dismiss commands'}).tap({position:{x:2,y:5}});await expect(page.getByTestId('command-panel')).toHaveCount(0);expect(await portrait(page,'aster').getAttribute('aria-label')).toContain('34 MP, ready');
});
test('attack changes HP and resets the selected hero only',async({page})=>{
 await setup(page);await portrait(page,'aster').tap();await page.getByRole('button',{name:'Attack Strike an enemy'}).tap();await page.getByRole('button',{name:'Moonstone Warden 1150 / 1150 HP'}).tap();
 await expect(page.getByTestId('command-panel')).toHaveCount(0);expect(Number(await hp(page,'Moonstone Warden').getAttribute('aria-valuenow'))).toBeLessThan(1150);expect(Number(await page.getByRole('meter',{name:'Aster ATB',exact:true}).getAttribute('aria-valuenow'))).toBe(0);
 await page.clock.runFor(1100);await expect(portrait(page,'nyx')).toBeEnabled();
});
test('ready hero switching, magic MP costs, items and Defend work through touch',async({page})=>{
 await setup(page);await page.clock.runFor(1600);await portrait(page,'aster').tap();await portrait(page,'nyx').tap();await expect(page.getByRole('dialog',{name:'Nyx: Your move'})).toBeVisible();
 await page.getByRole('button',{name:/Magic .*MP available/}).tap();await page.getByRole('button',{name:/Thunder Lightning/}).tap();await page.getByRole('button',{name:/Moonstone Warden 1150/}).tap();
 await expect(portrait(page,'nyx')).toHaveAttribute('aria-label',/79 MP/);await page.clock.runFor(1000);
 await portrait(page,'aster').tap();await page.getByRole('button',{name:'Items Shared supplies'}).tap();await page.getByRole('button',{name:/Ether Restore 30/}).tap();await page.getByRole('button',{name:/Nyx 340 \/ 340/}).tap();await expect(portrait(page,'nyx')).toHaveAttribute('aria-label',/88 MP/);
 await page.clock.runFor(1000);await portrait(page,'lyra').tap();await page.getByRole('button',{name:'Defend Take half damage'}).tap();await expect(portrait(page,'lyra')).toContainText('GUARD');
});
test('native touch swipes scroll lists with momentum, without moving the battlefield',async({page,browserName})=>{
 test.skip(browserName!=='chromium','Native touch swipes use Chromium CDP; WebKit runs touch taps and layout tests.');
 await setup(page);await portrait(page,'aster').tap();await page.getByRole('button',{name:'Items Shared supplies'}).tap();
 const field=await page.getByTestId('battlefield').boundingBox();const list=page.getByTestId('menu-content');const box=(await list.boundingBox())!;
 const session=await page.context().newCDPSession(page);const x=box.x+box.width/2;const y=box.y+box.height-15;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*15}]});
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>list.evaluate(e=>e.scrollTop)).toBeGreaterThan(40);
 expect(await list.evaluate(e=>getComputedStyle(e).touchAction)).toBe('pan-y');expect(await page.getByTestId('battlefield').boundingBox()).toEqual(field);
 await page.screenshot({path:'test-results/touch-scroll.png'});
});
test('enemy attacks animate, manual pause freezes them, restart restores all HP',async({page})=>{
 await setup(page);await page.clock.runFor(6000);
 for(let i=0;i<40&&await page.locator('.enemy-unit.attacking').count()===0;i++)await page.clock.runFor(100);
 await expect(page.locator('.enemy-unit.attacking')).toHaveCount(1);
 const before=await hp(page,'Nyx').getAttribute('aria-valuenow');expect(Number(before)).toBeLessThan(340);
 await page.getByRole('button',{name:'Pause battle',exact:true}).tap();await page.clock.runFor(20000);expect(await hp(page,'Nyx').getAttribute('aria-valuenow')).toBe(before);
 await page.getByRole('button',{name:'Start a new battle'}).tap();await expect(hp(page,'Nyx')).toHaveAttribute('aria-valuenow','340');await expect(hp(page,'Moonstone Warden')).toHaveAttribute('aria-valuenow','1150');
});
test('unattended battle reaches defeat and can be replayed',async({page})=>{
 test.setTimeout(60000);
 await setup(page);await page.clock.runFor(130000);await expect(page.getByRole('dialog',{name:'Defeat',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Try again',exact:true}).tap();await expect(hp(page,'Aster')).toHaveAttribute('aria-valuenow','560');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('a complete touch-driven battle reaches Victory',async({page})=>{
 test.setTimeout(60000);await setup(page);
 for(let turn=0;turn<70;turn++){
  if(await page.getByRole('dialog',{name:'Victory',exact:true}).count())break;
  if(await page.locator('.action-toast').count()){await page.clock.runFor(1000);continue;}
  const candidates=await page.locator('.portrait.ready:not(:disabled)').all();
  const actor=candidates.length?await candidates[0].getAttribute('data-testid'):null;
  if(!actor){await page.clock.runFor(1000);continue;}
  const id=actor.replace('portrait-','');const enemy=await page.locator('.enemy-unit:not(.vanquished)').first().getAttribute('data-testid');
  if(!enemy){await page.clock.runFor(1000);continue;}
  await page.getByTestId(actor).tap();
  const mp=Number(await page.getByRole('meter',{name:`${id==='aster'?'Aster':id==='lyra'?'Lyra':'Nyx'} MP`,exact:true}).getAttribute('aria-valuenow'));
  if(id==='nyx'&&mp>=9){await page.getByRole('button',{name:/Magic .*MP available/}).tap();await page.getByRole('button',{name:/Thunder Lightning/}).tap();}
  else if(id==='lyra'&&mp>=15){await page.getByRole('button',{name:/Magic .*MP available/}).tap();await page.getByRole('button',{name:/Holy Radiant light/}).tap();}
  else await page.getByRole('button',{name:'Attack Strike an enemy'}).tap();
  // Target through the overlay to verify the actual mobile command flow.
  await page.getByTestId('menu-content').getByRole('button').first().tap();
  await page.clock.runFor(1000);
 }
 await expect(page.getByRole('dialog',{name:'Victory',exact:true})).toBeVisible();await page.screenshot({path:`test-results/victory-${test.info().project.name}.png`});
 await page.getByRole('button',{name:'Play again',exact:true}).tap();await expect(hp(page,'Moonstone Warden')).toHaveAttribute('aria-valuenow','1150');
});
