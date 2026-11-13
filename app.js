// ====== 1. EDIT THESE ======
const CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_KEY: 'YOUR_SUPABASE_ANON_KEY',
  NAME: 'Joshua Paul Gentica',
  ROLE: 'UI/UX designer and web developer',
  EMAIL: 'you@example.com',
  SKILLS: ['UI/UX design', 'Web development', 'App development', 'Branding'],
  LINKS: [{ label: 'Facebook', url: '#' }, { label: 'GitHub', url: '#' }, { label: 'LinkedIn', url: '#' }],
  BUCKET: 'project-files'
};
// ===========================

let sb = null; // stays null until real keys are added, so the page still works
try { if (CONFIG.SUPABASE_URL.startsWith('http')) sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY); } catch (e) {}
const NOKEYS = 'Add your Supabase keys in app.js first.';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let isAdmin = false, projects = [], filter = 'All', editFiles = [], removed = [];

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200);
}
const letters = s => { let i = 0; return s.split(' ').map(w => `<span class="w">${[...w].map(c => `<span style="--i:${i++}">${esc(c)}</span>`).join('')}</span>`).join(' '); };

/* ---------- Intro + text ---------- */
$('#logo').textContent = CONFIG.NAME;
$('#footName').textContent = CONFIG.NAME;
$('#year').textContent = '© ' + new Date().getFullYear();
$('#heroName').innerHTML = letters(CONFIG.NAME);
$('#heroRole').textContent = CONFIG.ROLE;
document.title = CONFIG.NAME + ' | Portfolio';

(function intro() {
  const el = $('#intro');
  const done = () => { el.classList.add('out'); setTimeout(() => { el.remove(); document.body.classList.add('ready'); }, 900); sessionStorage.setItem('seen', 1); };
  if (sessionStorage.getItem('seen')) { el.remove(); document.body.classList.add('ready'); return; }
  $('#introName').innerHTML = letters(CONFIG.NAME);
  $('#introRole').textContent = CONFIG.ROLE;
  const t = setTimeout(done, 3200);
  el.onclick = () => { clearTimeout(t); done(); };
})();

/* Hero spotlight follows the mouse */
$('#hero').addEventListener('pointermove', e => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--x', e.clientX - r.left + 'px');
  e.currentTarget.style.setProperty('--y', e.clientY - r.top + 'px');
});

/* ---------- Night mode ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t; localStorage.setItem('theme', t);
  $('#themeBtn').textContent = t === 'dark' ? 'Day' : 'Night';
}
setTheme(document.documentElement.dataset.theme);
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* ---------- Dialogs ---------- */
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) e.target.closest('dialog').close(); });
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

/* ---------- Projects ---------- */
async function load() {
  if (!sb) { $('#emptyText').textContent = 'Connect Supabase in app.js to load projects.'; $('#empty').hidden = false; return; }
  const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false });
  if (error) { toast('Could not load projects. Check your Supabase keys.'); return; }
  projects = data; render();
}
function render() {
  const cats = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];
  $('#filters').innerHTML = projects.length > 1 ? cats.map(c => `<button class="chip ${c === filter ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('') : '';
  const list = projects.filter(p => filter === 'All' || p.category === filter);
  $('#grid').innerHTML = list.map(p => `
    <article class="card" data-id="${p.id}" tabindex="0">
      <div class="thumb">${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="${esc(p.title)}" loading="lazy">` : ''}</div>
      <div class="meta"><h3>${esc(p.title)}</h3><span>${esc(p.category || '')}</span></div>
    </article>`).join('');
  $('#empty').hidden = projects.length > 0;
  $('#emptyText').textContent = isAdmin ? 'No projects yet. Upload your newest work.' : 'Projects will appear here soon.';
}
$('#filters').onclick = e => { const b = e.target.closest('.chip'); if (b) { filter = b.dataset.c; render(); } };
$('#grid').onclick = e => { const c = e.target.closest('.card'); if (c) openView(c.dataset.id); };
$('#grid').onkeydown = e => { if (e.key === 'Enter') e.target.click(); };

