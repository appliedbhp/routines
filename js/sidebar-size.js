// Shared by the tool menu and administration. Width is a browser preference.
export function mountSidebarSize(sidebar){
 const key='routines.sidebarWidth.v1',defaultWidth=218;
 let preferred=defaultWidth,drag=null,frame=0;
 const max=()=>Math.max(200,Math.min(420,Math.floor(innerWidth*.45)));
 function read(){try{const value=Number(localStorage.getItem(key));return Number.isFinite(value)&&value>=200&&value<=420?value:defaultWidth;}catch{return defaultWidth;}}
 const handle=document.createElement('div');handle.className='sidebar-resize-handle no-print';handle.tabIndex=0;
 handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize navigation');handle.setAttribute('aria-controls','visual-navigation');
 handle.title='Drag to resize. Arrow keys adjust width. Double-click or press Enter to reset.';
 sidebar.append(handle);
 function sync(){document.body.style.setProperty('--preferred-sidebar-width',preferred+'px');const width=Math.min(max(),preferred);handle.setAttribute('aria-valuemin','200');handle.setAttribute('aria-valuemax',String(max()));handle.setAttribute('aria-valuenow',String(width));handle.setAttribute('aria-valuetext',width+' pixels');}
 function notify(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;dispatchEvent(new Event('resize'));});}
 function set(value){preferred=Math.round(Math.max(200,Math.min(max(),value)));sync();notify();}
 function save(){try{localStorage.setItem(key,String(preferred));}catch{}}
 function finish(cancel=false){if(!drag)return;const previous=drag;drag=null;if(cancel){preferred=previous.preferred;sync();notify();}else save();document.body.classList.remove('sidebar-resizing');if(handle.hasPointerCapture(previous.id))handle.releasePointerCapture(previous.id);}
 handle.addEventListener('pointerdown',event=>{if(event.button!==0||innerWidth<=760||document.body.classList.contains('sidebar-collapsed'))return;event.preventDefault();handle.focus();drag={id:event.pointerId,x:event.clientX,width:sidebar.getBoundingClientRect().width,preferred};handle.setPointerCapture(event.pointerId);document.body.classList.add('sidebar-resizing');});
 handle.addEventListener('pointermove',event=>{if(drag&&event.pointerId===drag.id)set(drag.width+event.clientX-drag.x);});
 handle.addEventListener('pointerup',()=>finish());handle.addEventListener('pointercancel',()=>finish(true));handle.addEventListener('lostpointercapture',()=>finish(true));
 handle.addEventListener('dblclick',()=>{set(defaultWidth);save();});
 handle.addEventListener('keydown',event=>{const step=event.shiftKey?30:10;const values={ArrowLeft:Math.min(max(),preferred)-step,ArrowRight:Math.min(max(),preferred)+step,Home:200,End:max(),Enter:defaultWidth};if(event.key==='Escape'&&drag){event.preventDefault();finish(true);}else if(Object.hasOwn(values,event.key)){event.preventDefault();set(values[event.key]);save();}});
 addEventListener('resize',()=>{if(innerWidth<=760)finish(true);sync();});
 addEventListener('storage',event=>{if(event.key===key||event.key===null){preferred=read();sync();notify();}});
 preferred=read();sync();
}
