import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
await mkdir('public/art',{recursive:true});
for(const name of ['aster','lyra','nyx','warden','wisp','sanctum']){
 const size=name==='sanctum'?{width:768}:name==='warden'?{width:640}:name==='wisp'?{width:320}:{width:256,height:256};
 await sharp(`artwork/${name}.png`).resize({...size,kernel:'nearest'}).webp({quality:90,alphaQuality:100,effort:6}).toFile(`public/art/${name}.webp`);
 console.log(`${name}: ${Math.round((await stat(`public/art/${name}.webp`)).size/1024)} KB`);
}
