/* Shared visual-tool navigation; existing editors keep their own state and events. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const tools = [
    ['', 'Routine timer', 'timer'], ['chore-chart/', 'Chore chart', 'mop'],
    ['first-then/', 'First–Then board', 'checklist_rtl'], ['choice-board/', 'Choice board', 'developer_board'],
    ['task-strip/', 'Task strip', 'ballot'], ['now-next-later/', 'Now–Next–Later', 'steppers'],
    ['calm-down/', 'Calm-down board', '♡'],
    ['self-monitor/', 'Self-monitor', 'done_all'],
    ['homework-planner/', 'Homework planner', 'edit_document'],
    ['token-board/', 'Token board', '★'],
    ['whats-new/', 'What’s New', '✦']
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
  const home = document.createElement('a');home.className='workspace-home';home.href=new URL('tools/',root).href;
  const homeMark=document.createElement('span');homeMark.className='workspace-home-mark';homeMark.setAttribute('aria-hidden','true');homeMark.textContent='✦';
  const homeName=document.createElement('span');homeName.className='nav-label';homeName.textContent='Visual supports';home.append(homeMark,homeName);
  const overview=document.createElement('a');overview.href=new URL('tools/',root).href;overview.className='tools-overview';overview.textContent='All tools';overview.setAttribute('aria-label','All visual support tools');if(location.pathname===overview.pathname)overview.setAttribute('aria-current','page');
  nav.append(overview);
  const groupFor = {'Routine timer':'Daily routines','Chore chart':'Daily routines','Task strip':'Daily routines','Now–Next–Later':'Daily routines','First–Then board':'Choices & transitions','Choice board':'Choices & transitions','Calm-down board':'Choices & transitions','Self-monitor':'Learning & focus','Homework planner':'Learning & focus','Token board':'Learning & focus','What’s New':'Resources'};
  const order=['Daily routines','Choices & transitions','Learning & focus','Resources'];
  const arranged=order.flatMap(group=>tools.filter(tool=>groupFor[tool[1]]===group));let lastGroup='';
  for (const [path, name, symbol] of arranged) {
    const group=groupFor[name];if(group!==lastGroup){const label=document.createElement('p');label.className='sidebar-heading';label.textContent=group;nav.append(label);lastGroup=group;}
    const link = document.createElement('a'); link.href = new URL(path, root).href;
    link.title = name; link.setAttribute('aria-label', name);
    const icon = document.createElement('span'); icon.className = 'nav-icon'; icon.textContent = symbol; icon.setAttribute('aria-hidden','true');
    if(['timer','mop','checklist_rtl','developer_board','ballot','steppers','done_all'].includes(symbol)){icon.textContent='';icon.classList.add('nav-material-icon');const image=`url("${new URL('assets/navigation/'+symbol+'.svg',root).href}")`;icon.style.maskImage=image;icon.style.webkitMaskImage=image;}
    if(symbol==='edit_document'){icon.style.fontFamily='Material Symbols Outlined';icon.style.fontWeight='normal';icon.style.fontStyle='normal';icon.style.fontSize='24px';icon.style.letterSpacing='normal';icon.style.textTransform='none';icon.style.fontFeatureSettings='"liga"';}
    const label = document.createElement('span'); label.className = 'nav-label'; label.textContent = name;
    link.append(icon, label);
    if (new URL(link.href).pathname === location.pathname.replace(/index\.html$/, '')) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  sidebar.append(home,toggle,nav);
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
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile.matches&&!collapsed){event.preventDefault();collapsed=true;update();mobileToggle.focus();}});
  document.addEventListener('keydown',event=>{if(event.key!=='Tab'||!mobile.matches||collapsed)return;const controls=[...sidebar.querySelectorAll('a[href],button')].filter(node=>!node.hidden);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
  mobile.addEventListener('change',event=>{collapsed=event.matches;update();});
  update();
  const cloudScript=document.createElement('script');cloudScript.type='module';cloudScript.src=new URL('cloud/ui.js',root).href;document.head.append(cloudScript);
  const fileScript=document.createElement('script');fileScript.src=new URL('js/file-menu.js',root);document.head.append(fileScript);
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
  const header=document.querySelector('.workspace-header,.app-header');
  if(header){header.prepend(mobileToggle);const allTools=document.createElement('a');allTools.className='workspace-all-tools';allTools.href=new URL('tools/',root).href;allTools.textContent='All tools';header.append(allTools);}
})();