function openView(id) {
  const p = projects.find(x => x.id === id); if (!p) return;
  $('#viewBody').innerHTML = `
    ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="">` : ''}
    <h3>${esc(p.title)}</h3><small>${esc(p.category || '')}</small>
    <p>${esc(p.description || '')}</p>
    ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">Visit project</a>` : ''}
    ${(p.files || []).map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener" download>${esc(f.name)}</a>`).join('')}
    ${isAdmin ? `<div class="row" style="margin-top:1.5rem"><button class="ghost" id="editBtn">Edit</button><button class="ghost" id="delBtn">Delete</button></div>` : ''}`;
  if (isAdmin) { $('#editBtn').onclick = () => { $('#viewDlg').close(); openForm(p); }; $('#delBtn').onclick = () => del(p); }
  $('#viewDlg').showModal();
}

/* ---------- Add / edit / delete (admin) ---------- */
function openForm(p) {
  const f = $('#projForm'); f.reset(); removed = [];
  f.id.value = p?.id || ''; f.title.value = p?.title || ''; f.category.value = p?.category || '';
  f.link.value = p?.link || ''; f.description.value = p?.description || '';
  editFiles = p ? [...(p.files || [])] : [];
  $('#formTitle').textContent = p ? 'Edit project' : 'Add project';
  drawFiles(); $('#formDlg').showModal();
}
function drawFiles() {
  $('#fileList').innerHTML = editFiles.map((x, i) => `<div class="fchip"><span>${esc(x.name)}</span><button type="button" data-i="${i}">Remove</button></div>`).join('');
}
$('#fileList').onclick = e => { const b = e.target.closest('button'); if (b) { removed.push(editFiles.splice(b.dataset.i, 1)[0]); drawFiles(); } };
$('#addBtn').onclick = $('#addBtn2').onclick = () => openForm();

async function upload(file) {
  const path = crypto.randomUUID() + '-' + file.name.replace(/[^\w.-]/g, '_');
  const { error } = await sb.storage.from(CONFIG.BUCKET).upload(path, file);
  if (error) throw error;
  return { name: file.name, path, url: sb.storage.from(CONFIG.BUCKET).getPublicUrl(path).data.publicUrl };
}
$('#projForm').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target), btn = $('#saveBtn'), id = f.get('id');
  const old = projects.find(p => p.id === id);
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    let cover_url = old?.cover_url || null, cover_path = old?.cover_path || null;
    const cover = f.get('cover');
    if (cover && cover.size) {
      if (cover_path) await sb.storage.from(CONFIG.BUCKET).remove([cover_path]);
      ({ url: cover_url, path: cover_path } = await upload(cover));
    }
    const files = [...editFiles];
    for (const file of f.getAll('files')) if (file.size) files.push(await upload(file));
    if (removed.length) await sb.storage.from(CONFIG.BUCKET).remove(removed.map(x => x.path));
    const row = { title: f.get('title'), category: f.get('category'), description: f.get('description'), link: f.get('link'), cover_url, cover_path, files };
    const { error } = id ? await sb.from('projects').update(row).eq('id', id) : await sb.from('projects').insert(row);
    if (error) throw error;
    $('#formDlg').close(); toast('Project saved'); await load();
  } catch (err) { toast('Save failed: ' + err.message); }
  btn.disabled = false; btn.textContent = 'Save project';
};
async function del(p) {
  if (!confirm(`Delete "${p.title}"?`)) return;
  const paths = [p.cover_path, ...(p.files || []).map(x => x.path)].filter(Boolean);
  if (paths.length) await sb.storage.from(CONFIG.BUCKET).remove(paths);
  const { error } = await sb.from('projects').delete().eq('id', p.id);
  if (error) return toast('Delete failed: ' + error.message);
  $('#viewDlg').close(); toast('Project deleted'); load();
}

/* ---------- Inquiries ---------- */
$('#inqForm').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (f.get('company')) return; // spam trap
  if (!sb) return toast(NOKEYS);
  const { error } = await sb.from('inquiries').insert({
    name: f.get('name'), email: f.get('email'), service: f.get('service'),
    preferred_date: f.get('preferred_date') || null, message: f.get('message')
  });
  if (error) return toast('Could not send. Please try again.');
  e.target.reset(); toast('Inquiry sent. I will reply by email.');
};
$('#inqBtn').onclick = async () => {
  const { data, error } = await sb.from('inquiries').select('*').order('created_at', { ascending: false });
  if (error) return toast(error.message);
  $('#inqList').innerHTML = data.length ? data.map(q => `
    <div class="inq"><strong>${esc(q.name)}</strong> <small>${esc(q.email)} | ${esc(q.service || '')} | ${esc(q.preferred_date || 'no date')} | ${new Date(q.created_at).toLocaleDateString()}</small>
    <p>${esc(q.message)}</p>
    <a href="mailto:${esc(q.email)}">Reply</a> <button data-d="${q.id}">Delete</button></div>`).join('') : '<p>No inquiries yet.</p>';
  $('#inqDlg').showModal();
};
$('#inqList').onclick = async e => {
  const id = e.target.dataset.d; if (!id) return;
  await sb.from('inquiries').delete().eq('id', id); e.target.closest('.inq').remove();
};

/* ---------- Admin auth ---------- */
function setAdmin(on) { isAdmin = on; document.body.classList.toggle('admin', on); $('#adminLink').textContent = on ? '' : 'Admin'; if (projects.length || on) render(); }
$('#adminLink').onclick = e => { e.preventDefault(); $('#loginDlg').showModal(); };
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (!sb) return toast(NOKEYS);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
  if (error) return toast('Login failed: ' + error.message);
  $('#loginDlg').close(); e.target.reset(); toast('Welcome back');
};
$('#logoutBtn').onclick = () => sb && sb.auth.signOut();
if (sb) {
  sb.auth.onAuthStateChange((_ev, session) => setAdmin(!!session));
  sb.auth.getSession().then(({ data }) => setAdmin(!!data.session));
}

/* ---------- Extras: skills, links, marquee, progress bar, cursor, reveal ---------- */
$('#skills').innerHTML = CONFIG.SKILLS.map(s => `<li>${esc(s)}</li>`).join('');
$('#marq').innerHTML = [...CONFIG.SKILLS, ...CONFIG.SKILLS].map(s => `<span>${esc(s)}</span>`).join('').repeat(2);
$('#mailLink').href = 'mailto:' + CONFIG.EMAIL; $('#mailLink').textContent = CONFIG.EMAIL;
$('#socials').innerHTML = CONFIG.LINKS.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');
addEventListener('scroll', () => {
  $('#progress').style.transform = `scaleX(${scrollY / ((document.documentElement.scrollHeight - innerHeight) || 1)})`;
}, { passive: true });
if (matchMedia('(pointer:fine)').matches) {
  const c = $('#cursor'); let tx = 0, ty = 0, x = 0, y = 0;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; c.classList.add('on'); });
  (function loop() { x += (tx - x) * .18; y += (ty - y) * .18; c.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(loop); })();
  document.addEventListener('pointerover', e => c.classList.toggle('big', !!e.target.closest('a,button,.card,.portrait')));
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
if (location.protocol === 'file:') setTimeout(() => toast('Tip: open with Live Server or localhost for best results.'), 4500);

load();