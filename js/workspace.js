/* Shared visual-tool navigation; existing editors keep their own state and events. */
(() => {
  const root = new URL('../', document.currentScript.src);
  const tools = [
    ['', 'Routine timer', '◷'], ['chore-chart/', 'Chore chart', '✓'],
    ['first-then/', 'First–Then board', '⇢'], ['choice-board/', 'Choice board', '▦'],
    ['task-strip/', 'Task strip', '≡'], ['now-next-later/', 'Now–Next–Later', '⋯'],
    ['calm-down/', 'Calm-down board', '♡'],
    ['self-monitor/', 'Self-monitor', '☺'],
    ['homework-planner/', 'Homework planner', 'edit_document'],
    ['token-board/', 'Token board', '★'],
    ['whats-new/', 'What’s New', '✦']
  ];
  const iconFont=document.createElement('link');iconFont.rel='stylesheet';iconFont.href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=edit_document&display=block';document.head.append(iconFont);
  document.body.classList.add('visual-workspace');
  const sidebar = document.createElement('aside');
  sidebar.className = 'workspace-sidebar no-print';
  const toggle = document.createElement('button');
  toggle.className = 'sidebar-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'visual-navigation');
  const nav = document.createElement('nav');
  nav.id = 'visual-navigation';
  nav.setAttribute('aria-label', 'Create a visual');
  const heading = document.createElement('p');
  heading.className = 'sidebar-heading'; heading.textContent = 'Create a visual';
  for (const [path, name, symbol] of tools) {
    const link = document.createElement('a'); link.href = new URL(path, root).href;
    link.title = name; link.setAttribute('aria-label', name);
    const icon = document.createElement('span'); icon.className = 'nav-icon'; icon.textContent = symbol; icon.setAttribute('aria-hidden','true');
    if(symbol==='edit_document'){icon.style.fontFamily='Material Symbols Outlined';icon.style.fontWeight='normal';icon.style.fontStyle='normal';icon.style.fontSize='24px';icon.style.letterSpacing='normal';icon.style.textTransform='none';icon.style.fontFeatureSettings='"liga"';}
    const label = document.createElement('span'); label.className = 'nav-label'; label.textContent = name;
    link.append(icon, label);
    if (new URL(link.href).pathname === location.pathname.replace(/index\.html$/, '')) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  sidebar.append(toggle, heading, nav);
  document.body.prepend(sidebar);
  let collapsed = window.matchMedia('(max-width: 760px)').matches;
  try { const saved = localStorage.getItem('visualNavigationCollapsed'); if (saved !== null) collapsed = saved === 'true'; } catch {}
  function update() {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    toggle.textContent = collapsed ? '☰' : '← Collapse';
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand visual navigation' : 'Collapse visual navigation');
    window.dispatchEvent(new Event('resize'));
  }
  toggle.addEventListener('click', () => { collapsed = !collapsed; try { localStorage.setItem('visualNavigationCollapsed', String(collapsed)); } catch {} update(); });
  update();
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
})();
