export const ages={all:'All ages',young:'Young child · 0–5',child:'Child · 6–12',teen:'Teen · 13+',adult:'Adult'};
export const pages={home:'All Tools',routine:'Routine timer','self-monitor':'Self-monitor','homework-planner':'Homework planner','chore-chart':'Chore chart','task-strip':'Task strip','now-next-later':'Now next later','first-then':'First then','choice-board':'Choice board','token-board':'Token board','yearly-planner':'Yearly','quarterly-planner':'Quarterly','monthly-planner':'Monthly','weekly-planner':'Weekly','daily-planner':'Daily','meal-planner':'Meal planner','committed-action-tracker':'Committed actions','implementation-intentions':'Intentions',maintenance:'Maintenance',touchpoints:'Touchpoints','values-blaster':'Values blaster','my-character':'My character'};
export function eligible(access){return access?.plan==='free'&&!access.isAdministrator&&!access.fullFeatures&&!access.betaActive;}
export function matches(ad,age,page){return ad.active&&ad.pages.includes(page)&&(ad.ages.includes('all')||ad.ages.includes(age));}
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function safeVideo(value) {
 return typeof value === 'string' && value.length <= 2000 ? safeUrl(value) : null;
}

export function card(ad) {
 const e = (tag, text) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
 };
 const box = e('aside');
 box.className = 'routine-ad no-print';
 box.setAttribute('aria-label', 'Advertisement from ABHP');
 const copy = e('div');
 copy.className = 'routine-ad-copy';
 copy.append(e('small', 'Ad · From Applied Behavioral Health Practice'), e('strong', ad.title), e('p', ad.body));
 box.append(copy);

 const url = safeUrl(ad.url);
 const image = safeImage(ad.image);
 const video = safeVideo(ad.video);
 function showImage() {
  if (!image) {
   box.classList.remove('routine-ad-with-image');
   return;
  }
  const img = e('img');
  img.className = 'routine-ad-image';
  img.alt = ad.image_alt || ad.title;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  let visual = img;
  if (url) {
   visual = e('a');
   visual.className = 'routine-ad-image-link';
   visual.href = url;
   visual.target = '_blank';
   visual.rel = 'sponsored noopener noreferrer';
   visual.setAttribute('aria-label', ad.button + ' — ' + ad.title);
   visual.append(img);
  }
  img.onerror = () => {
   visual.remove();
   box.classList.remove('routine-ad-with-image');
  };
  box.classList.add('routine-ad-with-image');
  box.insertBefore(visual, copy);
  img.src = image;
 }
 if (video) {
  const player = e('video');
  player.className = 'routine-ad-image';
  player.setAttribute('aria-label', ad.title);
  player.defaultMuted = true;
  player.muted = true;
  player.autoplay = true;
  player.playsInline = true;
  player.controls = true;
  if (image) player.poster = image;
  player.onerror = () => {
   player.remove();
   showImage();
  };
  box.classList.add('routine-ad-with-image');
  box.insertBefore(player, copy);
  player.src = video;
 } else {
  showImage();
 }
 if (url) {
  const link = e('a', ad.button);
  link.href = url;
  link.target = '_blank';
  link.rel = 'sponsored noopener noreferrer';
  copy.append(link);
 }
 return box;
}

export function safeImage(value){if(typeof value!=='string'||value.length>700000)return null;return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:value.length<=2000?safeUrl(value):null;}
