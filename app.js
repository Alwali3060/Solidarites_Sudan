// ===== Auth with user DB (demo) =====
const HASH = (s) => { let h=0; for (let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return String(h); };
const DEFAULT_USERS = [
  {email:"admin@org", role:"admin", pass:HASH("demo1234"), name:"Admin User", active:true, access:{} },
  {email:"hr@org", role:"hr", pass:HASH("demo1234"), name:"HR Lead", active:true, access:{} },
  {email:"cd@org", role:"cd", pass:HASH("demo1234"), name:"Country Director", active:true, access:{} },
  {email:"log@org", role:"logistics", pass:HASH("demo1234"), name:"Logistics", active:true, access:{} },
  {email:"staff@org", role:"staff", pass:HASH("demo1234"), name:"Staff Member", active:true, access:{} },
];
const USERS = {
  key: "ssudan_users",
  list(){ let u = JSON.parse(localStorage.getItem(this.key) || "null"); if(!u){ u = DEFAULT_USERS; localStorage.setItem(this.key, JSON.stringify(u)); } return u; },
  save(all){ localStorage.setItem(this.key, JSON.stringify(all)); },
  get(email){ return this.list().find(u => u.email===email) || null; },
  upsert(user){
    const all = this.list();
    const idx = all.findIndex(u => u.email===user.email);
    if(idx>=0) all[idx] = user; else all.push(user);
    this.save(all);
  },
  remove(email){ const all=this.list().filter(u => u.email!==email); this.save(all); }
};

const Auth = {
  key: "ssudan_auth",
  login(email, pass){
    const user = USERS.get(email);
    if(!user || !user.active) return null;
    if(user.pass !== HASH(pass)) return null;
    const session = { email:user.email, role:user.role, name:user.name||email.split('@')[0], access:user.access||{}, at:Date.now() };
    localStorage.setItem(this.key, JSON.stringify(session));
    return session;
  },
  me(){ try { return JSON.parse(localStorage.getItem(this.key)||"null"); } catch(e){ return null; } },
  logout(){ localStorage.removeItem(this.key); },
  require(){
    if(document.body.getAttribute('data-protected')){
      const me = this.me(); if(!me){ window.location.href = 'login.html'; return; }
      // Access gating per page if data-access is specified
      const need = document.body.getAttribute('data-access');
      if(need){
        const has = me.role==='admin' || me.access?.[need]===true;
        if(!has){ alert('Access denied for this page.'); window.location.href='dashboard.html'; }
      }
    }
  },
  guardAdmin(){
    const me = this.me(); if(!me || me.role!=='admin'){ alert('Admins only'); window.location.href='dashboard.html'; }
  }
};

// ===== Simple helpers =====
function toast(msg, ok=true){ const n=document.createElement('div'); n.className='toast '+(ok?'ok':'err'); n.textContent=msg; document.body.appendChild(n); setTimeout(()=>n.remove(),2200); }
function bindExternalLinks(){ const cfg=JSON.parse(localStorage.getItem('ssudan_links')||'{}'); document.querySelectorAll('[data-external="dashboard"]').forEach(a=>a.href=cfg.dashboard||'#'); document.querySelectorAll('[data-external="report"]').forEach(a=>a.href=cfg.report||'#'); }
function updateHeaderUserChip(){
  const loginLink = document.querySelector('[data-login-link]'); if(!loginLink) return;
  const s = Auth.me();
  if(!s){ loginLink.textContent='Log in'; loginLink.href='login.html'; return; }
  const name = s.name || s.email.split('@')[0];
  const initials = name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const chip = document.createElement('div');
  chip.className='user-menu';
  chip.innerHTML = `
    <div class="user-chip" id="userChip"><div class="ic">${initials}</div><div class="txt">${name} <span style="color:#6b7280">(${s.role})</span></div></div>
    <div class="user-panel" id="userPanel">
      <a href="profile.html">Profile</a>
      ${s.role==='admin' ? '<a href="users.html">Users</a><a href="esign.html">E‑Sign</a>' : '<a href="esign.html">E‑Sign</a>'}
      <button type="button" id="logoutBtn">Log out</button>
    </div>`;
  loginLink.replaceWith(chip);
  const btn=chip.querySelector('#userChip'), panel=chip.querySelector('#userPanel');
  btn.addEventListener('click', ()=> panel.style.display = (panel.style.display==='block'?'none':'block'));
  document.addEventListener('click', (e)=>{ if(!chip.contains(e.target)) panel.style.display='none'; });
  chip.querySelector('#logoutBtn').addEventListener('click', ()=>{ Auth.logout(); location.href='login.html'; });
}

// ===== Users Admin Page =====
function pageUsers(){
  Auth.guardAdmin();
  const body = document.querySelector('tbody');
  const form = document.querySelector('#userForm');
  const btnNew = document.querySelector('[data-add]');
  const dlg = document.querySelector('[data-dialog]');
  const dlgClose = document.querySelector('[data-close]');

  function render(){
    const rows = USERS.list();
    body.innerHTML='';
    rows.forEach((u, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.email}</td>
        <td>${u.name||''}</td>
        <td>${u.role}</td>
        <td>${u.active ? 'Active' : 'Disabled'}</td>
        <td>${Object.keys(u.access||{}).filter(k=>u.access[k]).join(', ')}</td>
        <td><div class="row-actions">
          <button class="btn" data-edit="${u.email}">Edit</button>
          ${u.role!=='admin' ? `<button class="btn" data-del="${u.email}">Delete</button>` : ''}
        </div></td>`;
      body.appendChild(tr);
    });
  }

  function openDialog(u){
    dlg.classList.remove('hide');
    form.email.value = u?.email || '';
    form.email.readOnly = !!u;
    form.name.value = u?.name || '';
    form.role.value = u?.role || 'staff';
    form.pass.value = '';
    form.active.checked = u?.active ?? true;
    const access = u?.access || {};
    form.querySelectorAll('input[type="checkbox"][data-access]').forEach(cb => cb.checked = !!access[cb.dataset.access]);
  }

  btnNew.addEventListener('click', ()=> openDialog(null));
  dlgClose.addEventListener('click', ()=> dlg.classList.add('hide'));

  body.addEventListener('click', (e)=>{
    const em = e.target.getAttribute('data-edit');
    const del = e.target.getAttribute('data-del');
    if (em){ const u = USERS.get(em); openDialog(u); }
    if (del){ if(confirm('Delete this user?')){ USERS.remove(del); render(); toast('User deleted'); } }
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const existing = USERS.get(email);
    const access = {}; form.querySelectorAll('input[type="checkbox"][data-access]').forEach(cb => access[cb.dataset.access] = cb.checked);
    const user = {
      email,
      name: form.name.value.trim(),
      role: form.role.value,
      pass: form.pass.value ? HASH(form.pass.value) : (existing ? existing.pass : HASH('demo1234')),
      active: form.active.checked,
      access
    };
    USERS.upsert(user);
    dlg.classList.add('hide'); render(); toast(existing ? 'User updated' : 'User created');
  });

  render();
}

// ===== E‑Sign Admin Workspace =====
const ESIGN = {
  key: "ssudan_esign_docs",
  list(){ return JSON.parse(localStorage.getItem(this.key) || "[]"); },
  save(all){ localStorage.setItem(this.key, JSON.stringify(all)); },
  upsert(doc){ const all=this.list(); const i=all.findIndex(d=>d.id===doc.id); if(i>=0) all[i]=doc; else all.push(doc); this.save(all); },
  get(id){ return this.list().find(d=>d.id===id)||null; }
};
function uid(){ return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2); }

function pageEsign(){
  const me = Auth.me(); if(!me){ location.href='login.html'; return; }
  const body = document.querySelector('tbody');
  const form = document.querySelector('#docForm');
  const btnNew = document.querySelector('[data-add]');
  const dlg = document.querySelector('[data-dialog]');
  const dlgClose = document.querySelector('[data-close]');
  const signerList = document.querySelector('#signerList');
  let current = null;
  let signers = [];

  function render(){
    const rows = ESIGN.list();
    body.innerHTML='';
    rows.forEach(doc => {
      const tr = document.createElement('tr');
      const status = doc.signers.every(s=>s.signed) ? 'Fully signed' : (doc.signers.some(s=>s.signed) ? 'Partially signed' : 'Pending');
      tr.innerHTML = `
        <td>${doc.title}</td>
        <td>${doc.owner}</td>
        <td>${new Date(doc.created).toLocaleString()}</td>
        <td>${status}</td>
        <td>${doc.signers.map(s=>`${s.email} ${s.signed?'✓':''}`).join('<br/>')}</td>
        <td><div class="row-actions">
          <button class="btn" data-open="${doc.id}">Open</button>
          <button class="btn" data-link="${doc.id}">Copy Links</button>
          <button class="btn" data-del="${doc.id}">Delete</button>
        </div></td>`;
      body.appendChild(tr);
    });
  }

  function openDlg(doc){
    dlg.classList.remove('hide');
    current = doc || { id: uid(), title:'', owner: me.email, created: Date.now(), content:'', signers:[] };
    form.title.value = current.title || '';
    form.content.value = current.content || '';
    signers = current.signers.slice();
    drawSigners();
  }

  function drawSigners(){
    signerList.innerHTML='';
    signers.forEach((s, i)=>{
      const li = document.createElement('div'); li.className='chip';
      li.innerHTML = `<span>${s.email}${s.signed?' (signed)':''}</span> <button class="btn" data-rm="${i}">×</button>`;
      signerList.appendChild(li);
    });
  }

  btnNew.addEventListener('click', ()=> openDlg(null));
  dlgClose.addEventListener('click', ()=> dlg.classList.add('hide'));

  document.getElementById('addSigner').addEventListener('click', ()=>{
    const email = form.signer.value.trim().toLowerCase(); if(!email) return;
    signers.push({email, signed:false, token: uid()});
    form.signer.value=''; drawSigners();
  });
  signerList.addEventListener('click', (e)=>{ const i=e.target.getAttribute('data-rm'); if(i!==null){ signers.splice(Number(i),1); drawSigners(); } });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    current.title = form.title.value.trim();
    current.content = form.content.value.trim();
    current.signers = signers;
    ESIGN.upsert(current);
    dlg.classList.add('hide'); render(); toast('Document saved');
  });

  body.addEventListener('click', (e)=>{
    const id = e.target.getAttribute('data-open');
    const del = e.target.getAttribute('data-del');
    const link = e.target.getAttribute('data-link');
    if(id){ const doc = ESIGN.get(id); openDlg(doc); }
    if(del){ if(confirm('Delete this document?')){ const rest = ESIGN.list().filter(d=>d.id!==del); ESIGN.save(rest); render(); toast('Deleted'); } }
    if(link){
      const doc = ESIGN.get(link);
      const links = doc.signers.map(s => `${location.origin}${location.pathname.replace(/[^/]+$/,'')}sign.html?doc=${doc.id}&token=${s.token}`);
      navigator.clipboard?.writeText(links.join('\n'));
      toast('Signer links copied');
      // Prepare mailto for convenience
      const mailto = doc.signers.map(s => `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent('Please sign: '+doc.title)}&body=${encodeURIComponent('Dear colleague,%0D%0A%0D%0APlease sign: '+ (location.origin+location.pathname.replace(/[^/]+$/,'')+'sign.html?doc='+doc.id+'&token='+s.token) +'%0D%0A%0D%0AThanks!')}`);
      localStorage.setItem('ssudan_esign_last_mailtos', JSON.stringify(mailto));
    }
  });

  render();
}

// ===== Public Sign Page =====
function pageSign(){
  const params = new URLSearchParams(location.search);
  const docId = params.get('doc'); const token = params.get('token');
  const doc = ESIGN.get(docId);
  const holder = document.getElementById('docHolder');
  const statusEl = document.getElementById('signStatus');
  if(!doc){ holder.textContent='Document not found.'; return; }
  const signer = doc.signers.find(s => s.token===token);
  if(!signer){ holder.textContent='Invalid link.'; return; }

  // Render doc content (plain text for demo)
  holder.textContent = doc.content || '(No content body)';
  statusEl.textContent = signer.signed ? 'Already signed ✓' : 'Awaiting your signature';

  // Canvas signature
  const pad = document.getElementById('pad');
  const ctx = pad.getContext('2d'); let drawing=false;
  pad.addEventListener('mousedown', e=>{ drawing=true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); });
  pad.addEventListener('mousemove', e=>{ if(!drawing) return; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); });
  pad.addEventListener('mouseup', ()=> drawing=false);
  pad.addEventListener('mouseleave', ()=> drawing=false);

  document.getElementById('btnClear').addEventListener('click', ()=>{ ctx.clearRect(0,0,pad.width,pad.height); });
  document.getElementById('btnSign').addEventListener('click', ()=>{
    const dataURL = pad.toDataURL();
    signer.signed = true;
    signer.signedAt = Date.now();
    signer.signature = dataURL;
    const all = ESIGN.list(); const i = all.findIndex(d=>d.id===doc.id); all[i]=doc; ESIGN.save(all);
    statusEl.textContent = 'Signed — thank you!';
    toast('Signed successfully');
  });
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', ()=>{
  Auth.require(); bindExternalLinks(); updateHeaderUserChip();
  const page = document.body.getAttribute('data-page');
  if(page==='users') pageUsers();
  if(page==='esign') pageEsign();
  if(page==='sign') pageSign();
});
