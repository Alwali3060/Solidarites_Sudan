// ====== Auth (demo-only) ======
const HASH = (s) => { // very light hash for demo (NOT secure)
  let h = 0; for (let i=0; i<s.length; i++){ h = (h<<5)-h + s.charCodeAt(i); h |= 0; }
  return String(h);
};
const DEMO_USERS = {
  "staff@org":      {role:"staff",      pass: HASH("demo1234")},
  "hr@org":         {role:"hr",         pass: HASH("demo1234")},
  "cd@org":         {role:"cd",         pass: HASH("demo1234")},
  "log@org":        {role:"logistics",  pass: HASH("demo1234")},
  "admin@org":      {role:"admin",      pass: HASH("demo1234")},
};

const Auth = {
  key: "ssudan_auth",
  login(email, pass){
    const user = DEMO_USERS[email];
    if (!user) return null;
    if (user.pass !== HASH(pass)) return null;
    const session = {email, role: user.role, at: Date.now()};
    localStorage.setItem(Auth.key, JSON.stringify(session));
    return session;
  },
  me(){
    try { return JSON.parse(localStorage.getItem(Auth.key)||"null"); }
    catch(e){ return null; }
  },
  logout(){ localStorage.removeItem(Auth.key); },
  require(){
    const p = document.body.getAttribute('data-protected');
    if (p){
      const me = Auth.me();
      if (!me){ window.location.href = 'login.html'; }
    }
  }
};

// ====== DB (localStorage) ======
const DB = {
  key: (name) => `ssudan_${name}`,
  get: (name) => JSON.parse(localStorage.getItem(DB.key(name)) || "[]"),
  set: (name, data) => localStorage.setItem(DB.key(name), JSON.stringify(data)),
  add: (name, row) => { const d = DB.get(name); d.push(row); DB.set(name, d); },
  del: (name, idx) => { const d = DB.get(name); d.splice(idx,1); DB.set(name, d); },
};

// ====== CSV ======
const CSV = {
  to: (rows, headers) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const head = headers.map(esc).join(",");
    const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
    return head + "\n" + body;
  },
  from: async (file) => {
    const text = await file.text();
    const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
    const headers = head.split(",").map(h=>h.replace(/^"|"$/g,""));
    const rows = lines.map(line => {
      const cols = line.match(/("([^"]|"")*"|[^,]+)/g).map(c=>c.replace(/^"|"$/g,"").replace(/""/g,'"'));
      const obj = {};
      headers.forEach((h,i)=>obj[h] = cols[i]);
      return obj;
    });
    return { headers, rows };
  }
};

function toast(msg, ok=true){
  const n = document.createElement('div');
  n.className = 'toast ' + (ok ? 'ok' : 'err');
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(()=> n.remove(), 2400);
}

function bindExternalLinks(){
  const cfg = JSON.parse(localStorage.getItem('ssudan_links')||'{}');
  document.querySelectorAll('[data-external="dashboard"]').forEach(a => a.href = cfg.dashboard || '#');
  document.querySelectorAll('[data-external="report"]').forEach(a => a.href = cfg.report || '#');
}

