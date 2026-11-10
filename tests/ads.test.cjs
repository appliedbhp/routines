const {test}=require('node:test'),assert=require('node:assert/strict');
const model=import('../js/ads-model.mjs');
test('only verified free access is eligible',async()=>{const {eligible}=await model;assert.equal(eligible({plan:'free'}),true);for(const a of [undefined,{}, {plan:'family'},{plan:'classroom'},{plan:'free',isAdministrator:true},{plan:'free',fullFeatures:true},{plan:'free',betaActive:true}])assert.equal(eligible(a),false);});
test('age and page targeting requires a published matching ad',async()=>{const {matches}=await model;const ad={active:true,ages:['teen'],pages:['home','self-monitor']};assert.equal(matches(ad,'teen','self-monitor'),true);assert.equal(matches(ad,'child','self-monitor'),false);assert.equal(matches(ad,'all','self-monitor'),false);assert.equal(matches(ad,'teen','monthly-planner'),false);assert.equal(matches({...ad,active:false},'teen','home'),false);assert.equal(matches({...ad,ages:['all']},'adult','home'),true);});
test('ad links accept HTTPS and reject executable or credential URLs',async()=>{const {safeUrl}=await model;assert.equal(safeUrl('https://getadhd.care/workshops'),'https://getadhd.care/workshops');for(const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:pass@example.com','not a url'])assert.equal(safeUrl(url),null);});

test('ad images reject unsafe formats and oversized payloads',async()=>{const {safeImage}=await model;assert.equal(safeImage('https://example.com/image.png'),'https://example.com/image.png');assert.equal(safeImage('data:image/webp;base64,YWJj'),'data:image/webp;base64,YWJj');for(const v of ['javascript:alert(1)','data:image/svg+xml;base64,YWJj','data:text/html;base64,YWJj','data:image/png;base64,'+'A'.repeat(700001)])assert.equal(safeImage(v),null);});

test('video ads autoplay muted inline and fall back to the image on error',async()=>{
 const {card,safeVideo}=await model;
 assert.equal(safeVideo('http://example.com/ad.mp4'),null);
 assert.equal(safeVideo('https://user:pass@example.com/ad.mp4'),null);
 const documentBefore=global.document;
 global.document={createElement(tag){
  const classes=new Set();
  return {tag,children:[],classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
   append(...children){children.forEach(child=>{child.parent=this;this.children.push(child);});},
   insertBefore(child,sibling){child.parent=this;this.children.splice(this.children.indexOf(sibling),0,child);},
   remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);},
   setAttribute(){}};
 }};
 try{
  const image='https://example.com/poster.png';
  const box=card({title:'Video ad',button:'Learn more',url:'https://example.com/product',video:'https://example.com/ad.mp4',image});
  const player=box.children[0];
  assert.equal(player.tag,'video');
  assert.ok(player.autoplay&&player.defaultMuted&&player.muted&&player.playsInline&&player.controls);
  assert.equal(player.poster,image);
  player.onerror();
  assert.equal(box.children[0].tag,'a');
  assert.equal(box.children[0].children[0].src,image);
 }finally{global.document=documentBefore;}
});
