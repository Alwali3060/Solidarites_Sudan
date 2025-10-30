// --- Add header user chip + profile storage helpers ---

// If the site already defines Auth/DB/CSV/etc, we augment; otherwise we define minimal Auth.
if (typeof Auth === 'undefined'){
  const HASH=(s)=>{let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return String(h)};
  const DEMO_USERS={"staff@org":{role:"staff",pass:HASH("demo1234")},"hr@org":{role:"hr",pass:HASH("demo1234")},"cd@org":{role:"cd",pass:HASH("demo1234")},"log@org":{role:"logistics",pass:HASH("demo1234")},"admin@org":{role:"admin",pass:HASH("demo1234")}};
  window.Auth={key:"ssudan_auth",login(e,p){const u=DEMO_USERS[e];if(!u||u.pass!==HASH(p))return null;const s={email:e,role:u.role,at:Date.now()};localStorage.setItem(Auth.key,JSON.stringify(s));return s;},me(){try{return JSON.parse(localStorage.getItem(Auth.key)||"null")}catch(e){return null}},logout(){localStorage.removeItem(Auth.key)}};
}

// Inject minimal styles for chip/dropdown (safe even if already present)
(function(){
  const css = `.user-menu{position:relative;display:inline-block}
  .user-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid #e5e7eb;border-radius:999px;padding:6px 10px;background:#fff;cursor:pointer}
  .user-chip .ic{width:26px;height:26px;border-radius:999px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
  .user-panel{position:absolute;right:0;top:42px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 18px rgba(0,0,0,.08);min-width:180px;display:none;z-index:20}
  .user-panel a, .user-panel button{display:block;width:100%;text-align:left;padding:10px 12px;background:#fff;border:0;color:#111;text-decoration:none}
  .user-panel a:hover, .user-panel button:hover{background:#f3f4f6}`;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
})();

// Utility: read profile for current user
function currentProfile(){
  const me = Auth.me && Auth.me();
  if (!me) return null;
  const key = 'ssudan_profile_' + me.email;
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  return {me, saved};
}

// Render/replace the "Log in" button with a user chip & dropdown
function updateHeaderUserChip(){
  const session = (Auth.me && Auth.me()) || null;
  const loginLink = document.querySelector('[data-login-link]');
  if (!loginLink) return;

  if (!session){
    // Not logged in: keep the "Log in" button
    loginLink.textContent = 'Log in';
    loginLink.setAttribute('href','login.html');
    return;
  }

  const { saved } = currentProfile() || {saved:{}};
  const name = saved.name || session.email.split('@')[0];
  const initials = name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const chip = document.createElement('div');
  chip.className = 'user-menu';
  chip.innerHTML = `
    <div class="user-chip" id="userChip">
      <div class="ic">${initials}</div>
      <div class="txt">${name} <span style="color:#6b7280">(${session.role})</span></div>
    </div>
    <div class="user-panel" id="userPanel">
      <a href="profile.html">Profile</a>
      <button type="button" id="logoutBtn">Log out</button>
    </div>`;

  loginLink.replaceWith(chip);

  const chipBtn = chip.querySelector('#userChip');
  const panel = chip.querySelector('#userPanel');
  chipBtn.addEventListener('click', ()=>{
    panel.style.display = panel.style.display==='block' ? 'none' : 'block';
  });
  document.addEventListener('click', (e)=>{
    if (!chip.contains(e.target)) panel.style.display = 'none';
  });
  chip.querySelector('#logoutBtn').addEventListener('click', ()=>{
    Auth.logout && Auth.logout();
    location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Replace login button if logged in
  try { updateHeaderUserChip(); } catch(e){}
  // If profile page, we rely on profile.html inline script to load the form.
});