// ====== KPIs & Dashboard ======
function initKPIs(){
  const d = { shipments: DB.get('shipments'), pos: DB.get('pos'), items: DB.get('items'), movements: DB.get('movements') };
  const inTransit = d.shipments.filter(s => s.status === 'In transit').length;
  const openPOs = d.pos.filter(p => ['Draft','Approved','Partially Received'].includes(p.status)).length;
  const soh = d.items.length * 100;
  const pendingMov = d.movements.filter(m => ['Submitted','HR_Approved','CD_Approved'].includes(m.status)).length;
  const el = (id)=>document.getElementById(id);
  if(el('m_soh')) el('m_soh').textContent = soh.toLocaleString();
  if(el('m_pos')) el('m_pos').textContent = openPOs;
  if(el('m_ship')) el('m_ship').textContent = inTransit;
  if(el('kpiDeliveries')) el('kpiDeliveries').textContent = (d.shipments.length*100).toLocaleString();
  if(el('kpiOpen')) el('kpiOpen').textContent = openPOs;
  if(el('kpiMov')) el('kpiMov').textContent = pendingMov;

  const tbl = document.getElementById('tbl_upcoming');
  if (tbl){
    tbl.innerHTML = '';
    DB.get('shipments').slice(0,5).forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.ship}</td><td>${s.from} → ${s.to}</td><td>${s.eta}</td><td>${s.status}</td>`;
      tbl.appendChild(tr);
    });
  }
}

// ====== Generic Page CRUD ======
function pageTableCrud(entity, headers){
  const me = Auth.me() || {role:'guest'};
  const body = document.querySelector('tbody');
  const formWrap = document.querySelector('[data-form]');
  const btnAdd = document.querySelector('[data-add]');
  const btnSave = document.querySelector('[data-save]');
  const btnCancel = document.querySelector('[data-cancel]');
  const inputFile = document.querySelector('[data-import]');
  const btnExport = document.querySelector('[data-export]');
  const inputs = formWrap ? formWrap.querySelectorAll('input,select,textarea') : [];

  function render(){
    const data = DB.get(entity);
    body.innerHTML = '';
    data.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const cells = headers.map(h => `<td>${row[h] ?? ''}</td>`).join('');
      tr.innerHTML = cells + `<td><div class="row-actions"><button class="btn" data-del="${idx}">Delete</button></div></td>`;
      body.appendChild(tr);
    });
  }

  btnAdd?.addEventListener('click', ()=>{
    formWrap.classList.remove('hide');
    inputs.forEach(i=> i.value = '');
  });
  btnCancel?.addEventListener('click', ()=> formWrap.classList.add('hide'));

  btnSave?.addEventListener('click', ()=>{
    const row = {};
    inputs.forEach(i => row[i.name] = i.value);
    DB.add(entity, row);
    render();
    formWrap.classList.add('hide');
    toast('Saved');
  });

  body?.addEventListener('click',(e)=>{
    const del = e.target.getAttribute('data-del');
    if (del !== null){
      DB.del(entity, Number(del));
      render();
      toast('Deleted', true);
    }
  });

  btnExport?.addEventListener('click', ()=>{
    const data = DB.get(entity);
    const csv = CSV.to(data, headers);
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${entity}.csv`; a.click();
  });

  inputFile?.addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if (!f) return;
    const {rows} = await CSV.from(f);
    const mapped = rows.map(r => {
      const obj = {}; headers.forEach(h => obj[h] = r[h] ?? ''); return obj;
    });
    DB.set(entity, mapped);
    render(); toast('Imported CSV');
  });

  render();
}

// ====== Movements with Role-based actions ======
function pageMovements(){
  const me = Auth.me() || {role:'guest'};
  const headers = ['id','staff','origin','dest','dates','purpose','status'];
  const body = document.querySelector('tbody');
  const formWrap = document.querySelector('[data-form]');
  const btnAdd = document.querySelector('[data-add]');
  const btnSave = document.querySelector('[data-save]');
  const btnCancel = document.querySelector('[data-cancel]');
  const inputFile = document.querySelector('[data-import]');
  const btnExport = document.querySelector('[data-export]');
  const inputs = formWrap.querySelectorAll('input,select,textarea');

  function render(){
    const data = DB.get('movements');
    body.innerHTML = '';
    data.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const dates = `${row.start || ''} → ${row.end || ''}`;
      tr.innerHTML = `<td>${row.id}</td><td>${row.staff}</td><td>${row.origin}</td><td>${row.dest}</td><td>${dates}</td><td>${row.purpose||''}</td><td><span class="badge">${row.status}</span></td>
      <td><div class="row-actions">
        <button class="btn" data-del="${idx}">Delete</button>
        ${me.role==='hr' && row.status==='Submitted' ? '<button class="btn" data-act="hr" data-idx="'+idx+'">HR Approve</button>' : ''}
        ${me.role==='cd' && row.status==='HR_Approved' ? '<button class="btn" data-act="cd" data-idx="'+idx+'">CD Validate</button>' : ''}
        ${me.role==='logistics' && row.status==='CD_Approved' ? '<button class="btn" data-act="plan" data-idx="'+idx+'">Plan</button>' : ''}
        ${me.role==='logistics' && row.status==='Planned' ? '<button class="btn" data-act="complete" data-idx="'+idx+'">Mark Completed</button>' : ''}
      </div></td>`;
      body.appendChild(tr);
    });
  }

  btnAdd?.addEventListener('click', ()=>{
    formWrap.classList.remove('hide'); inputs.forEach(i=> i.value = '');
  });
  btnCancel?.addEventListener('click', ()=> formWrap.classList.add('hide'));

  btnSave?.addEventListener('click', ()=>{
    const row = {}; inputs.forEach(i => row[i.name] = i.value);
    DB.add('movements', row); render(); formWrap.classList.add('hide'); toast('Saved');
  });

  body.addEventListener('click',(e)=>{
    const del = e.target.getAttribute('data-del');
    const act = e.target.getAttribute('data-act');
    const idx = Number(e.target.getAttribute('data-idx'));
    if (del !== null){ DB.del('movements', Number(del)); render(); toast('Deleted'); return; }
    if (act){
      const d = DB.get('movements');
      const row = d[idx];
      if (act==='hr') row.status = 'HR_Approved';
      if (act==='cd') row.status = 'CD_Approved';
      if (act==='plan') row.status = 'Planned';
      if (act==='complete') row.status = 'Completed';
      DB.set('movements', d); render(); toast('Updated');
    }
  });

  btnExport?.addEventListener('click', ()=>{
    const data = DB.get('movements');
    const csv = CSV.to(data, ['id','staff','origin','dest','start','end','purpose','status']);
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `movements.csv`; a.click();
  });

  inputFile?.addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if (!f) return;
    const {rows} = await CSV.from(f);
    DB.set('movements', rows);
    render(); toast('Imported CSV');
  });

  render();
}

