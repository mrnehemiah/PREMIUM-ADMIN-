(function(){
const C=window.ZUNE_CONFIG||{},inPages=location.pathname.includes('/pages/'),root=inPages?'../':'';
if(C.AUTH_REQUIRED&&!sessionStorage.getItem('zune_token'))return location.replace(root+'login.html');
const pg=f=>inPages?f:'pages/'+f;
const NAV=[['Dashboard',root+'index.html','▦'],['Users',pg('users.html'),'👥'],['Sellers',pg('sellers.html'),'🏪'],['Verification',pg('verification.html'),'🛡️'],['Products',pg('products.html'),'📦'],['Orders',pg('orders.html'),'🧾'],['Payments',pg('payments.html'),'💳'],['Wallet',pg('wallet.html'),'💰'],['Delivery Pricing',pg('delivery-pricing.html'),'🚚'],['Coupons',pg('coupons.html'),'🏷️'],['Announcements',pg('announcements.html'),'📣'],['Notifications',pg('notifications.html'),'🔔'],['Support Tickets',pg('support-tickets.html'),'🎧'],['Disputes',pg('disputes.html'),'⚖️'],['Reports',pg('reports.html'),'📊'],['Security',pg('security.html'),'🔒'],['Settings',pg('settings.html'),'⚙️'],['Account',pg('account.html'),'👤']];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const here=location.pathname.split('/').pop()||'index.html';
const links=NAV.map(([n,h,i])=>`<a href="${h}" class="${h.split('/').pop()==here?'on':''}"><span>${i}</span>${n}</a>`).join('');
const m=document.getElementById('content');
const app=document.createElement('div');app.className='app';
app.innerHTML=`<aside id="sb"><div class="logo"><b>Z</b><div>ZUNE<small>Admin Panel</small></div></div>${links}</aside><div id="scrim"></div><div class="wrap"><div class="top"><button class="ib" id="mb" aria-label="Menu">☰</button><div class="sp"></div><span class="av">SA</span><b>Super Admin</b></div></div><div id="toast" role="status"></div>`;
document.body.prepend(app);app.querySelector('.wrap').appendChild(m);
const tg=()=>{document.getElementById('sb').classList.toggle('open');document.getElementById('scrim').classList.toggle('on')};
document.getElementById('mb').onclick=tg;document.getElementById('scrim').onclick=tg;
const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.style.display='block';clearTimeout(e._h);e._h=setTimeout(()=>e.style.display='none',2800)};
async function api(p,o={}){if(!C.API_BASE)throw new Error('API_BASE haijawekwa');const r=await fetch(C.API_BASE+p,{...o,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(sessionStorage.getItem('zune_token')||''),...o.headers}});if(!r.ok)throw new Error('Hitilafu '+r.status);return r.json()}
async function load(p,fb){if(!C.API_BASE)return fb;try{return await api(p)}catch(e){toast(e.message);return fb}}
const pill=s=>{const k=String(s).toLowerCase();return `<span class="pill ${/active|verified|completed|approved|delivered/.test(k)?'ok':/pending|processing/.test(k)?'no':/suspend|reject|ban|fail|cancel/.test(k)?'bad':''}">${esc(s)}</span>`};
function table(el,cols,rows){el.innerHTML=`<div class="card"><input type="search" placeholder="Tafuta..." aria-label="Tafuta"></div><div class="card sc"><table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody></tbody></table></div>`;
const tb=el.querySelector('tbody'),q=el.querySelector('input');
const draw=()=>{const s=q.value.toLowerCase();tb.innerHTML=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(s)).map(r=>`<tr>${cols.map(c=>`<td>${c[2]?c[2](r):esc(r[c[0]])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}">Hakuna kilichopatikana.</td></tr>`};q.oninput=draw;draw()}
window.ZUNE={api,load,toast,esc,pill,table,confirm:t=>window.confirm(t)};
})();
