/* Shared visual-tool navigation; existing editors keep their own state and events. */
(async () => {
  const root = new URL('../', document.currentScript.src);
  import(new URL('js/tool-tour.js',root).href);
  await import(new URL('js/audience.js',root).href);
  const audience=globalThis.RoutineAudience;
  globalThis.ABHPFileScriptURL=new URL('js/abhp-files.js',root).href;await import(globalThis.ABHPFileScriptURL);
  const tools = [
    ['routine/', 'Routine timer', 'timer'], ['chore-chart/', 'Chore chart', 'mop'],
    ['first-then/', 'First–Then board', 'checklist_rtl'], ['choice-board/', 'Choice board', 'developer_board'],
    ['task-strip/', 'Task strip', 'ballot'], ['now-next-later/', 'Now–Next–Later', 'steppers'],
    ['calm-down/', 'Calm-down board', '♡'],
    ['self-monitor/', 'Self-monitor', 'done_all'],
    ['homework-planner/', 'Homework planner', 'edit_document'],
    ['token-board/', 'Token board', '★'],
    ['yearly-planner/', 'Yearly', 'calendar_year'], ['quarterly-planner/', 'Quarterly', 'calendar_quarter'], ['monthly-planner/', 'Monthly', 'calendar_month'], ['weekly-planner/', 'Weekly', 'calendar_month'], ['daily-planner/', 'Daily', 'calendar_month'], ['committed-action-tracker/', 'Commitments', '✓'],
    ['meal-planner/', 'Meal planning', 'restaurant'], ['implementation-intentions/', 'Intentions', '◎'],
    ['maintenance/', 'Maintenance', '▣'], ['touchpoints/', 'Touchpoints', '♡'], ['side-quest/', 'Side Quest', 'joystick'], ['values-blaster/', 'Values Blaster', '✧'], ['my-character/', 'My Character', 'person'], ['whats-new/', 'What’s New', '✦']
  ];
  const iconFont=document.createElement('link');iconFont.rel='stylesheet';iconFont.href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=edit_document&display=block';document.head.append(iconFont);
  document.body.classList.add('visual-workspace', 'calm-ui');
  const sidebar = document.createElement('aside');
  sidebar.className = 'workspace-sidebar no-print';
  const toggle = document.createElement('button');
  toggle.className = 'sidebar-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'visual-navigation');
  const nav = document.createElement('nav');
  nav.id = 'visual-navigation';
  nav.setAttribute('aria-label', 'Create a visual');
  const home = document.createElement('a');home.className='workspace-home';home.href=root.href;
  const homeMark=document.createElement('span');homeMark.className='workspace-home-mark';homeMark.setAttribute('aria-hidden','true');homeMark.innerHTML='<svg viewBox="0 0 16 16" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M6.705 8.139a.25.25 0 0 0-.288-.376l-1.5.5.159.474.808-.27-.595.894a.25.25 0 0 0 .287.376l.808-.27-.595.894a.25.25 0 0 0 .287.376l1.5-.5-.159-.474-.808.27.596-.894a.25.25 0 0 0-.288-.376l-.808.27z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m-6.202-4.751 1.988-1.657a4.5 4.5 0 0 1 7.537-4.623L7.497 6.5l1 2.5 1.333 3.11c-.56.251-1.18.39-1.833.39a4.5 4.5 0 0 1-1.592-.29L4.747 14.2a7.03 7.03 0 0 1-2.949-2.951M12.496 8a4.5 4.5 0 0 1-1.703 3.526L9.497 8.5l2.959-1.11q.04.3.04.61"/></svg>';
  const homeName=document.createElement('span');homeName.className='nav-label';homeName.textContent='Tools';home.append(homeMark,homeName);
  const overview=document.createElement('a');overview.href=root.href;overview.className='tools-overview';overview.textContent='All tools';overview.setAttribute('aria-label','All visual support tools');if(location.pathname.replace(/index\.html$/, '')===overview.pathname)overview.setAttribute('aria-current','page');
  nav.append(overview);
  const groupFor = {'Routine timer':'Daily routines','Chore chart':'Daily routines','Task strip':'Daily routines','Now–Next–Later':'Daily routines','First–Then board':'Choices & transitions','Choice board':'Choices & transitions','Calm-down board':'Choices & transitions','Self-monitor':'Learning & focus','Homework planner':'Learning & focus','Token board':'Learning & focus','Yearly':'Planning','Quarterly':'Planning','Monthly':'Planning','Weekly':'Planning','Daily':'Planning','Commitments':'Values and actions','Meal planning':'Planning','Intentions':'Values and actions','Maintenance':'Memory','Touchpoints':'Memory','Side Quest':'Arcade','Values Blaster':'Arcade','My Character':'Arcade','What’s New':'Resources'};
  globalThis.RoutineToolCatalog=tools.filter(t=>t[0]!=='whats-new/').map(t=>({id:t[0].replace('/',''),label:t[1],group:groupFor[t[1]]}));
  let collapsedGroups={};try{collapsedGroups=JSON.parse(localStorage.getItem('routines.collapsedGroups.v1')||'{}');}catch{}
  const order=['Daily routines','Choices & transitions','Learning & focus','Planning','Values and actions','Memory','Arcade','Resources'];
  const arranged=order.flatMap(group=>tools.filter(tool=>groupFor[tool[1]]===group));let lastGroup='';
  for (const [path, name, symbol] of arranged) {
    const group=groupFor[name];if(group!==lastGroup){const label=document.createElement('p');label.className='sidebar-heading';label.dataset.toolGroup=group;const fold=document.createElement('button');fold.type='button';fold.textContent=group;fold.setAttribute('aria-expanded',String(!collapsedGroups[group]));fold.onclick=()=>{collapsedGroups[group]=!collapsedGroups[group];fold.setAttribute('aria-expanded',String(!collapsedGroups[group]));nav.querySelectorAll('a[data-tool-group]').forEach(a=>{if(a.dataset.toolGroup===group)a.classList.toggle('category-collapsed',!!collapsedGroups[group]);});try{localStorage.setItem('routines.collapsedGroups.v1',JSON.stringify(collapsedGroups));}catch{}};label.append(fold);nav.append(label);lastGroup=group;}
    const link = document.createElement('a'); link.href = new URL(path, root).href;
    link.dataset.tool=path.replace(/\/$/,'');link.dataset.toolGroup=group;link.classList.toggle('category-collapsed',!!collapsedGroups[group]);
    link.title = name; link.setAttribute('aria-label', name);
    const icon = document.createElement('span'); icon.className = 'nav-icon'; icon.textContent = symbol; icon.setAttribute('aria-hidden','true');
    if(['joystick','sports_esports','timer','mop','checklist_rtl','developer_board','ballot','steppers','done_all','calendar_year','calendar_quarter','calendar_month','restaurant','person'].includes(symbol)){icon.textContent='';icon.classList.add('nav-material-icon');const image=`url("${new URL('assets/navigation/'+symbol+'.svg',root).href}")`;icon.style.maskImage=image;icon.style.webkitMaskImage=image;}
    if(symbol==='edit_document'){icon.style.fontFamily='Material Symbols Outlined';icon.style.fontWeight='normal';icon.style.fontStyle='normal';icon.style.fontSize='24px';icon.style.letterSpacing='normal';icon.style.textTransform='none';icon.style.fontFeatureSettings='"liga"';}
    const label = document.createElement('span'); label.className = 'nav-label'; label.textContent = name;
    link.append(icon, label);
    if (new URL(link.href).pathname === location.pathname.replace(/index\.html$/, '')) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  function applyAudience(preference=audience.read()){
    for(const link of nav.querySelectorAll('[data-tool]'))link.hidden=link.dataset.tool!=='whats-new'&&!audience.allows(preference.age,link.dataset.tool,preference.tools);
    for(const heading of nav.querySelectorAll('p[data-tool-group]'))heading.hidden=![...nav.querySelectorAll('a[data-tool-group]')].some(link=>link.dataset.toolGroup===heading.dataset.toolGroup&&!link.hidden);
    document.body.classList.toggle('routine-text-only',preference.textOnly);
    const palette=audience.themes[preference.theme];document.body.dataset.siteTheme=preference.theme;
    ['--ui-blue','--ui-soft','--ui-canvas','--ui-ink'].forEach((key,i)=>document.documentElement.style.setProperty(key,palette[i+1]));
    document.documentElement.style.setProperty('--ui-blue-hover',palette[1]);

  }
  function defaultToolTheme(){
    // Defaults apply once at page startup; loading a saved board afterward keeps its theme.
    try{if(sessionStorage.getItem('routineVisualTimer.selfMonitor.active.v1')&&document.getElementById('setupName'))return;}catch{}
    const theme=audience.read().theme;
    for(const id of ['theme','themeSelect','boardTheme']){const select=document.getElementById(id);if(select?.tagName==='SELECT'&&[...select.options].some(option=>option.value===theme)){select.value=theme;select.dispatchEvent(new Event('change',{bubbles:true}));}}
  }
  if(document.readyState==='complete')defaultToolTheme();else addEventListener('load',defaultToolTheme,{once:true});
  applyAudience();
  dispatchEvent(new CustomEvent('routines-audience-change',{detail:audience.read()}));
  let lastDefaultTheme=audience.read().theme;
  addEventListener('routines-audience-change',event=>{applyAudience(event.detail);if(event.detail.theme!==lastDefaultTheme){lastDefaultTheme=event.detail.theme;defaultToolTheme();}});
  addEventListener('storage',event=>{if(event.key===audience.key||event.key===null)applyAudience();});
  const strands=document.createElement('section');strands.className='age-strands';
  strands.innerHTML='<label for="ageStrand">Tools for <output id="ageStrandLabel"></output></label><input id="ageStrand" type="range" min="0" max="4" step="1" aria-label="Age strand"><div class="age-strand-stops"></div><small>Switch tools without changing your open work.</small>';
  const ages=['young','child','teen','adult','all'],ageNames=['<5','<12','13+','Adult','All'],slider=strands.querySelector('input'),ageOutput=strands.querySelector('output');
  function showAge(){const i=ages.indexOf(audience.read().age);slider.value=i;ageOutput.textContent=ageNames[i];slider.setAttribute('aria-valuetext',ageNames[i]);strands.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(i===n)));}
  let ageSave=Promise.resolve();
  function persistAge(){const age=audience.read().age;ageSave=ageSave.catch(()=>{}).then(()=>globalThis.RoutineAccountPreferences?.saveAge(age)).catch(()=>{strands.querySelector('small').textContent='Updated here. Account sync unavailable; try again online.';});}
  function chooseAge(i,persist=true){const next={...audience.read(),age:ages[i]};delete next.tools;audience.save(next);if(persist)persistAge();}
  slider.oninput=()=>chooseAge(Number(slider.value),false);slider.onchange=persistAge;
  ageNames.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=()=>chooseAge(i);strands.querySelector('.age-strand-stops').append(b);});
  addEventListener('routines-audience-change',showAge);showAge();
  sidebar.append(home,toggle,strands,nav);
  const sidebarFooter=document.createElement('div');sidebarFooter.className='workspace-sidebar-footer';sidebar.append(sidebarFooter);
  const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='workspace-backdrop no-print';backdrop.setAttribute('aria-label','Close tool navigation');backdrop.hidden=true;document.body.prepend(backdrop);
  const mobileToggle=document.createElement('button');mobileToggle.type='button';mobileToggle.className='workspace-mobile-toggle no-print';mobileToggle.textContent='☰';mobileToggle.setAttribute('aria-label','Browse visual tools');mobileToggle.setAttribute('aria-controls','visual-navigation');
  const mobile=window.matchMedia('(max-width: 760px)');
  document.body.prepend(sidebar);
  let collapsed = window.matchMedia('(max-width: 760px)').matches;
  try { const saved = localStorage.getItem('visualNavigationCollapsed'); if (saved !== null && !mobile.matches) collapsed = saved === 'true'; } catch {}
  function update() {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    toggle.textContent = collapsed ? '☰' : 'Hide tools ←';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand visual navigation' : 'Collapse visual navigation');
    mobileToggle.setAttribute('aria-expanded',String(!collapsed));backdrop.hidden=!mobile.matches||collapsed;sidebar.inert=mobile.matches&&collapsed;document.body.classList.toggle('navigation-open',mobile.matches&&!collapsed);document.querySelectorAll('main,.workspace-header,.app-header').forEach(node=>{node.inert=mobile.matches&&!collapsed;});
    window.dispatchEvent(new Event('resize'));
  }
  toggle.addEventListener('click', () => { collapsed = !collapsed; try { localStorage.setItem('visualNavigationCollapsed', String(collapsed)); } catch {} update(); if(mobile.matches&&collapsed)mobileToggle.focus(); });
  mobileToggle.onclick=()=>{collapsed=!collapsed;update();if(!collapsed)toggle.focus();};
  backdrop.onclick=()=>{collapsed=true;update();mobileToggle.focus();};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile.matches&&!collapsed&&!document.querySelector('dialog[open]')){event.preventDefault();collapsed=true;update();mobileToggle.focus();}});
  document.addEventListener('keydown',event=>{if(event.key!=='Tab'||!mobile.matches||collapsed||document.querySelector('dialog[open]'))return;const controls=[...sidebar.querySelectorAll('a[href],button,input')].filter(node=>!node.hidden);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
  mobile.addEventListener('change',event=>{collapsed=event.matches;update();});
  update();
  import(new URL('js/sidebar-size.js',root).href).then(m=>m.mountSidebarSize(sidebar));
  if(document.body.dataset.planner){const mindfulScript=document.createElement('script');mindfulScript.src=new URL('planning/mindful.js',root);document.head.append(mindfulScript);}
  const valuesScript=document.createElement('script');valuesScript.type='module';valuesScript.src=new URL('cloud/values.js',root).href;document.head.append(valuesScript);
  import(new URL('cloud/links.js',root).href);
  import(new URL('js/praise.js',root).href);
  const cloudScript=document.createElement('script');cloudScript.type='module';cloudScript.src=new URL('cloud/ui.js',root).href;document.head.append(cloudScript);
  const fileScript=document.createElement('script');fileScript.src=new URL('js/file-menu.js?v=planning-2',root);document.head.append(fileScript);
  const offlineScript=document.createElement('script');offlineScript.src=new URL('js/offline.js',root);if(document.querySelector('#exportBoard,#exportChart,#exportRoutineBtn'))document.head.append(offlineScript);
  const main = document.querySelector('main');
  main.querySelectorAll(':scope > nav[aria-label="Visual supports"], :scope > nav.support-links').forEach(node => node.remove());
  const back = main.querySelector(':scope > a[href="../"]'); if (back) back.remove();
  if (!document.querySelector('.app-header')) {
    const header = document.createElement('header'); header.className = 'workspace-header no-print';
    const brand = document.createElement('a'); brand.href = 'https://getadhd.care'; brand.className = 'workspace-brand';
    const logo = document.createElement('img'); logo.src = new URL('assets/brand/logo-black.png', root).href; logo.alt = ''; logo.width = 44; logo.height = 44;
    const name = document.createElement('span'); name.textContent = 'Applied Behavioral Health Practice'; brand.append(logo, name); header.append(brand); main.before(header);
    const toolbar = document.createElement('div'); toolbar.className = 'visual-toolbar no-print'; toolbar.setAttribute('aria-label','Visual options');
    const controls = [...main.querySelectorAll(':scope > .controls')];
    if (controls.length) { controls[0].before(toolbar); controls.forEach(control => toolbar.append(control)); }
  }
  if(document.body.dataset.planner||document.body.dataset.memory){const datesStyle=document.createElement('link');datesStyle.rel='stylesheet';datesStyle.href=new URL('planning/dates.css',root);document.head.append(datesStyle);const datesScript=document.createElement('script');datesScript.type='module';datesScript.src=new URL('cloud/dates.js',root);document.head.append(datesScript);}
  const portalScript=document.createElement('script');portalScript.type='module';portalScript.src=new URL('admin/portal.js',root);document.head.append(portalScript);
  const header=document.querySelector('.workspace-header,.app-header');
  import(new URL('js/brand-logo.js',root).href).then(m=>m.applyBrandLogo(header));
  if(header){header.prepend(mobileToggle);const allTools=document.createElement('a');allTools.className='workspace-all-tools';allTools.href=root.href;allTools.textContent='All tools';header.append(allTools);}
  import(new URL('js/learning.js',root).href);
  import(new URL('js/visitor-nav.js',root).href);
  import(new URL('notifications/app.js',root).href);
  import(new URL('js/consultation.js',root).href);
  import(new URL('js/tips.js',root).href);
  import(new URL('js/ads.js',root).href);
  import(new URL('js/symbol-credits.js',root).href);
  const opener=document.createElement('script');opener.src=new URL('js/file-open.js',root);document.head.append(opener);
})();
