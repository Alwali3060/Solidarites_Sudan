// Minimal app.js tailored for the patch. Drop-in replacement.

// --- Auth (demo) ---
const HASH=(s)=>{let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return String(h)};
const DEMO_USERS={"staff@org":{role:"staff",pass:HASH("demo1234")},"hr@org":{role:"hr",pass:HASH("demo1234")},"cd@org":{role:"cd",pass:HASH("demo1234")},"log@org":{role:"logistics",pass:HASH("demo1234")},"admin@org":{role:"admin",pass:HASH("demo1234")}};
const Auth={key:"ssudan_auth",login(e,p){const u=DEMO_USERS[e];if(!u||u.pass!==HASH(p))return null;const s={email:e,role:u.role,at:Date.now()};localStorage.setItem(Auth.key,JSON.stringify(s));return s;},me(){try{return JSON.parse(localStorage.getItem(Auth.key)||"null")}catch(e){return null}},require(){if(document.body.getAttribute("data-protected")&&!Auth.me())location.href="login.html"}};

// --- DB & CSV ---
const DB={key:n=>`ssudan_${n}`,get:n=>JSON.parse(localStorage.getItem(DB.key(n))||"[]"),set(n,d){localStorage.setItem(DB.key(n),JSON.stringify(d))},add(n,r){const d=DB.get(n);d.push(r);DB.set(n,d)},del(n,i){const d=DB.get(n);d.splice(i,1);DB.set(n,d)}};
const CSV={to:(rows,headers)=>{const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;return headers.map(esc).join(",")+"\n"+rows.map(r=>headers.map(h=>esc(r[h])).join(",")).join("\n")},from:async(file)=>{const t=await file.text();const [head,...lines]=t.split(/\r?\n/).filter(Boolean);const headers=head.split(",").map(h=>h.replace(/^"|"$/g,""));const rows=lines.map(line=>{const cols=line.match(/("([^"]|"")*"|[^,]+)/g).map(c=>c.replace(/^"|"$/g,"").replace(/""/g,'"'));const obj={};headers.forEach((h,i)=>obj[h]=cols[i]);return obj});return {headers,rows}}};
function toast(msg,ok=true){const n=document.createElement("div");n.className="toast "+(ok?"ok":"err");n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2200)}

// --- Movements page (restricted delete + bulk) ---
function pageMovements(){
  const me=Auth.me()||{role:"guest"};
  const canDelete=["hr","cd","admin"].includes(me.role);
  const body=document.querySelector("tbody");
  const formWrap=document.querySelector("[data-form]");
  const btnAdd=document.querySelector("[data-add]");
  const btnSave=document.querySelector("[data-save]");
  const btnCancel=document.querySelector("[data-cancel]");
  const inputFile=document.querySelector("[data-import]");
  const btnExport=document.querySelector("[data-export]");
  const inputs=formWrap.querySelectorAll("input,select,textarea");
  const bulkBar=document.getElementById("bulkActions");

  if (me.role==="hr"){ bulkBar.querySelectorAll("button").forEach(b=>b.style.display=(b.dataset.bulk==="hr"?"inline-block":"none")); }
  else if (me.role==="cd"){ bulkBar.querySelectorAll("button").forEach(b=>b.style.display=(b.dataset.bulk==="cd"?"inline-block":"none")); }
  else if (me.role==="logistics"){ bulkBar.querySelectorAll("button").forEach(b=>b.style.display=(["plan","complete"].includes(b.dataset.bulk)?"inline-block":"none")); }
  else if (me.role==="admin"){ /* show all */ }
  else { bulkBar.style.display="none"; }

  function render(){
    const data=DB.get("movements"); body.innerHTML="";
    data.forEach((row,idx)=>{
      const dates=`${row.start||""} → ${row.end||""}`;
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td><input type="checkbox" data-sel="${idx}" /></td>
        <td>${row.id||""}</td>
        <td>${row.staff||""}</td>
        <td>${row.origin||""}</td>
        <td>${row.dest||""}</td>
        <td>${dates}</td>
        <td>${row.purpose||""}</td>
        <td><span class="badge">${row.status||""}</span></td>
        <td>
          <div class="row-actions">
            ${canDelete?`<button class="btn" data-del="${idx}">Delete</button>`:""}
            ${me.role==="hr"&&row.status==="Submitted"?`<button class="btn" data-act="hr" data-idx="${idx}">HR Approve</button>`:""}
            ${me.role==="cd"&&row.status==="HR_Approved"?`<button class="btn" data-act="cd" data-idx="${idx}">CD Validate</button>`:""}
            ${me.role==="logistics"&&row.status==="CD_Approved"?`<button class="btn" data-act="plan" data-idx="${idx}">Plan</button>`:""}
            ${me.role==="logistics"&&row.status==="Planned"?`<button class="btn" data-act="complete" data-idx="${idx}">Mark Completed</button>`:""}
          </div>
        </td>`;
      body.appendChild(tr);
    });
  }

  btnAdd?.addEventListener("click",()=>{ formWrap.classList.remove("hide"); inputs.forEach(i=>i.value=""); });
  btnCancel?.addEventListener("click",()=> formWrap.classList.add("hide"));
  btnSave?.addEventListener("click",()=>{ const row={}; inputs.forEach(i=>row[i.name]=i.value); DB.add("movements",row); render(); formWrap.classList.add("hide"); toast("Saved"); });

  body.addEventListener("click",(e)=>{
    const del=e.target.getAttribute("data-del");
    const act=e.target.getAttribute("data-act");
    const idx=Number(e.target.getAttribute("data-idx"));
    if (del!==null){
      if(!canDelete){ toast("You do not have permission to delete", false); return; }
      DB.del("movements", Number(del)); render(); toast("Deleted"); return;
    }
    if (act){
      const d=DB.get("movements"); const row=d[idx];
      if (act==="hr" && me.role==="hr") row.status="HR_Approved";
      if (act==="cd" && me.role==="cd") row.status="CD_Approved";
      if (act==="plan" && me.role==="logistics") row.status="Planned";
      if (act==="complete" && me.role==="logistics") row.status="Completed";
      DB.set("movements", d); render(); toast("Updated");
    }
  });

  const selectAll=document.querySelector("[data-select-all]");
  selectAll?.addEventListener("change",(e)=>{ body.querySelectorAll('input[type="checkbox"][data-sel]').forEach(cb=>cb.checked=e.target.checked); });

  bulkBar?.addEventListener("click",(e)=>{
    const kind=e.target.getAttribute("data-bulk"); if(!kind) return;
    const allowed=(me.role==="admin")||(me.role==="hr"&&kind==="hr")||(me.role==="cd"&&kind==="cd")||(me.role==="logistics"&&(kind==="plan"||kind==="complete"));
    if (!allowed){ toast("Not allowed", false); return; }
    const d=DB.get("movements");
    body.querySelectorAll('input[type="checkbox"][data-sel]:checked').forEach(cb=>{
      const i=Number(cb.getAttribute("data-sel"));
      if (kind==="hr" && d[i].status==="Submitted") d[i].status="HR_Approved";
      if (kind==="cd" && d[i].status==="HR_Approved") d[i].status="CD_Approved";
      if (kind==="plan" && d[i].status==="CD_Approved") d[i].status="Planned";
      if (kind==="complete" && d[i].status==="Planned") d[i].status="Completed";
    });
    DB.set("movements", d); render(); toast("Bulk updated");
  });

  // Export/Import
  btnExport?.addEventListener("click",()=>{ const csv=CSV.to(DB.get("movements"),["id","staff","origin","dest","start","end","purpose","status"]); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="movements.csv"; a.click(); });
  inputFile?.addEventListener("change",async(e)=>{ const f=e.target.files[0]; if(!f) return; const {rows}=await CSV.from(f); DB.set("movements",rows); render(); toast("Imported CSV"); });

  render();
}

// Minimal boot to ensure this page works standalone if needed
document.addEventListener("DOMContentLoaded",()=>{ Auth.require(); if(document.body.getAttribute("data-page")==="movements") pageMovements(); });