// ====== Timesheets ======
function pageTimesheets(){
  const headers = ['year','month','staff','cost','days','hours','notes'];
  pageTableCrud('timesheets', headers);
}

// ====== App bootstrap ======
document.addEventListener('DOMContentLoaded', () => {
  Auth.require();
  bindExternalLinks();
  initKPIs();

  // Login
  document.querySelectorAll('form[data-type="login"]').forEach(f => {
    const msg = f.querySelector('.form-msg');
    f.addEventListener('submit', e => {
      e.preventDefault();
      const email = f.querySelector('input[name="email"]').value.trim();
      const pw = f.querySelector('input[name="password"]').value;
      const s = Auth.login(email, pw);
      if (s){ window.location.href = 'dashboard.html'; }
      else { msg.textContent = 'Invalid credentials (try admin@org / demo1234)'; }
    });
  });

  // Contact form
  document.querySelectorAll('form[data-type="contact"]').forEach(f => {
    const msg = f.querySelector('.form-msg');
    f.addEventListener('submit', e => { e.preventDefault(); msg.textContent='Message sent!'; toast('Message sent!'); f.reset(); });
  });

  // Settings external links
  const linksForm = document.querySelector('[data-form-links]');
  if (linksForm){
    const inputs = linksForm.querySelectorAll('input');
    const saved = JSON.parse(localStorage.getItem('ssudan_links')||'{}');
    inputs.forEach(i => i.value = saved[i.name] || '');
    linksForm.querySelector('[data-save-links]').addEventListener('click', () => {
      const cfg = {}; inputs.forEach(i => cfg[i.name] = i.value.trim());
      localStorage.setItem('ssudan_links', JSON.stringify(cfg));
      bindExternalLinks(); toast('Saved links');
    });
  }

  // Initialize pages
  const page = document.body.getAttribute('data-page');
  if (page === 'items')        pageTableCrud('items',        ['sku','name','unit','category','min']);
  if (page === 'warehouses')   pageTableCrud('warehouses',   ['code','name','location','capacity']);
  if (page === 'suppliers')    pageTableCrud('suppliers',    ['id','name','contact','email']);
  if (page === 'purchase-orders') pageTableCrud('pos',       ['po','supplier','date','sku','qty','unit','status']);
  if (page === 'shipments')    pageTableCrud('shipments',    ['ship','po','from','to','eta','status']);
  if (page === 'beneficiaries')pageTableCrud('beneficiaries',['id','name','location','hh','last']);
  if (page === 'movements')    pageMovements();
  if (page === 'timesheets')   pageTimesheets();
});
