/* ============================================================
   app.js — Devtai Shop SPA (Single source of truth)
   ============================================================ */

// ═══════════════════════════════════════════════════════════
//  SHARED DATA STORE
// ═══════════════════════════════════════════════════════════
const DB = {
  stock: [],
  storage: [],

  // computed stats from stock
  get totalMovements() { return this.stock.length; },
  get totalQty()       { return this.stock.reduce((s,r) => s+r.qty, 0); },
  get todayIn()        { const t=today(); return this.stock.filter(r=>r.date===t&&r.qty>0).reduce((s,r)=>s+r.qty,0); },
  get todayCount()     { const t=today(); return this.stock.filter(r=>r.date===t).length; },
};

function today() { return new Date().toISOString().slice(0,10); }

// ═══════════════════════════════════════════════════════════
//  REALTIME STORAGE & CROSS-TAB BROADCAST ENGINE
// ═══════════════════════════════════════════════════════════
const STORAGE_KEYS = {
  PRODUCTS: 'SMART_STOCK_PRODUCTS_V2',
  MOVEMENTS: 'SMART_STOCK_MOVEMENTS_V2',
  STORAGE: 'SMART_STOCK_STORAGE_V2'
};

const realtimeChannel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('SMART_STOCK_POS_REALTIME_SYNC')
  : null;

if (realtimeChannel) {
  realtimeChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC_DATA') {
      loadRealtimeStorage(false);
      showToast('⚡ อัปเดตข้อมูลเรียลไทม์ข้ามหน้าต่างสำเร็จ');
    }
  };
}

function saveRealtimeStorage(broadcast = true) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(PRODUCTS_LIST));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(DB.stock));
    localStorage.setItem(STORAGE_KEYS.STORAGE, JSON.stringify(DB.storage));

    if (broadcast && realtimeChannel) {
      realtimeChannel.postMessage({ type: 'SYNC_DATA', timestamp: Date.now() });
    }
    updateRealtimeStatusBadge(true);
  } catch (err) {
    console.error('Realtime storage error:', err);
  }
}

function loadRealtimeStorage(initial = true) {
  try {
    const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const savedMovements = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    const savedStorage = localStorage.getItem(STORAGE_KEYS.STORAGE);

    if (savedProds) {
      const parsed = JSON.parse(savedProds);
      if (Array.isArray(parsed)) {
        PRODUCTS_LIST = parsed;
      }
    }
    if (savedMovements) DB.stock = JSON.parse(savedMovements);
    if (savedStorage) DB.storage = JSON.parse(savedStorage);

    if (typeof refreshDashboardFromDB === 'function') refreshDashboardFromDB();
    if (typeof applyProductFilters === 'function') applyProductFilters();
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof applyWHFilters === 'function') applyWHFilters();
    if (typeof renderPosProducts === 'function') renderPosProducts();

    updateRealtimeStatusBadge(true);
  } catch (err) {
    console.error('Error loading realtime storage:', err);
  }
}

function updateRealtimeStatusBadge(active = true) {
  const badge = document.getElementById('fbStatusBadge');
  if (badge) {
    badge.className = active ? 'fb-badge online' : 'fb-badge offline';
    badge.innerHTML = active
      ? '<span class="fb-dot" style="background:#10b981;box-shadow:0 0 8px #10b981"></span> เรียลไทม์ 🟢'
      : '<span class="fb-dot"></span> ออฟไลน์ 🟠';
  }
}

// ═══════════════════════════════════════════════════════════
//  ROUTING — navigate between views
// ═══════════════════════════════════════════════════════════
const VIEW_META = {
  dashboard: { heading:'แดชบอร์ด',                   period:true,  addStock:false },
  pos:       { heading:'ระบบขายหน้าร้าน (POS)',      period:false, addStock:false },
  stock:     { heading:'ประวัติการเคลื่อนไหวสต็อก',   period:false, addStock:true  },
  warehouse: { heading:'พื้นที่จัดเก็บ (โกดัง)',     period:false, addStock:false },
  products:  { heading:'รายการสินค้า',                period:false, addStock:false },
  settings:  { heading:'ตั้งค่าระบบ',                 period:false, addStock:false },
};

let currentView = 'dashboard';
let currentUserRole = localStorage.getItem('user_role') || 'admin';

function switchUserRole(role) {
  currentUserRole = role;
  localStorage.setItem('user_role', role);
  applyUserRolePermissions(true);
}

function applyUserRolePermissions(notify = false) {
  const dashLinks = document.querySelectorAll('[data-view="dashboard"]');
  const settingsLinks = document.querySelectorAll('[data-view="settings"]');
  const userNameEl = document.getElementById('sidebarUserName');
  const userRoleEl = document.getElementById('sidebarUserRole');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const dividerEl = document.getElementById('settingsNavDivider');
  const groupLabelEl = document.getElementById('settingsNavGroupLabel');

  if (currentUserRole === 'staff') {
    dashLinks.forEach(el => el.style.display = 'none');
    settingsLinks.forEach(el => el.style.display = 'none');
    if (dividerEl) dividerEl.style.display = 'none';
    if (groupLabelEl) groupLabelEl.style.display = 'none';

    if (userNameEl) userNameEl.textContent = 'พนักงานขาย (Staff)';
    if (userRoleEl) userRoleEl.textContent = 'Cashier Access';
    if (userRoleBadge) {
      userRoleBadge.innerHTML = '👤 พนักงานขาย (Staff)';
      userRoleBadge.style.background = '#eff6ff';
      userRoleBadge.style.color = '#1d4ed8';
      userRoleBadge.style.borderColor = '#bfdbfe';
    }

    if (currentView === 'dashboard' || currentView === 'settings') {
      navigate('pos');
    }
    if (notify) showToast('👤 เข้าสู่ระบบด้วยสิทธิ์ "พนักงานขาย"');
  } else {
    dashLinks.forEach(el => el.style.display = '');
    settingsLinks.forEach(el => el.style.display = '');
    if (dividerEl) dividerEl.style.display = '';
    if (groupLabelEl) groupLabelEl.style.display = '';

    if (userNameEl) userNameEl.textContent = 'ผู้ดูแลระบบ (Admin)';
    if (userRoleEl) userRoleEl.textContent = 'Administrator';
    if (userRoleBadge) {
      userRoleBadge.innerHTML = '👑 ผู้ดูแลระบบ (Admin)';
      userRoleBadge.style.background = '#fff7ed';
      userRoleBadge.style.color = '#c2410c';
      userRoleBadge.style.borderColor = '#ffedd5';
    }

    if (notify) showToast('👑 เข้าสู่ระบบด้วยสิทธิ์ "ผู้ดูแลระบบ"');
  }
}

function navigate(view) {
  if (currentUserRole === 'staff' && (view === 'dashboard' || view === 'settings')) {
    showToast('⛔ พนักงานขายไม่มีสิทธิ์เข้าถึงหน้านี้');
    if (currentView !== 'pos') navigate('pos');
    return;
  }

  if (currentView === view) return;

  // hide old view
  document.getElementById(`view-${currentView}`)?.classList.remove('active');
  // show new
  document.getElementById(`view-${view}`)?.classList.add('active');

  // update nav links
  document.querySelectorAll('.nav-link[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // update nav sub items
  document.querySelectorAll('.nav-sub-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // if view is stock or warehouse, make sure stock menu group is open
  if (view === 'stock' || view === 'warehouse') {
    document.getElementById('nav-group-stock')?.classList.add('open');
  }

  // update topbar
  const meta = VIEW_META[view] || VIEW_META.dashboard;
  const eyebrow = document.getElementById('pageEyebrow');
  if (eyebrow) eyebrow.style.display = 'none';
  document.getElementById('pageHeading').textContent = meta.heading;
  document.getElementById('periodGroup')?.classList.toggle('hidden', !meta.period);
  document.getElementById('btnAddStock')?.classList.toggle('hidden', !meta.addStock);

  currentView = view;
  closeMobileSidebar();

  // lazy init per view
  if (view === 'products' && !productsInited) initProductsView();
  if (view === 'pos' && !posInited) initPosView();
  if (view === 'stock' && !stockInited) initStockView();
  if (view === 'warehouse' && !whInited) initWHView();
  if (view === 'orders' && !ordersInited) initOrdersView();
  if (view === 'settings' && !settingsInited) initSettingsView();
  if (view === 'dashboard') refreshDashboardFromDB();
}

function toggleNavGroup(name) {
  const grp = document.getElementById(`nav-group-${name}`);
  if (grp) grp.classList.toggle('open');
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen = sidebar?.classList.contains('mobile-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar?.classList.add('mobile-open');
    backdrop?.classList.add('show');
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('show');
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════
const CATS = [
  { name:'เสื้อยืด',   pct:0, rev:0, c:'#e8637a' },
  { name:'หมวก',      pct:0, rev:0, c:'#f4a259' },
  { name:'เสื้อโปโล', pct:0, rev:0, c:'#f9d56e' },
  { name:'ฮูดดี้',    pct:0, rev:0, c:'#5cc8a0' },
  { name:'อื่นๆ',     pct:0, rev:0, c:'#4a90d9' },
];

const PERIODS = {
  today: {
    rev:'฿0', drev:'0% จากเมื่อวาน',   upRev:true,
    ord:'0',  dord:'0% จากเมื่อวาน',    upOrd:true,
    cus:'0',  dcus:'0% จากเมื่อวาน',    upCus:true,
    donutTotal:'฿0',
    lbl:['08:00','10:00','12:00','14:00','16:00','18:00'],
    rev_d:[0,0,0,0,0,0],
    ord_d:[0,0,0,0,0,0],
  },
  week: {
    rev:'฿0', drev:'0% จากสัปดาห์ก่อน', upRev:true,
    ord:'0',  dord:'0% จากสัปดาห์ก่อน', upOrd:true,
    cus:'0',  dcus:'0%',                   upCus:true,
    donutTotal:'฿0',
    lbl:['จ','อ','พ','พฤ','ศ','ส','อา'],
    rev_d:[0,0,0,0,0,0,0],
    ord_d:[0,0,0,0,0,0,0],
  },
  month: {
    rev:'฿0', drev:'0% จากเดือนก่อน',  upRev:true,
    ord:'0',  dord:'0% จากเดือนก่อน',   upOrd:true,
    cus:'0',  dcus:'0%',                  upCus:true,
    donutTotal:'฿0',
    lbl:['ส1','ส2','ส3','ส4'],
    rev_d:[0,0,0,0],
    ord_d:[0,0,0,0],
  },
};

let donutChart = null, lineChart = null, dashInited = false;

function initDashboard() {
  if (dashInited) return;
  dashInited = true;
  renderDonut();
  renderLine('today');
  renderTopProducts();
  refreshDashboardFromDB();
}

function refreshDashboardFromDB() {
  // KPI: stock movements count from shared DB
  const stkEl = document.getElementById('kv-stk');
  const sdEl  = document.getElementById('kd-stk');
  if (stkEl) stkEl.textContent = DB.totalMovements;
  if (sdEl)  sdEl.textContent  = `ยอดสต็อกสุทธิ ${DB.totalQty >= 0 ? '+' : ''}${DB.totalQty} ชิ้น`;

  // Recent stock (last 5 rows)
  const body = document.getElementById('recentStockBody');
  if (!body) return;
  const recent = [...DB.stock].sort((a,b)=>(b.date+b.time).localeCompare(a.date+b.time)).slice(0,5);
  const TMAP = { ขายสินค้า:'b-sell', รับเข้า:'b-in', โอนย้าย:'b-move', ปรับยอด:'b-adjust' };
  body.innerHTML = recent.map(r => {
    const [y,m,d] = r.date.split('-');
    const qSign   = r.qty >= 0 ? '+' : '';
    const qCls    = r.qty >= 0 ? 'qty-pos' : 'qty-neg';
    return `<tr>
      <td class="date-main">${d}/${m}/${y}</td>
      <td style="font-weight:600">${r.name}</td>
      <td style="font-size:12px;color:var(--muted)">${r.wcode}</td>
      <td><span class="badge ${TMAP[r.type]||'b-adjust'}">${r.type}</span></td>
      <td class="text-c"><span class="${qCls}">${qSign}${r.qty}</span></td>
    </tr>`;
  }).join('');
}

function switchPeriod(p, btn) {
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyPeriodKPI(p);
  updateLine(p);
  document.getElementById('donutTotalLabel').textContent = PERIODS[p].donutTotal;
}

function applyPeriodKPI(p) {
  const d = PERIODS[p];
  setKPI('kv-rev', 'kd-rev', d.rev, d.drev, d.upRev);
  setKPI('kv-ord', 'kd-ord', d.ord, d.dord, d.upOrd);
  setKPI('kv-cus', 'kd-cus', d.cus, d.dcus, d.upCus);
}

function setKPI(vid, did, val, delta, up) {
  const ve = document.getElementById(vid);
  const de = document.getElementById(did);
  if (!ve || !de) return;
  ve.style.opacity = '.3';
  setTimeout(() => { ve.textContent = val; ve.style.opacity='1'; ve.style.transition='opacity .3s'; }, 120);
  de.textContent = delta;
  de.className = 'kpi-delta ' + (up===true?'up':up===false?'down':'neutral');
}

function renderDonut() {
  const ctx = document.getElementById('donutChart');
  if (!ctx || donutChart) return;
  donutChart = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:CATS.map(c=>c.name),
      datasets:[{
        data:CATS.map(c=>c.pct),
        backgroundColor:CATS.map(c=>c.c),
        borderWidth:3,
        borderColor:getSurfaceColor(),
        hoverOffset:6,
      }]
    },
    options:{
      responsive:false, cutout:'65%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}%`}}
      },
      animation:{animateRotate:true,duration:800},
    }
  });

  const leg = document.getElementById('donutLegend');
  leg.innerHTML = CATS.map(c=>`
    <div class="dl-row">
      <div class="dl-left"><span class="dl-dot" style="background:${c.c}"></span><span class="dl-name">${c.name}</span></div>
      <span class="dl-pct">${c.pct}%</span>
    </div>`).join('');
}

function renderLine(period) {
  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  const p = PERIODS[period];
  if (lineChart) { lineChart.destroy(); lineChart = null; }
  lineChart = new Chart(ctx, {
    type:'line',
    data:{
      labels:p.lbl,
      datasets:[
        { label:'ยอดขาย', data:p.rev_d, borderColor:'#4a90d9', backgroundColor:hexA('#4a90d9',.06), borderWidth:2, tension:.4, fill:true, pointRadius:3, pointBackgroundColor:'#4a90d9', pointBorderColor:'#fff', pointBorderWidth:1.5, yAxisID:'y' },
        { label:'ออเดอร์', data:p.ord_d, borderColor:'#f4a259', backgroundColor:'transparent', borderWidth:2, tension:.4, fill:false, pointRadius:3, pointBackgroundColor:'#f4a259', pointBorderColor:'#fff', pointBorderWidth:1.5, borderDash:[4,3], yAxisID:'y2' },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'var(--surface)',
          titleColor:'var(--text)', bodyColor:'var(--muted)',
          borderColor:'var(--border)', borderWidth:1, cornerRadius:8, padding:10,
          callbacks:{ label:c=>c.datasetIndex===0?` ยอดขาย: ฿${c.parsed.y.toLocaleString()}`:`ออเดอร์: ${c.parsed.y}` }
        }
      },
      scales:{
        x:{ grid:{color:getGridColor()}, ticks:{color:getTickColor(),font:{family:'Inter',size:11}}, border:{display:false} },
        y:{ position:'left', grid:{color:getGridColor()}, ticks:{color:getTickColor(),font:{family:'Inter',size:11},callback:v=>v>=1000?`฿${(v/1000).toFixed(0)}k`:`฿${v}`}, border:{display:false} },
        y2:{ position:'right', grid:{display:false}, ticks:{color:'#f4a259',font:{family:'Inter',size:11}}, border:{display:false} },
      }
    }
  });
}

function updateLine(period) {
  renderLine(period); // re-render with new data
}

const TOP_PRODUCTS = [];

function renderTopProducts() {
  const el = document.getElementById('prodList');
  if (!el) return;
  if (!TOP_PRODUCTS.length) {
    el.innerHTML = `<div style="text-align:center;padding:24px 0;color:var(--muted);font-size:12px">ยังไม่มีข้อมูลสินค้าขายดี</div>`;
    return;
  }
  el.innerHTML = TOP_PRODUCTS.map((p,i)=>`
    <div class="prod-item">
      <span class="prod-rank">${i+1}</span>
      <div class="prod-icon" style="background:${hexA(p.c,.12)}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${p.c}" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name}</div>
        <div class="prod-bar-row">
          <div class="prod-bar-bg"><div class="prod-bar-fill" style="width:${p.pct}%;background:${p.c}"></div></div>
          <span class="prod-sold">${p.sold} ชิ้น</span>
        </div>
      </div>
      <span class="prod-rev">${p.rev}</span>
    </div>`).join('');
}

// ── SAMPLE DATA BACKUP (for restore) ──
let SAMPLE_STOCK = null;
let SAMPLE_STORAGE = null;
let SAMPLE_CATS = null;
let SAMPLE_PERIODS = null;
let SAMPLE_TOP_PRODUCTS = null;

function captureSampleData() {
  SAMPLE_STOCK = JSON.parse(JSON.stringify(DB.stock));
  SAMPLE_STORAGE = JSON.parse(JSON.stringify(DB.storage));
  SAMPLE_CATS = JSON.parse(JSON.stringify(CATS));
  SAMPLE_PERIODS = JSON.parse(JSON.stringify(PERIODS));
  SAMPLE_TOP_PRODUCTS = JSON.parse(JSON.stringify(TOP_PRODUCTS));
}

// ── RESET & CLEAR DASHBOARD ──
function openResetModal() {
  document.getElementById('resetModal')?.classList.add('open');
}
function closeResetModal() {
  document.getElementById('resetModal')?.classList.remove('open');
}
function closeResetModalBg(e) {
  if (e.target === document.getElementById('resetModal')) closeResetModal();
}

function clearAllData() {
  if (!SAMPLE_STOCK) captureSampleData();

  // Clear DB records
  DB.stock = [];
  DB.storage = [];

  // Reset Period values
  Object.keys(PERIODS).forEach(p => {
    PERIODS[p].rev = '฿0';
    PERIODS[p].ord = '0';
    PERIODS[p].cus = '0';
    PERIODS[p].drev = '0%';
    PERIODS[p].dord = '0%';
    PERIODS[p].dcus = '0%';
    PERIODS[p].donutTotal = '฿0';
    PERIODS[p].rev_d = PERIODS[p].rev_d.map(() => 0);
    PERIODS[p].ord_d = PERIODS[p].ord_d.map(() => 0);
  });

  // Reset Donut categories to 0
  CATS.forEach(c => c.pct = 0);
  if (donutChart) {
    donutChart.data.datasets[0].data = CATS.map(c => 0);
    donutChart.update();
  }

  // Reset Top Products
  TOP_PRODUCTS.forEach(p => { p.sold = 0; p.rev = '฿0'; p.pct = 0; });
  renderTopProducts();

  // Update line chart
  const activePeriodBtn = document.querySelector('.period-btn.active');
  const activeP = activePeriodBtn ? activePeriodBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : 'today';
  updateLine(activeP);

  // Re-render UI
  applyPeriodKPI(activeP);
  refreshDashboardFromDB();
  if (stockInited) applyFilters();
  if (whInited) applyWHFilters();

  document.getElementById('donutTotalLabel').textContent = '฿0';

  closeResetModal();
  showToast('🧹 เคลียร์ข้อมูลแดชบอร์ดทั้งหมดเป็น 0 เรียบร้อยแล้ว');
}

function restoreSampleData() {
  if (!SAMPLE_STOCK) captureSampleData();

  DB.stock = JSON.parse(JSON.stringify(SAMPLE_STOCK));
  DB.storage = JSON.parse(JSON.stringify(SAMPLE_STORAGE));

  Object.assign(PERIODS, JSON.parse(JSON.stringify(SAMPLE_PERIODS)));

  CATS.forEach((c, i) => {
    c.pct = SAMPLE_CATS[i].pct;
  });

  if (donutChart) {
    donutChart.data.datasets[0].data = CATS.map(c => c.pct);
    donutChart.update();
  }

  TOP_PRODUCTS.forEach((p, i) => {
    Object.assign(p, SAMPLE_TOP_PRODUCTS[i]);
  });
  renderTopProducts();

  const activePeriodBtn = document.querySelector('.period-btn.active');
  const activeP = activePeriodBtn ? activePeriodBtn.getAttribute('onclick').match(/'([^']+)'/)[1] : 'today';
  updateLine(activeP);
  applyPeriodKPI(activeP);
  document.getElementById('donutTotalLabel').textContent = PERIODS[activeP].donutTotal;

  refreshDashboardFromDB();
  if (stockInited) applyFilters();
  if (whInited) applyWHFilters();

  closeResetModal();
  showToast('🔄 รีเซ็ตข้อมูลแดชบอร์ดกลับเป็นข้อมูลตัวอย่างเรียบร้อยแล้ว');
}

// ═══════════════════════════════════════════════════════════
//  STOCK VIEW
// ═══════════════════════════════════════════════════════════
let stockInited = false;
let filteredStock = [];
let stockSortCol = 'date', stockSortDir = 'desc';
let stockPage = 1;
const PER_PAGE = 8;

const TYPE_CLS  = { ขายสินค้า:'b-sell', รับเข้า:'b-in', โอนย้าย:'b-move', ปรับยอด:'b-adjust' };

function initStockView() {
  stockInited = true;
  applyFilters();
}

function applyFilters() {
  const srch = document.getElementById('srch')?.value.toLowerCase().trim() || '';
  const fType = document.getElementById('fType')?.value || '';
  const fWH   = document.getElementById('fWH')?.value   || '';
  const fFrom = document.getElementById('fFrom')?.value || '';
  const fTo   = document.getElementById('fTo')?.value   || '';

  filteredStock = DB.stock.filter(r => {
    const m1 = !srch || r.name.toLowerCase().includes(srch) || r.variant.toLowerCase().includes(srch) || r.ref.toLowerCase().includes(srch);
    const m2 = !fType || r.type === fType;
    const m3 = !fWH   || r.warehouse === fWH;
    const m4 = !fFrom || r.date >= fFrom;
    const m5 = !fTo   || r.date <= fTo;
    return m1 && m2 && m3 && m4 && m5;
  });

  sortStock();
  stockPage = 1;
  renderStockStats();
  renderStockTable();
  renderPagi();
}

function resetFilters() {
  ['srch','fType','fWH','fFrom','fTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  applyFilters();
  showToast('ล้างตัวกรองแล้ว');
}

function sortBy(col) {
  stockSortDir = (stockSortCol === col && stockSortDir === 'asc') ? 'desc' : 'asc';
  stockSortCol = col;
  sortStock();
  renderStockTable();
}

function sortStock() {
  filteredStock.sort((a,b) => {
    const va = stockSortCol==='date' ? a.date+a.time : a.qty;
    const vb = stockSortCol==='date' ? b.date+b.time : b.qty;
    return stockSortDir==='asc' ? (va<vb?-1:1) : (va>vb?-1:1);
  });
}

function renderStockStats() {
  const el = document.getElementById('stockStats');
  if (!el) return;
  const stats = [
    { label:'รายการทั้งหมด', val:DB.totalMovements, sub:'รายการ', c:'var(--accent)' },
    { label:'รับเข้าวันนี้',  val:DB.todayIn,        sub:'ชิ้น',   c:'var(--green)' },
    { label:'ยอดสต็อกสุทธิ', val:DB.totalQty,       sub:'ชิ้น',   c:DB.totalQty>=0?'var(--green)':'var(--red)' },
    { label:'เคลื่อนไหววันนี้',val:DB.todayCount,    sub:'รายการ', c:'var(--blue)' },
  ];
  el.innerHTML = stats.map(s=>`
    <div class="kpi-card" style="border-top:3px solid ${s.c}">
      <p class="kpi-label">${s.label}</p>
      <h2 class="kpi-value">${s.val}</h2>
      <p class="kpi-delta neutral">${s.sub}</p>
    </div>`).join('');
}

function renderStockTable() {
  const tbody = document.getElementById('stockBody');
  if (!tbody) return;
  const count = document.getElementById('tableCount');
  if (count) count.textContent = `แสดง ${filteredStock.length} รายการ`;

  const start = (stockPage-1)*PER_PAGE;
  const rows  = filteredStock.slice(start, start+PER_PAGE);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      <p style="font-weight:600;margin-bottom:4px">ไม่พบข้อมูล</p>
      <p style="font-size:12px">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const [y,m,d] = r.date.split('-');
    const qSign   = r.qty>=0?'+':'';
    const qCls    = r.qty>=0?'qty-pos':'qty-neg';
    const bgC     = hexA(r.color, .15);
    return `<tr>
      <td>
        <div class="date-main">${d}/${m}/${y}</div>
        <div class="date-time">${r.time} น.</div>
      </td>
      <td>
        <div class="prd-cell">
          <div class="prd-thumb" style="background:${bgC}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${r.color}" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </div>
          <div>
            <div class="prd-name">${r.name}</div>
            <div class="prd-variant" title="${r.variant}">${r.variant}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="wh-main">${r.warehouse}</div>
        <div class="wh-code">${r.wcode}</div>
      </td>
      <td><span class="badge ${TYPE_CLS[r.type]||'b-adjust'}">${r.type}</span></td>
      <td class="text-c"><span class="${qCls}">${qSign}${r.qty}</span></td>
      <td style="font-size:13px;font-weight:500">${r.user}</td>
      <td>
        <div class="ref-main">${r.ref}</div>
        <div class="ref-sub">${r.note}</div>
      </td>
      <td class="text-c">
        <div class="btn-act-wrap">
          <button class="btn-act btn-act--edit" onclick="editStockEntry(${r.id})" title="แก้ไข">✏️ แก้ไข</button>
          <button class="btn-act btn-act--delete" onclick="deleteStockEntry(${r.id})" title="ลบ">🗑️ ลบ</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderPagi() {
  const el = document.getElementById('pagi');
  if (!el) return;
  const total = Math.ceil(filteredStock.length / PER_PAGE);
  if (total <= 1) { el.innerHTML=''; return; }

  let pages = [];
  for (let i=1;i<=total;i++) {
    if (i===1||i===total||Math.abs(i-stockPage)<=1) pages.push(i);
    else if (pages[pages.length-1]!=='…') pages.push('…');
  }

  el.innerHTML = `
    <button class="pg-btn" onclick="goPage(${stockPage-1})" ${stockPage<=1?'disabled':''}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    ${pages.map(p=>p==='…'
      ?`<span class="pg-btn" style="border:none;cursor:default">…</span>`
      :`<button class="pg-btn ${p===stockPage?'active':''}" onclick="goPage(${p})">${p}</button>`
    ).join('')}
    <button class="pg-btn" onclick="goPage(${stockPage+1})" ${stockPage>=total?'disabled':''}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>`;
}

function goPage(p) {
  const total = Math.ceil(filteredStock.length/PER_PAGE);
  stockPage = Math.min(Math.max(1,p), total);
  renderStockTable();
  renderPagi();
}

// ── Stock Modal ──────────────────────────────────────────
function openStockModal(editItem = null) {
  const modal = document.getElementById('stockModal');
  const title = document.getElementById('stockModalTitle');
  const idEl  = document.getElementById('m-stock-id');

  if (editItem) {
    if (title) title.textContent = 'แก้ไขประวัติสต็อก';
    if (idEl)  idEl.value = editItem.id;
    document.getElementById('m-name').value = editItem.name;
    document.getElementById('m-sku').value  = editItem.variant;
    document.getElementById('m-wh').value   = editItem.warehouse;
    document.getElementById('m-qty').value  = editItem.qty;
    document.getElementById('m-note').value = editItem.note || editItem.ref;
  } else {
    if (title) title.textContent = 'รับสินค้าเข้าคลัง';
    if (idEl)  idEl.value = '';
    ['m-name','m-sku','m-qty','m-note'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.value = '';
    });
  }
  modal.classList.add('open');
}

function closeStockModal() {
  document.getElementById('stockModal').classList.remove('open');
}

function closeModalBg(e) {
  if (e.target === document.getElementById('stockModal')) closeStockModal();
}

function editStockEntry(id) {
  const item = DB.stock.find(r => r.id === id);
  if (item) openStockModal(item);
}

function deleteStockEntry(id) {
  const idx = DB.stock.findIndex(r => r.id == id);
  if (idx !== -1) {
    const item = DB.stock[idx];
    DB.stock.splice(idx, 1);
    if (typeof fbService !== 'undefined') fbService.deleteStock(id);
    applyFilters();
    refreshDashboardFromDB();
    showToast(`🗑️ ลบรายการ "${item.name}" เรียบร้อยแล้ว`);
  }
}

function addStockEntry() {
  const editId = document.getElementById('m-stock-id')?.value;
  const name   = document.getElementById('m-name')?.value.trim();
  const sku    = document.getElementById('m-sku')?.value.trim();
  const wh     = document.getElementById('m-wh')?.value;
  const qty    = parseInt(document.getElementById('m-qty')?.value);
  const note   = document.getElementById('m-note')?.value.trim() || 'รับสินค้าเข้าคลัง';

  if (!name || !sku || isNaN(qty)) { showToast('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน'); return; }

  if (editId) {
    const item = DB.stock.find(r => r.id == editId);
    if (item) {
      item.name = name;
      item.variant = sku;
      item.warehouse = wh;
      item.wcode = wh === 'Bangkok Main Warehouse' ? 'WH-BKK' : 'WH-CNX';
      item.qty = +qty;
      item.note = note;
      if (typeof fbService !== 'undefined') fbService.updateStock(editId, item);
      showToast(`✓ อัปเดตรายการ "${name}" แล้ว`);
    }
  } else {
    const now  = new Date();
    const date = now.toISOString().slice(0,10);
    const time = now.toTimeString().slice(0,5);

    const entry = {
      id:       Date.now(),
      date, time, name,
      variant:  sku,
      warehouse:wh,
      wcode:    wh==='Bangkok Main Warehouse'?'WH-BKK':'WH-CNX',
      type:     qty >= 0 ? 'รับเข้า' : 'ขายสินค้า',
      qty:      +qty,
      user:     (typeof fbService !== 'undefined' && fbService.currentUser?.displayName) ? fbService.currentUser.displayName : 'devtai code',
      ref:      `PO${date.replace(/-/g,'')}${String(DB.stock.length+1).padStart(3,'0')}`,
      note,
      color:    '#5cc8a0',
    };

    DB.stock.unshift(entry);
    if (typeof fbService !== 'undefined') fbService.pushStock(entry);

    // Synchronize with PRODUCTS_LIST
    let matchedProd = PRODUCTS_LIST.find(p => p.sku === sku || p.name.toLowerCase() === name.toLowerCase());
    if (matchedProd) {
      matchedProd.qty = Math.max(0, matchedProd.qty + (+qty));
    } else {
      PRODUCTS_LIST.unshift({
        id: Date.now(),
        sku: sku,
        name: name,
        cat: 'ทั่วไป',
        qty: Math.max(0, +qty),
        posPrice: 100,
        onlinePrice: 120,
        discount: 0,
        icon: '📦'
      });
    }

    showToast(`✓ บันทึกรายการ "${name}" แล้ว ${qty} ชิ้น`);
  }

  closeStockModal();
  applyFilters();
  if (productsInited) applyProductFilters();
  if (whInited) applyWHFilters();
  if (posInited) renderPosProducts();
  refreshDashboardFromDB();
  saveRealtimeStorage();
}

// ── Export CSV ───────────────────────────────────────────
function exportCSV() {
  const hdr = ['วันที่','เวลา','สินค้า','Variant','โกดัง','ประเภท','จำนวน','ผู้บันทึก','อ้างอิง','หมายเหตุ'];
  const rows = filteredStock.map(r =>
    [r.date,r.time,r.name,r.variant,r.warehouse,r.type,r.qty,r.user,r.ref,r.note]
      .map(v=>`"${String(v).replace(/"/g,'""')}"`)
      .join(',')
  );
  const csv = [hdr.join(','),...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`stock-${new Date().toISOString().slice(0,10)}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
  showToast('✓ ส่งออกข้อมูลสำเร็จ');
}

// ═══════════════════════════════════════════════════════════
//  SIDEBAR & THEME
// ═══════════════════════════════════════════════════════════
function setupSidebar() {
  document.getElementById('collapseBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('main').classList.toggle('expanded');
  });
}

function setupTheme() {
  const btn   = document.getElementById('themeBtn');
  const saved = localStorage.getItem('devtai-theme')||'light';
  if (saved==='dark') document.documentElement.setAttribute('data-dark','');

  btn.addEventListener('click', () => {
    const isDark = document.documentElement.hasAttribute('data-dark');
    isDark
      ? document.documentElement.removeAttribute('data-dark')
      : document.documentElement.setAttribute('data-dark','');
    localStorage.setItem('devtai-theme', isDark?'light':'dark');
    // update donut border color
    if (donutChart) {
      donutChart.data.datasets[0].borderColor = getSurfaceColor();
      donutChart.update();
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════
function showToast(msg, ms=2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove('show'), ms);
}

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function hexA(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
function getSurfaceColor() {
  return document.documentElement.hasAttribute('data-dark') ? '#1c1c1c' : '#ffffff';
}
function getGridColor()  { return document.documentElement.hasAttribute('data-dark')?'rgba(255,255,255,.05)':'rgba(0,0,0,.04)'; }
function getTickColor()  { return document.documentElement.hasAttribute('data-dark')?'#555':'#bbb'; }

// ═══════════════════════════════════════════════════════════
//  WAREHOUSE / STORAGE LOCATIONS VIEW
// ═══════════════════════════════════════════════════════════
let whInited = false;
let filteredWH = [];

function initWHView() {
  whInited = true;
  applyWHFilters();
}

function applyWHFilters() {
  const srch = document.getElementById('whSrch')?.value.toLowerCase().trim() || '';
  const fCat = document.getElementById('whFCat')?.value || '';
  const fLoc = document.getElementById('whFLoc')?.value || '';

  filteredWH = DB.storage.filter(r => {
    const m1 = !srch || r.category.toLowerCase().includes(srch) || r.location.toLowerCase().includes(srch) || r.product.toLowerCase().includes(srch);
    const m2 = !fCat || r.category === fCat;
    const m3 = !fLoc || r.location.includes(fLoc);
    return m1 && m2 && m3;
  });

  renderWHStats();
  renderWHTable();
}

function resetWHFilters() {
  ['whSrch','whFCat','whFLoc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  applyWHFilters();
  showToast('ล้างตัวกรองพื้นที่จัดเก็บแล้ว');
}

function renderWHStats() {
  const el = document.getElementById('whStats');
  if (!el) return;
  const totalItems = DB.storage.reduce((s, r) => s + r.qty, 0);
  const totalLocations = new Set(DB.storage.map(r => r.location)).size;
  const totalCategories = new Set(DB.storage.map(r => r.category)).size;

  const stats = [
    { label: 'จุดจัดเก็บทั้งหมด', val: totalLocations, sub: 'พื้นที่', c: 'var(--blue)' },
    { label: 'หมวดหมู่สินค้า', val: totalCategories, sub: 'หมวดหมู่', c: 'var(--purple)' },
    { label: 'จำนวนสินค้ารวม', val: totalItems, sub: 'หน่วยรวม', c: 'var(--green)' },
    { label: 'รายการจัดเก็บ', val: DB.storage.length, sub: 'รายการ', c: 'var(--accent)' },
  ];
  el.innerHTML = stats.map(s => `
    <div class="kpi-card" style="border-top:3px solid ${s.c}">
      <p class="kpi-label">${s.label}</p>
      <h2 class="kpi-value">${s.val.toLocaleString()}</h2>
      <p class="kpi-delta neutral">${s.sub}</p>
    </div>`).join('');
}

function renderWHTable() {
  const tbody = document.getElementById('whTableBody');
  if (!tbody) return;
  const count = document.getElementById('whTableCount');
  if (count) count.textContent = `แสดง ${filteredWH.length} รายการ`;

  if (!filteredWH.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:8px">🏢</div>
      <p style="font-weight:600;margin-bottom:4px">ไม่พบพื้นที่จัดเก็บ</p>
      <p style="font-size:12px">ลองเปลี่ยนคำค้นหาหรือเพิ่มจุดจัดเก็บใหม่</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = filteredWH.map(r => `
    <tr>
      <td><span class="badge b-move" style="font-weight:700">${r.category}</span></td>
      <td><strong style="color:var(--text);font-size:13px">${r.location}</strong></td>
      <td style="font-weight:600">${r.product}</td>
      <td class="text-c"><span class="qty-pos" style="font-size:14px">${r.qty.toLocaleString()}</span></td>
      <td class="text-c"><span class="badge b-adjust">${r.unit}</span></td>
      <td class="text-c">
        <div class="btn-act-wrap">
          <button class="btn-act btn-act--edit" onclick="editStorageEntry(${r.id})" title="แก้ไข">✏️ แก้ไข</button>
          <button class="btn-act btn-act--delete" onclick="deleteStorageEntry(${r.id})" title="ลบ">🗑️ ลบ</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openWHModal(editItem = null) {
  const modal = document.getElementById('whModal');
  const title = document.getElementById('whModalTitle');
  const idEl  = document.getElementById('m-wh-id');

  if (editItem) {
    if (title) title.textContent = 'แก้ไขพื้นที่จัดเก็บสินค้า';
    if (idEl)  idEl.value = editItem.id;
    document.getElementById('m-wh-cat').value  = editItem.category;
    document.getElementById('m-wh-loc').value  = editItem.location;
    document.getElementById('m-wh-prod').value = editItem.product;
    document.getElementById('m-wh-qty').value  = editItem.qty;
    document.getElementById('m-wh-unit').value = editItem.unit;
  } else {
    if (title) title.textContent = 'เพิ่มพื้นที่จัดเก็บสินค้า';
    if (idEl)  idEl.value = '';
    ['m-wh-loc','m-wh-prod','m-wh-qty'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.value = '';
    });
  }
  modal.classList.add('open');
}

function closeWHModal() { document.getElementById('whModal').classList.remove('open'); }
function closeWHModalBg(e) { if (e.target === document.getElementById('whModal')) closeWHModal(); }

function editStorageEntry(id) {
  const item = DB.storage.find(r => r.id === id);
  if (item) openWHModal(item);
}

function deleteStorageEntry(id) {
  const idx = DB.storage.findIndex(r => r.id == id);
  if (idx !== -1) {
    const item = DB.storage[idx];
    DB.storage.splice(idx, 1);
    if (typeof fbService !== 'undefined') fbService.deleteStorage(id);
    applyWHFilters();
    showToast(`🗑️ ลบพื้นที่จัดเก็บ "${item.product}" เรียบร้อยแล้ว`);
  }
}

function addStorageEntry() {
  const editId = document.getElementById('m-wh-id')?.value;
  const cat    = document.getElementById('m-wh-cat')?.value;
  const loc    = document.getElementById('m-wh-loc')?.value.trim();
  const prod   = document.getElementById('m-wh-prod')?.value.trim();
  const qty    = parseInt(document.getElementById('m-wh-qty')?.value);
  const unit   = document.getElementById('m-wh-unit')?.value;

  if (!loc || !prod || isNaN(qty) || qty <= 0) {
    showToast('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  if (editId) {
    const item = DB.storage.find(r => r.id == editId);
    if (item) {
      item.category = cat;
      item.location = loc;
      item.product  = prod;
      item.qty      = +qty;
      item.unit     = unit;
      if (typeof fbService !== 'undefined') fbService.updateStorage(editId, item);
      showToast(`✓ อัปเดตพื้นที่จัดเก็บ "${prod}" แล้ว`);
    }
  } else {
    const newStorage = {
      id: Date.now(),
      category: cat,
      location: loc,
      product: prod,
      qty: +qty,
      unit: unit
    };
    DB.storage.unshift(newStorage);
    if (typeof fbService !== 'undefined') fbService.pushStorage(newStorage);
    showToast(`✓ บันทึกพื้นที่จัดเก็บ "${prod}" ที่ ${loc} แล้ว`);
  }

  closeWHModal();
  applyWHFilters();
}

// ═══════════════════════════════════════════════════════════
//  MENU RENAME SYSTEM
// ═══════════════════════════════════════════════════════════
let isEditModeActive = false;

function toggleMenuEditMode(active) {
  isEditModeActive = active;
  document.body.classList.toggle('edit-mode-active', active);
  if (active) {
    showToast('✏️ เปิดโหมดแก้ไขชื่อเมนูแล้ว');
  } else {
    showToast('🔒 ปิดโหมดแก้ไขชื่อเมนูแล้ว');
  }
}

const defaultMenuNames = {
  dashboard: 'แดชบอร์ด',
  stock:     'คลังสินค้า',
  warehouse: 'พื้นที่จัดเก็บ (โกดัง)',
  addstock:  'รับสินค้าเข้า',
  history:   'ประวัติการเคลื่อนไหว',
  products:  'สินค้า',
  orders:    'คำสั่งซื้อ',
  customers: 'ลูกค้า',
  settings:  'ตั้งค่าระบบ',
};

let menuNames = { ...defaultMenuNames };

function loadMenuNames() {
  try {
    const saved = localStorage.getItem('devtai-menu-names');
    if (saved) menuNames = { ...defaultMenuNames, ...JSON.parse(saved) };
  } catch(e){}
  applyMenuNamesToUI();
}

function applyMenuNamesToUI() {
  Object.keys(menuNames).forEach(key => {
    const el = document.getElementById(`m-text-${key}`);
    if (el) el.textContent = menuNames[key];
    if (VIEW_META[key]) {
      VIEW_META[key].heading = menuNames[key];
    }
  });
  if (VIEW_META[currentView]) {
    const headingEl = document.getElementById('pageHeading');
    if (headingEl) headingEl.textContent = VIEW_META[currentView].heading;
  }
}

function openMenuEdit(e, key) {
  if (e) e.stopPropagation();
  const modal = document.getElementById('menuModal');
  const keyEl = document.getElementById('m-menu-key');
  const nameEl = document.getElementById('m-menu-name');
  if (keyEl) keyEl.value = key;
  if (nameEl) nameEl.value = menuNames[key] || '';
  modal?.classList.add('open');
  setTimeout(() => nameEl?.focus(), 100);
}

function closeMenuModal() {
  document.getElementById('menuModal')?.classList.remove('open');
}

function closeMenuModalBg(e) {
  if (e.target === document.getElementById('menuModal')) closeMenuModal();
}

function saveMenuName() {
  const key  = document.getElementById('m-menu-key')?.value;
  const name = document.getElementById('m-menu-name')?.value.trim();
  if (!key || !name) { showToast('⚠️ กรุณากรอกชื่อเมนู'); return; }

  menuNames[key] = name;
  try {
    localStorage.setItem('devtai-menu-names', JSON.stringify(menuNames));
  } catch(e){}

  applyMenuNamesToUI();
  closeMenuModal();
  showToast(`✓ เปลี่ยนชื่อเมนูเป็น "${name}" เรียบร้อยแล้ว`);
}

// ═══════════════════════════════════════════════════════════
//  FIREBASE AUTHENTICATION & REALTIME HANDLERS
// ═══════════════════════════════════════════════════════════
function toggleAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const subtitle = document.getElementById('authSubtitle');

  if (mode === 'register') {
    loginForm?.classList.add('hidden');
    regForm?.classList.remove('hidden');
    if (subtitle) subtitle.textContent = 'สร้างบัญชีผู้ใช้งานใหม่สำหรับ Devtai Shop';
  } else {
    regForm?.classList.add('hidden');
    loginForm?.classList.remove('hidden');
    if (subtitle) subtitle.textContent = 'เข้าสู่ระบบเพื่อจัดการสต็อกและแดชบอร์ด';
  }
}

function handleLogin(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }

  try {
    const inputUser = document.getElementById('loginEmail')?.value?.trim() || '';

    if (!inputUser) {
      showToast('⚠️ กรุณากรอก ไอดีผู้ใช้ หรือ อีเมล');
      return false;
    }

    const foundUser = USERS_LIST.find(u => 
      (u.userId && u.userId.toLowerCase() === inputUser.toLowerCase()) || 
      (u.email && u.email.toLowerCase() === inputUser.toLowerCase())
    );

    let role = 'Administrator';
    let displayName = inputUser;
    let email = inputUser.includes('@') ? inputUser : `${inputUser}@devtai.com`;

    if (foundUser) {
      displayName = foundUser.name;
      email = foundUser.email || email;
      role = foundUser.role;
      if (foundUser.role === 'Staff' || foundUser.role === 'Staff / Cashier') {
        currentUserRole = 'staff';
      } else {
        currentUserRole = 'admin';
      }
    } else {
      if (inputUser.toLowerCase().includes('staff') || inputUser.toLowerCase().includes('cashier')) {
        role = 'Staff';
        displayName = 'พนักงานขาย (Staff)';
        currentUserRole = 'staff';
      } else {
        currentUserRole = 'admin';
        displayName = (inputUser === 'admin' || !inputUser) ? 'ผู้ดูแลระบบ (Admin)' : inputUser;
      }
    }

    localStorage.setItem('user_role', currentUserRole);
    const userObj = { displayName, email, role, userId: foundUser?.userId || inputUser };

    if (typeof fbService !== 'undefined') {
      fbService.currentUser = userObj;
    }

    localStorage.setItem('devtai-user', JSON.stringify(userObj));
    onAuthStatusChanged(userObj);
    applyUserRolePermissions(false);

    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }

    showToast(`🟢 เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${displayName} (${currentUserRole === 'admin' ? 'Admin' : 'Staff'})`);
  } catch (err) {
    console.error('Login error:', err);
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  }
  return false;
}

async function handleRegister(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('regName')?.value.trim() || 'User';
  const email = document.getElementById('regEmail')?.value.trim() || 'user@devtai.com';
  const userInfo = { displayName: name, email };
  try { localStorage.setItem('devtai-user', JSON.stringify(userInfo)); } catch(err){}
  onAuthStatusChanged(userInfo);
  showToast(`🎉 สมัครสมาชิกเรียบร้อยแล้ว ยินดีต้อนรับ ${name}`);
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
}

function quickDemoLogin() {
  const demoUser = { displayName: 'ผู้ดูแลระบบ (Admin)', email: 'admin@devtai.com' };
  if (typeof fbService !== 'undefined') fbService.currentUser = demoUser;
  try { localStorage.setItem('devtai-user', JSON.stringify(demoUser)); } catch(err){}
  onAuthStatusChanged(demoUser);
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
  }
  showToast('⚡ เข้าใช้งานด้วยบัญชี Admin Demo แล้ว');
}

function logoutUser(e) {
  if (e) e.stopPropagation();
  if (typeof fbService !== 'undefined') fbService.logout();
  try { localStorage.removeItem('devtai-user'); } catch(err){}
  showToast('🔒 ออกจากระบบเรียบร้อยแล้ว');
  const overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  }
}

function checkSavedAuth() {
  try {
    const saved = localStorage.getItem('devtai-user');
    const overlay = document.getElementById('authOverlay');

    if (saved) {
      const user = JSON.parse(saved);
      if (typeof fbService !== 'undefined') fbService.currentUser = user;
      onAuthStatusChanged(user);
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
      }
    } else {
      // Default auto-login as Admin so user is never stuck on login screen
      const defaultUser = { displayName: 'ผู้ดูแลระบบ (Admin)', email: 'admin@devtai.com', role: 'Administrator' };
      try { localStorage.setItem('devtai-user', JSON.stringify(defaultUser)); } catch(err){}
      onAuthStatusChanged(defaultUser);
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
      }
    }
  } catch(e) {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  }
}

function onAuthStatusChanged(user) {
  const name = user ? (user.displayName || user.email.split('@')[0]) : 'ผู้ใช้งาน';

  // update sidebar
  const sidebarName = document.querySelector('.user-name');
  if (sidebarName) sidebarName.textContent = name;
  const sidebarAv = document.getElementById('sidebarAvImg');
  if (sidebarAv) sidebarAv.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff9800&color=fff&size=64`;

  // update topbar
  const topbarName = document.getElementById('userDisplayName');
  if (topbarName) topbarName.textContent = name;

  const avImg = document.getElementById('userAvImg');
  if (avImg) avImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff9800&color=fff&size=64`;
}

// ── Firebase Config Modal ──
function openFBModal() {
  const modal = document.getElementById('fbModal');
  const cfg = (typeof fbService !== 'undefined') ? fbService.config : {};
  if (document.getElementById('fb-apiKey')) document.getElementById('fb-apiKey').value = cfg.apiKey || '';
  if (document.getElementById('fb-dbUrl')) document.getElementById('fb-dbUrl').value = cfg.databaseURL || '';
  if (document.getElementById('fb-projectId')) document.getElementById('fb-projectId').value = cfg.projectId || '';
  modal?.classList.add('open');
}

function closeFBModal() {
  document.getElementById('fbModal')?.classList.remove('open');
}

function closeFBModalBg(e) {
  if (e.target === document.getElementById('fbModal')) closeFBModal();
}

function saveFirebaseConfig() {
  const apiKey = document.getElementById('fb-apiKey')?.value.trim();
  const databaseURL = document.getElementById('fb-dbUrl')?.value.trim();
  const projectId = document.getElementById('fb-projectId')?.value.trim();

  if (!apiKey || !databaseURL) {
    showToast('⚠️ กรุณากรอก API Key และ Database URL');
    return;
  }

  if (typeof fbService !== 'undefined') {
    fbService.saveConfig({ apiKey, databaseURL, projectId });
  }
  closeFBModal();
  showToast('🔥 บันทึกการตั้งค่า Firebase แล้ว ระบบจะรีโหลดเพื่อเชื่อมต่อ...');
}

function initFirebaseRealtime() {
  if (typeof fbService === 'undefined') return;
  fbService.listenStock((remoteStock) => {
    if (remoteStock && remoteStock.length) {
      DB.stock = remoteStock;
      refreshDashboardFromDB();
      if (stockInited) applyFilters();
    }
  });

  fbService.listenStorage((remoteStorage) => {
    if (remoteStorage && remoteStorage.length) {
      DB.storage = remoteStorage;
      if (whInited) applyWHFilters();
    }
  });
}

// ═══════════════════════════════════════════════════════════
//  ORDERS & TIKTOK SHOP OPEN API INTEGRATION
// ═══════════════════════════════════════════════════════════
let ordersInited = false;
let currentAwbOrder = null;

let ORDERS_DATA = [];

function initOrdersView() {
  ordersInited = true;
  fetchOrdersFromWebhookServer();
  applyOrderFilters();
  // Poll webhook server every 5s for incoming orders
  setInterval(fetchOrdersFromWebhookServer, 5000);
}

async function fetchOrdersFromWebhookServer() {
  try {
    const res = await fetch('http://localhost:3001/api/orders');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach(srvOrd => {
        if (!ORDERS_DATA.find(x => x.id === srvOrd.id)) {
          ORDERS_DATA.unshift(srvOrd);
        }
      });
      applyOrderFilters();
    }
  } catch (err) {
    // Silent catch if backend server not reachable
  }
}

async function testSimulateWebhook(channel) {
  try {
    showToast(`⚡ กำลังยิง Webhook ทดสอบช่องทาง "${channel}"...`);
    const res = await fetch('http://localhost:3001/api/orders/test-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel })
    });
    const result = await res.json();
    if (result.success && result.order) {
      if (!ORDERS_DATA.find(x => x.id === result.order.id)) {
        ORDERS_DATA.unshift(result.order);
      }
      applyOrderFilters();
      showToast(`🎉 ได้รับออเดอร์ใหม่จาก ${channel} (${result.order.id}) เรียบร้อยแล้ว!`);
    }
  } catch (err) {
    showToast(`⚠️ ไม่สามารถเชื่อมต่อ Webhook Server (Port 3001) ได้`);
  }
}

function applyOrderFilters() {
  const q = document.getElementById('orderSrch')?.value.toLowerCase().trim() || '';
  const statusF = document.getElementById('orderStatusFilter')?.value || '';
  const channelF = document.getElementById('orderChannelFilter')?.value || '';

  const filtered = ORDERS_DATA.filter(o => {
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.tracking.toLowerCase().includes(q) || o.items.toLowerCase().includes(q);
    const matchStatus = !statusF || o.status === statusF;
    const matchChannel = !channelF || o.channel === channelF;
    return matchQ && matchStatus && matchChannel;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(dataList) {
  const tbody = document.getElementById('ordersTableBody');
  const countEl = document.getElementById('orderTableCount');
  if (countEl) countEl.textContent = `แสดง ${dataList.length} รายการคำสั่งซื้อ`;
  if (!tbody) return;

  if (!dataList.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">ไม่พบรายการคำสั่งซื้อตรงตามเงื่อนไข</td></tr>`;
    return;
  }

  const statusBadges = {
    'unfulfilled': '<span class="badge b-move">🟠 รอจัดส่ง</span>',
    'tracking_created': '<span class="badge b-in">🔵 ออกเลขพัสดุแล้ว</span>',
    'shipped': '<span class="badge b-sell">🟢 จัดส่งแล้ว</span>'
  };

  tbody.innerHTML = dataList.map(o => `
    <tr>
      <td><input type="checkbox" ${o.selected ? 'checked' : ''} onchange="toggleOrderSelect('${o.id}', this.checked)" /></td>
      <td><strong>${o.id}</strong></td>
      <td><span class="badge b-in">${o.channelIcon} ${o.channel}</span></td>
      <td>
        <div style="font-size:13px;font-weight:700">${o.customer}</div>
        <div style="font-size:11.5px;color:var(--muted);max-width:200px" title="${o.address}">${o.address}</div>
      </td>
      <td><span style="font-size:12px;font-weight:500">${o.items}</span></td>
      <td><span style="font-weight:700;font-size:12px">${o.courier}</span></td>
      <td>
        ${o.tracking ? `<code style="font-weight:700;color:var(--accent)">${o.tracking}</code>` : `<span style="color:var(--muted);font-size:12px">ยังไม่ออกเลข</span>`}
      </td>
      <td class="text-c">${statusBadges[o.status] || o.status}</td>
      <td class="text-c">
        <div style="display:flex;gap:6px;justify-content:center">
          ${!o.tracking ? `<button class="btn-act btn-act--edit" onclick="generateTracking('${o.id}')">📦 ออกเลขพัสดุ</button>` : ''}
          <button class="btn-act btn-act--edit" style="background:rgba(255,152,0,0.1);color:#f57c00;border-color:rgba(255,152,0,0.3)" onclick="openAwbModal('${o.id}')">🖨️ พิมพ์ใบปะหน้า</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function toggleSelectAllOrders(checked) {
  ORDERS_DATA.forEach(o => o.selected = checked);
  applyOrderFilters();
}

function toggleOrderSelect(id, checked) {
  const o = ORDERS_DATA.find(x => x.id === id);
  if (o) o.selected = checked;
}

function syncTikTokOrders() {
  showToast('🔄 กำลังเชื่อมต่อ TikTok Shop Open API...');
  setTimeout(() => {
    const newId = `TT-57891234${Math.floor(1000 + Math.random() * 9000)}`;
    ORDERS_DATA.unshift({
      id: newId,
      channel: 'TikTok Shop',
      channelIcon: '🎵',
      customer: 'คุณกิตติศักดิ์ เจริญสุข',
      address: '77/4 หมู่ 1 ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
      phone: '085-444-9988',
      items: '• เสื้อยืดกราฟิก Devtai Edition ไซส์ M (x1)',
      courier: 'J&T Express',
      tracking: '',
      status: 'unfulfilled',
      selected: false
    });
    applyOrderFilters();
    showToast(`🎉 ดึงออเดอร์ใหม่จาก TikTok Shop สำเร็จ! (ออเดอร์ ${newId})`);
  }, 1000);
}

function generateTracking(orderId) {
  const o = ORDERS_DATA.find(x => x.id === orderId);
  if (!o) return;
  const prefix = o.courier.startsWith('J&T') ? 'TH' : (o.courier.startsWith('Flash') ? 'FL' : 'KEX');
  o.tracking = `${prefix}${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  o.status = 'tracking_created';
  applyOrderFilters();
  showToast(`📦 สร้างเลขพัสดุ ${o.tracking} (${o.courier}) สำเร็จ!`);
}

function openAwbModal(orderId) {
  const o = ORDERS_DATA.find(x => x.id === orderId);
  if (!o) return;
  currentAwbOrder = o;

  if (!o.tracking) {
    generateTracking(orderId);
  }

  document.getElementById('awbCourierBadge').textContent = o.courier;
  document.getElementById('awbTrackingNum').textContent   = o.tracking || 'TH0129384756';
  document.getElementById('awbRecipName').textContent    = o.customer;
  document.getElementById('awbRecipAddr').textContent    = o.address;
  document.getElementById('awbRecipPhone').textContent   = o.phone;
  document.getElementById('awbItemList').textContent     = o.items;
  document.getElementById('awbOrderNum').textContent     = o.id;

  document.getElementById('printAwbModal')?.classList.add('open');
}

function closeAwbModal() { document.getElementById('printAwbModal')?.classList.remove('open'); }
function closeAwbModalBg(e) { if (e.target === document.getElementById('printAwbModal')) closeAwbModal(); }

function printAwbSticker() {
  if (currentAwbOrder) {
    currentAwbOrder.status = 'shipped';
    applyOrderFilters();
  }
  window.print();
  showToast('🖨️ สั่งพิมพ์ใบปะหน้าพัสดุเรียบร้อยแล้ว');
}

function batchPrintAWB() {
  const selected = ORDERS_DATA.filter(o => o.selected);
  if (!selected.length) {
    showToast('⚠️ กรุณาเลือกรายการออเดอร์ที่ต้องการพิมพ์ใบปะหน้าอย่างน้อย 1 รายการ');
    return;
  }
  openAwbModal(selected[0].id);
  showToast(`🖨️ เตรียมพิมพ์ใบปะหน้ากลุ่มจำนวน ${selected.length} รายการ`);
}

function openTikTokModal() { document.getElementById('tiktokModal')?.classList.add('open'); }
function closeTikTokModal() { document.getElementById('tiktokModal')?.classList.remove('open'); }
function closeTikTokModalBg(e) { if (e.target === document.getElementById('tiktokModal')) closeTikTokModal(); }

function saveTikTokConfig() {
  const key = document.getElementById('ttAppKey')?.value.trim();
  const secret = document.getElementById('ttAppSecret')?.value.trim();
  if (!key || !secret) {
    showToast('⚠️ กรุณากรอก TikTok App Key และ App Secret');
    return;
  }
  closeTikTokModal();
  showToast('🎵 บันทึกตั้งค่าและเชื่อมต่อ TikTok Shop API เรียบร้อยแล้ว!');
}

// ═══════════════════════════════════════════════════════════
//  SYSTEM SETTINGS HANDLERS (Users & Roles, LINE Bot, Backup)
// ═══════════════════════════════════════════════════════════
let settingsInited = false;

const DEFAULT_USERS_LIST = [
  { id: 1, userId: 'admin', name: 'ผู้ดูแลระบบ (Admin)', email: 'admin@devtai.com', password: 'admin', role: 'Administrator', status: 'Active' },
  { id: 2, userId: 'staff1', name: 'พนักงานขาย 1', email: 'staff@devtai.com', password: 'staff', role: 'Staff', status: 'Active' }
];

let USERS_LIST = loadUsersFromStorage();

function loadUsersFromStorage() {
  try {
    const saved = localStorage.getItem('SMART_STOCK_USERS_V2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e){}
  return [...DEFAULT_USERS_LIST];
}

function saveUsersToStorage() {
  try {
    localStorage.setItem('SMART_STOCK_USERS_V2', JSON.stringify(USERS_LIST));
  } catch(e){}
}

function initSettingsView() {
  settingsInited = true;
  renderUserTable();
}

function switchSettingsTab(tabKey, btnEl) {
  document.querySelectorAll('.st-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.st-section').forEach(s => s.classList.remove('active'));

  if (btnEl) btnEl.classList.add('active');
  const sec = document.getElementById(`st-sec-${tabKey}`);
  if (sec) sec.classList.add('active');

  if (tabKey === 'users' && !settingsInited) {
    initSettingsView();
  }
}

// ── 1. Users & Roles Management ──
function renderUserTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  const roleBadges = {
    'Administrator': '<span class="badge b-sell">👑 Administrator</span>',
    'Staff': '<span class="badge b-in">👤 Staff / Cashier</span>'
  };

  tbody.innerHTML = USERS_LIST.map(u => `
    <tr>
      <td><span class="badge" style="background:var(--light);color:var(--text);font-family:monospace;font-weight:700">${u.userId || 'ADM001'}</span></td>
      <td>
        <div class="prd-cell">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=f4f4f4&color=555&size=48" class="user-av" style="width:32px;height:32px;border-radius:50%" />
          <div class="prd-name" style="font-weight:600">${u.name}</div>
        </div>
      </td>
      <td><span style="font-size:12.5px;color:var(--muted)">${u.email}</span></td>
      <td>${roleBadges[u.role] || `<span class="badge b-in">${u.role}</span>`}</td>
      <td class="text-c"><span class="badge b-in">🟢 ${u.status || 'Active'}</span></td>
      <td class="text-c">
        <button class="btn-act btn-act--edit" onclick="editUserEntry(${u.id})">✏️ แก้ไข</button>
        <button class="btn-act btn-act--del" onclick="deleteUserEntry(${u.id})">🗑️ ลบ</button>
      </td>
    </tr>
  `).join('');
}

function openUserModal(editItem = null) {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const idEl  = document.getElementById('m-user-id');

  if (editItem) {
    if (title) title.textContent = '✏️ แก้ไขข้อมูลผู้ใช้งาน';
    if (idEl)  idEl.value = editItem.id;
    if (document.getElementById('m-user-userid')) document.getElementById('m-user-userid').value = editItem.userId || '';
    if (document.getElementById('m-user-name')) document.getElementById('m-user-name').value = editItem.name || '';
    if (document.getElementById('m-user-email')) document.getElementById('m-user-email').value = editItem.email || '';
    if (document.getElementById('m-user-password')) document.getElementById('m-user-password').value = editItem.password || '';
    if (document.getElementById('m-user-role')) document.getElementById('m-user-role').value = editItem.role || 'Staff';
  } else {
    if (title) title.textContent = '➕ เพิ่มผู้ใช้งานใหม่';
    if (idEl)  idEl.value = '';
    ['m-user-userid','m-user-name','m-user-email','m-user-password'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.value = '';
    });
    if (document.getElementById('m-user-role')) document.getElementById('m-user-role').value = 'Staff';
  }
  modal?.classList.add('open');
}

function closeUserModal() { document.getElementById('userModal')?.classList.remove('open'); }
function closeUserModalBg(e) { if (e.target === document.getElementById('userModal')) closeUserModal(); }

function editUserEntry(id) {
  const u = USERS_LIST.find(x => x.id == id);
  if (u) openUserModal(u);
}

function deleteUserEntry(id) {
  const u = USERS_LIST.find(x => x.id == id);
  if (!u) return;

  if (confirm(`คุณต้องการลบผู้ใช้งาน "${u.name}" (ID: ${u.userId || u.id}) หรือไม่?`)) {
    USERS_LIST = USERS_LIST.filter(x => x.id != id);
    saveUsersToStorage();
    renderUserTable();
    showToast(`🗑️ ลบผู้ใช้งาน "${u.name}" เรียบร้อยแล้ว`);
  }
}

function saveUserEntry() {
  const editId   = document.getElementById('m-user-id')?.value;
  const userId   = document.getElementById('m-user-userid')?.value?.trim();
  const name     = document.getElementById('m-user-name')?.value?.trim();
  const email    = document.getElementById('m-user-email')?.value?.trim();
  const password = document.getElementById('m-user-password')?.value;
  const role     = document.getElementById('m-user-role')?.value;

  if (!userId || !name || !email) { 
    showToast('⚠️ กรุณากรอก ไอดีผู้ใช้, ชื่อผู้ใช้งาน และอีเมลให้ครบถ้วน'); 
    return; 
  }

  if (editId) {
    const u = USERS_LIST.find(x => x.id == editId);
    if (u) {
      u.userId = userId;
      u.name = name;
      u.email = email;
      if (password) u.password = password;
      u.role = role;
      saveUsersToStorage();
      showToast(`✓ อัปเดตข้อมูลผู้ใช้ "${name}" เรียบร้อยแล้ว`);
    }
  } else {
    const duplicate = USERS_LIST.find(x => x.userId?.toLowerCase() === userId.toLowerCase() || x.email?.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      showToast('⚠️ ไอดีผู้ใช้ หรือ อีเมลนี้มีอยู่ในระบบแล้ว');
      return;
    }
    USERS_LIST.push({
      id: Date.now(), userId, name, email, password: password || '123456', role, status: 'Active'
    });
    saveUsersToStorage();
    showToast(`🎉 เพิ่มผู้ใช้งานใหม่ "${name}" (สิทธิ์ ${role}) สำเร็จ!`);
  }

  closeUserModal();
  renderUserTable();
}

// ── 2. LINE Bot Handlers ──
function copyLineWebhook() {
  const input = document.getElementById('lineWebhook');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('📋 คัดลอก Webhook URL เรียบร้อยแล้ว');
  }
}

function saveLineConfig() {
  const token = document.getElementById('lineToken')?.value.trim();
  const secret = document.getElementById('lineSecret')?.value.trim();
  if (!token || !secret) {
    showToast('⚠️ กรุณากรอก LINE Token และ Secret');
    return;
  }
  showToast('💾 บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว');
}

function testLineNotify() {
  showToast('🔔 [LINE Notification Test] สต็อกสินค้าและระบบการแจ้งเตือนทำงานปกติ!');
}

// ── 3. Data Backup & Restore ──
function exportDataJSON() {
  const backupObj = {
    exportedAt: new Date().toISOString(),
    appName: 'Devtai Shop',
    stock: DB.stock,
    storage: DB.storage,
    users: USERS_LIST
  };
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `devtai-stock-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('💾 ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
}

function exportStockCSV() {
  if (!DB.stock.length) { showToast('⚠️ ไม่มีข้อมูลประวัติสต็อกสำหรับส่งออก'); return; }
  const headers = ['ID', 'Date', 'Time', 'Name', 'Variant', 'Warehouse', 'Type', 'Qty', 'User', 'Ref', 'Note'];
  const rows = DB.stock.map(r => [
    r.id, r.date, r.time, `"${r.name}"`, `"${r.variant}"`, `"${r.warehouse}"`, r.type, r.qty, `"${r.user}"`, r.ref, `"${r.note||''}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `devtai-stock-history-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📊 ส่งออกไฟล์ประวัติสต็อก CSV เรียบร้อยแล้ว');
}

function triggerImportFile() {
  document.getElementById('importFileInp')?.click();
}

function handleImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.stock && Array.isArray(data.stock)) DB.stock = data.stock;
      if (data.storage && Array.isArray(data.storage)) DB.storage = data.storage;
      if (data.users && Array.isArray(data.users)) USERS_LIST = data.users;

      refreshDashboardFromDB();
      if (stockInited) applyFilters();
      if (whInited) applyWHFilters();
      renderUserTable();

      showToast('🎉 คืนค่าข้อมูลจากไฟล์สำรอง (.JSON) สำเร็จ!');
    } catch(err) {
      showToast('⚠️ รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง');
    }
  };
  reader.readAsText(file);
}

function saveAutoBackupConfig() {
  const interval = document.getElementById('autoBackupInterval')?.value;
  showToast(`⏱️ ตั้งค่าการสำรองข้อมูลอัตโนมัติรอบ (${interval}) เรียบร้อยแล้ว`);
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTS & POS INTEGRATED DATABASE
// ═══════════════════════════════════════════════════════════
let PRODUCTS_LIST = [];

function openAddProductModal() {
  const titleEl = document.getElementById('prodModalTitle');
  if (titleEl) titleEl.textContent = '➕ เพิ่มสินค้าใหม่';

  const editIdEl = document.getElementById('prodEditId');
  if (editIdEl) editIdEl.value = '';

  const form = document.getElementById('productForm');
  if (form) form.reset();

  const nameEl = document.getElementById('prodImgFileName');
  if (nameEl) nameEl.textContent = '';

  previewProductImage('');
  openModal('productModal');
}

function openEditProductModal(id) {
  const p = PRODUCTS_LIST.find(x => x.id == id);
  if (!p) {
    showToast('⚠️ ไม่พบข้อมูลสินค้า');
    return;
  }

  const titleEl = document.getElementById('prodModalTitle');
  if (titleEl) titleEl.textContent = '✏️ แก้ไขข้อมูลสินค้า';

  const editIdEl = document.getElementById('prodEditId');
  if (editIdEl) editIdEl.value = p.id;

  const nameEl = document.getElementById('prodNameInp');
  if (nameEl) nameEl.value = p.name || '';

  const skuEl = document.getElementById('prodSkuInp');
  if (skuEl) skuEl.value = p.sku || `SKU-${p.id}`;

  const catEl = document.getElementById('prodCatInp');
  if (catEl) catEl.value = p.cat || 'ทั่วไป';

  const qtyEl = document.getElementById('prodQtyInp');
  if (qtyEl) qtyEl.value = p.qty || 0;

  const iconEl = document.getElementById('prodIconInp');
  if (iconEl) iconEl.value = p.icon || '📦';

  const posPriceEl = document.getElementById('prodPosPriceInp');
  if (posPriceEl) posPriceEl.value = p.posPrice || 0;

  const onlinePriceEl = document.getElementById('prodOnlinePriceInp');
  if (onlinePriceEl) onlinePriceEl.value = p.onlinePrice || 0;

  const discountEl = document.getElementById('prodDiscountInp');
  if (discountEl) discountEl.value = p.discount || 0;

  const imgInp = document.getElementById('prodImgInp');
  if (imgInp) {
    imgInp.value = p.image || '';
    previewProductImage(p.image || '');
  }

  openModal('productModal');
}

function deleteProduct(id) {
  const p = PRODUCTS_LIST.find(x => x.id == id);
  if (!p) {
    showToast('⚠️ ไม่พบข้อมูลสินค้าที่ต้องการลบ');
    return;
  }
  if (confirm(`คุณต้องการลบสินค้า "${p.name}" หรือไม่?`)) {
    PRODUCTS_LIST = PRODUCTS_LIST.filter(x => x.id != id);
    saveRealtimeStorage();
    applyProductFilters();
    if (posInited) renderPosProducts();
    refreshDashboardFromDB();
    showToast(`🗑️ ลบสินค้า "${p.name}" เรียบร้อยแล้ว`);
  }
}

// ═══════════════════════════════════════════════════════════
//  CATEGORY MANAGEMENT SYSTEM (เพิ่ม, แก้ไข ✏️, ลบ 🗑️ หมวดหมู่สินค้า)
// ═══════════════════════════════════════════════════════════
let PRODUCT_CATEGORIES = JSON.parse(localStorage.getItem('SMART_STOCK_CATEGORIES')) || [
  'เสื้อยืด', 'หมวก', 'เสื้อโปโล', 'ฮูดดี้', 'อาหาร', 'ทั่วไป'
];

function saveCategoriesStorage() {
  localStorage.setItem('SMART_STOCK_CATEGORIES', JSON.stringify(PRODUCT_CATEGORIES));
  renderCategoryDropdowns();
}

function renderCategoryDropdowns() {
  const filterSel = document.getElementById('prodCatFilter');
  if (filterSel) {
    const currentVal = filterSel.value;
    filterSel.innerHTML = `<option value="">ทุกหมวดหมู่สินค้า</option>` +
      PRODUCT_CATEGORIES.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>📦 ${c}</option>`).join('');
  }

  const formSel = document.getElementById('prodCatInp');
  if (formSel) {
    const currentFormVal = formSel.value;
    formSel.innerHTML = PRODUCT_CATEGORIES.map(c => `<option value="${c}" ${c === currentFormVal ? 'selected' : ''}>📦 ${c}</option>`).join('');
  }

  const posPills = document.getElementById('posCatPills');
  if (posPills) {
    posPills.innerHTML = `<button class="pos-pill active" onclick="filterPosCat('all', this)">ทั้งหมด</button>` +
      PRODUCT_CATEGORIES.map(c => `<button class="pos-pill" onclick="filterPosCat('${c}', this)">${c}</button>`).join('');
  }
}

function openCategoryManagerModal() {
  renderCategoryListUI();
  openModal('categoryModal');
}

function renderCategoryListUI() {
  const container = document.getElementById('categoryListContainer');
  if (!container) return;

  container.innerHTML = PRODUCT_CATEGORIES.map((cat) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--light);border-radius:10px;border:1px solid var(--border)">
      <span style="font-size:13.5px;font-weight:600;color:var(--text)">📦 ${cat}</span>
      <div style="display:flex;gap:6px">
        <button class="btn-act btn-act--edit" onclick="editCategoryName('${cat}')">✏️ แก้ไข</button>
        ${cat !== 'ทั่วไป' ? `<button class="btn-act btn-act--del" onclick="deleteCategory('${cat}')">🗑️ ลบ</button>` : ''}
      </div>
    </div>
  `).join('');
}

function addNewCategorySubmit() {
  const inp = document.getElementById('newCatNameInp');
  const catName = inp ? inp.value.trim() : '';

  if (!catName) {
    showToast('⚠️ กรุณาระบุชื่อหมวดหมู่สินค้า');
    return;
  }

  if (PRODUCT_CATEGORIES.includes(catName)) {
    showToast('⚠️ หมวดหมู่นี้มีอยู่ในระบบแล้ว');
    return;
  }

  PRODUCT_CATEGORIES.push(catName);
  saveCategoriesStorage();
  renderCategoryListUI();
  if (inp) inp.value = '';
  showToast(`🎉 เพิ่มหมวดหมู่สินค้า "${catName}" เรียบร้อยแล้ว`);
}

function editCategoryName(oldName) {
  const newName = prompt(`แก้ไขชื่อหมวดหมู่ "${oldName}" เป็น:`, oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;

  const trimmed = newName.trim();
  const idx = PRODUCT_CATEGORIES.indexOf(oldName);
  if (idx !== -1) {
    PRODUCT_CATEGORIES[idx] = trimmed;
    PRODUCTS_LIST.forEach(p => {
      if (p.cat === oldName) p.cat = trimmed;
    });
    saveCategoriesStorage();
    renderCategoryListUI();
    applyProductFilters();
    if (posInited) renderPosProducts();
    saveRealtimeStorage();
    showToast(`✏️ อัปเดตชื่อหมวดหมู่เป็น "${trimmed}" เรียบร้อยแล้ว`);
  }
}

function deleteCategory(catName) {
  if (catName === 'ทั่วไป') {
    showToast('⚠️ ไม่สามารถลบหมวดหมู่หลัก "ทั่วไป" ได้');
    return;
  }

  if (confirm(`คุณต้องการลบหมวดหมู่ "${catName}" หรือไม่?\n(สินค้าในหมวดหมู่นี้จะถูกย้ายไปหมวดหมู่ "ทั่วไป")`)) {
    PRODUCT_CATEGORIES = PRODUCT_CATEGORIES.filter(c => c !== catName);
    PRODUCTS_LIST.forEach(p => {
      if (p.cat === catName) p.cat = 'ทั่วไป';
    });
    saveCategoriesStorage();
    renderCategoryListUI();
    applyProductFilters();
    if (posInited) renderPosProducts();
    saveRealtimeStorage();
    showToast(`🗑️ ลบหมวดหมู่ "${catName}" เรียบร้อยแล้ว`);
  }
}

let productsInited = false;

function initProductsView() {
  productsInited = true;
  renderCategoryDropdowns();
  applyProductFilters();
}

function renderProductStats() {
  const categories = new Set(PRODUCTS_LIST.map(p => p.cat));
  const totalQty = PRODUCTS_LIST.reduce((sum, p) => sum + (p.qty || 0), 0);

  const whEl = document.getElementById('prodKpiWh');
  const catEl = document.getElementById('prodKpiCat');
  const qtyEl = document.getElementById('prodKpiQty');
  const countEl = document.getElementById('prodKpiCount');

  if (whEl) whEl.textContent = '1';
  if (catEl) catEl.textContent = categories.size.toLocaleString();
  if (qtyEl) qtyEl.textContent = totalQty.toLocaleString();
  if (countEl) countEl.textContent = PRODUCTS_LIST.length.toLocaleString();
}

function applyProductFilters() {
  const q = document.getElementById('prodSrchInp')?.value.toLowerCase().trim() || '';
  const catF = document.getElementById('prodCatFilter')?.value || '';

  const filtered = PRODUCTS_LIST.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    const matchCat = !catF || p.cat === catF;
    return matchQ && matchCat;
  });

  renderProductStats();
  renderProductsTable(filtered);
}

function renderProductsTable(dataList) {
  const tbody = document.getElementById('productsTableBody');
  const countEl = document.getElementById('prodTableCount');
  if (countEl) countEl.textContent = `แสดง ${dataList.length} รายการสินค้า`;
  if (!tbody) return;

  if (!dataList.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-c" style="padding:30px 0;color:var(--muted)">ไม่พบรายการสินค้า</td></tr>`;
    return;
  }

  tbody.innerHTML = dataList.map(p => {
    const netPosPrice = Math.max(0, p.posPrice - (p.discount || 0));
    const isOut = p.qty <= 0;

    return `
      <tr>
        <td class="text-c">
          ${p.image ? `<img src="${p.image}" style="width:38px;height:38px;object-fit:cover;border-radius:6px;border:1px solid var(--border)" />` : `<div style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:var(--light);border-radius:6px;font-size:18px">${p.icon || '📦'}</div>`}
        </td>
        <td>
          <div>
            <strong style="font-size:13.5px;display:block">${p.name}</strong>
            <span class="badge b-in" style="font-size:10px;padding:1px 6px">${p.cat}</span>
          </div>
        </td>
        <td class="text-c">
          <span class="badge ${isOut ? 'b-out' : 'b-in'}" style="font-weight:700">
            ${isOut ? 'หมดคลัง' : `${p.qty} ชิ้น`}
          </span>
        </td>
        <td class="text-r"><strong style="color:var(--text)">฿${p.posPrice.toFixed(2)}</strong></td>
        <td class="text-r"><span style="color:var(--muted)">฿${p.onlinePrice ? p.onlinePrice.toFixed(2) : '-'}</span></td>
        <td class="text-r"><span style="color:var(--red);font-weight:600">${p.discount > 0 ? `-฿${p.discount.toFixed(2)}` : '-'}</span></td>
        <td class="text-r"><strong style="color:#6c5ce7;font-size:14px">฿${netPosPrice.toFixed(2)}</strong></td>
        <td class="text-c">
          <div style="display:flex;gap:6px;justify-content:center">
            <button class="btn-act btn-act--edit" onclick="openEditProductModal(${p.id})">✏️ แก้ไข</button>
            <button class="btn-act btn-act--del" onclick="deleteProduct(${p.id})">🗑️ ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function previewProductImage(url) {
  const img = document.getElementById('prodImgPreview');
  if (!img) return;
  if (url && url.trim()) {
    img.src = url.trim();
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
}

function handleProductImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileNameEl = document.getElementById('prodImgFileName');
  if (fileNameEl) fileNameEl.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    const imgInp = document.getElementById('prodImgInp');
    if (imgInp) imgInp.value = dataUrl;
    previewProductImage(dataUrl);
    showToast(`🖼️ อัปโหลดรูปภาพ "${file.name}" เรียบร้อยแล้ว`);
  };
  reader.readAsDataURL(file);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('open');
    m.classList.add('active');
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('open');
    m.classList.remove('active');
  }
}

function openAddProductModal() {
  document.getElementById('prodModalTitle').textContent = '➕ เพิ่มสินค้าใหม่';
  document.getElementById('prodEditId').value = '';
  document.getElementById('productForm').reset();
  const nameEl = document.getElementById('prodImgFileName');
  if (nameEl) nameEl.textContent = '';
  previewProductImage('');
  openModal('productModal');
}

function openEditProductModal(id) {
  const p = PRODUCTS_LIST.find(x => x.id === id);
  if (!p) return;

  document.getElementById('prodModalTitle').textContent = '✏️ แก้ไขข้อมูลสินค้า';
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodNameInp').value = p.name;
  if (document.getElementById('prodSkuInp')) document.getElementById('prodSkuInp').value = p.sku || '';
  document.getElementById('prodCatInp').value = p.cat;
  document.getElementById('prodQtyInp').value = p.qty;
  document.getElementById('prodIconInp').value = p.icon || '📦';
  document.getElementById('prodPosPriceInp').value = p.posPrice;
  document.getElementById('prodOnlinePriceInp').value = p.onlinePrice || 0;
  document.getElementById('prodDiscountInp').value = p.discount || 0;

  const imgInp = document.getElementById('prodImgInp');
  if (imgInp) {
    imgInp.value = p.image || '';
    previewProductImage(p.image || '');
  }

  openModal('productModal');
}

function saveProductSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodNameInp').value.trim();
  const sku = document.getElementById('prodSkuInp')?.value.trim() || `SKU-${Date.now().toString().slice(-4)}`;
  const cat = document.getElementById('prodCatInp').value;
  const qty = parseInt(document.getElementById('prodQtyInp').value) || 0;
  const icon = document.getElementById('prodIconInp').value.trim() || '📦';
  const image = document.getElementById('prodImgInp')?.value.trim() || '';
  const posPrice = parseFloat(document.getElementById('prodPosPriceInp').value) || 0;
  const onlinePrice = parseFloat(document.getElementById('prodOnlinePriceInp').value) || 0;
  const discount = parseFloat(document.getElementById('prodDiscountInp').value) || 0;

  if (editId) {
    const p = PRODUCTS_LIST.find(x => x.id == editId);
    if (p) {
      const oldQty = p.qty || 0;
      const diff = qty - oldQty;
      p.name = name;
      p.sku = sku;
      p.cat = cat;
      p.qty = qty;
      p.icon = icon;
      p.image = image;
      p.posPrice = posPrice;
      p.onlinePrice = onlinePrice;
      p.discount = discount;

      if (diff !== 0) {
        DB.stock.unshift({
          id: Date.now(),
          date: new Date().toISOString().slice(0,10),
          time: new Date().toTimeString().slice(0,5),
          name: name,
          variant: sku,
          warehouse: 'Bangkok Main Warehouse',
          wcode: 'WH-BKK',
          type: diff > 0 ? 'รับเข้า' : 'ปรับยอด',
          qty: diff,
          user: (typeof fbService !== 'undefined' && fbService.currentUser?.displayName) ? fbService.currentUser.displayName : 'ผู้ดูแลระบบ (Admin)',
          ref: `ADJ-${Date.now().toString().slice(-6)}`,
          note: 'ปรับเปลี่ยนจำนวนสต็อกผ่านหน้ารายการสินค้า',
          color: diff > 0 ? '#5cc8a0' : '#f9d56e'
        });
      }
      showToast(`✏️ อัปเดตสินค้า "${name}" เรียบร้อยแล้ว`);
    }
  } else {
    const newId = Date.now();
    PRODUCTS_LIST.unshift({
      id: newId,
      sku,
      name, cat, qty, icon, image, posPrice, onlinePrice, discount
    });

    DB.stock.unshift({
      id: Date.now(),
      date: new Date().toISOString().slice(0,10),
      time: new Date().toTimeString().slice(0,5),
      name: name,
      variant: sku,
      warehouse: 'Bangkok Main Warehouse',
      wcode: 'WH-BKK',
      type: 'รับเข้า',
      qty: qty,
      user: (typeof fbService !== 'undefined' && fbService.currentUser?.displayName) ? fbService.currentUser.displayName : 'ผู้ดูแลระบบ (Admin)',
      ref: `PRD-${Date.now().toString().slice(-6)}`,
      note: 'ลงทะเบียนสินค้าใหม่ในระบบ',
      color: '#5cc8a0'
    });

    showToast(`🎉 เพิ่มสินค้าใหม่ "${name}" เรียบร้อยแล้ว`);
  }

  closeModal('productModal');
  applyProductFilters();
  if (stockInited) applyFilters();
  if (whInited) applyWHFilters();
  if (posInited) renderPosProducts();
  refreshDashboardFromDB();
  saveRealtimeStorage();
}

function deleteProduct(id) {
  const p = PRODUCTS_LIST.find(x => x.id === id);
  if (!p) return;
  if (confirm(`คุณต้องการลบสินค้า "${p.name}" หรือไม่?`)) {
    PRODUCTS_LIST = PRODUCTS_LIST.filter(x => x.id !== id);
    applyProductFilters();
    if (posInited) renderPosProducts();
    refreshDashboardFromDB();
    saveRealtimeStorage();
    showToast(`🗑️ ลบสินค้า "${p.name}" เรียบร้อยแล้ว`);
  }
}

// ── 4. Auto-Updater Engine (Option 3) ──
async function checkForAppUpdates() {
  const statusEl = document.getElementById('updateCheckStatus');
  const resultBox = document.getElementById('updateResultBox');
  const urlInp = document.getElementById('updateServerUrlInp');
  const customUrl = urlInp ? urlInp.value.trim() : '';

  if (statusEl) statusEl.textContent = '⏳ กำลังเชื่อมต่อเซิร์ฟเวอร์เพื่อเช็กเวอร์ชันใหม่...';
  if (resultBox) resultBox.style.display = 'none';

  if (window.require) {
    try {
      const { ipcRenderer } = window.require('electron');
      const res = await ipcRenderer.invoke('check-for-updates', customUrl);
      
      if (res.success) {
        if (res.hasUpdate) {
          if (statusEl) statusEl.textContent = '✅ ตรวจสอบสำเร็จ! พบเวอร์ชันใหม่ล่าสุด';
          if (resultBox) resultBox.style.display = 'block';
          
          const newBadge = document.getElementById('newVersionBadge');
          const notesTxt = document.getElementById('releaseNotesTxt');
          if (newBadge) newBadge.textContent = `v${res.latestVersion}`;
          if (notesTxt) notesTxt.textContent = res.releaseNotes;
          
          showToast(`🎉 พบซอฟต์แวร์เวอร์ชันใหม่ v${res.latestVersion}!`);
        } else {
          if (statusEl) statusEl.textContent = '✅ ซอฟต์แวร์ของคุณเป็นเวอร์ชันปัจจุบันล่าสุดแล้ว';
          showToast('✅ ซอฟต์แวร์ของคุณเป็นเวอร์ชันล่าสุดแล้ว (v1.0.0)');
        }
      } else {
        if (statusEl) statusEl.textContent = `⚠️ ${res.message}`;
        showToast(`⚠️ ${res.message}`);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = '✅ จำลองการเชื่อมต่อ: ระบบเวอร์ชันล่าสุด v1.0.0';
      showToast('✅ ซอฟต์แวร์ของคุณเป็นเวอร์ชันล่าสุดแล้ว');
    }
  } else {
    setTimeout(() => {
      if (statusEl) statusEl.textContent = '✅ ตรวจสอบสำเร็จ! ซอฟต์แวร์เป็นเวอร์ชันล่าสุด (v1.0.0)';
      showToast('🚀 ระบบ Auto-Updater พร้อมใช้งานเมื่อรันในแอป Desktop');
    }, 600);
  }
}

function triggerAppUpdateDownload() {
  showToast('📥 กำลังดาวน์โหลดไฟล์อัปเดตใหม่... ระบบจะทำการติดตั้งและรีสตาร์ทให้อัตโนมัติ');
}
// ═══════════════════════════════════════════════════════════
let posInited = false;
let posActiveCat = 'all';
let posCart = [];
let posPayMethod = 'cash';

const POS_PRODUCTS = [];

function initPosView() {
  posInited = true;
  renderPosProducts();
  renderPosCart();
}

function filterPosCat(cat, btnEl) {
  posActiveCat = cat;
  document.querySelectorAll('#posCatPills .pos-pill').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderPosProducts();
}

let numpadMode = 'qty'; // qty | disc | price

function setNumpadMode(mode) {
  numpadMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  if (mode === 'qty') document.getElementById('npModeQty')?.classList.add('active');
  if (mode === 'disc') document.getElementById('npModeDisc')?.classList.add('active');
  if (mode === 'price') document.getElementById('npModePrice')?.classList.add('active');
  showToast(`🔢 สลับโหมดปุ่มกดเป็น: ${mode.toUpperCase()}`);
}

function posNumInput(key) {
  if (!posCart.length) return;
  const activeItem = posCart[0]; // operate on active cart item
  if (key === 'back') {
    activeItem.qty = Math.max(0, activeItem.qty - 1);
    if (activeItem.qty === 0) posCart.shift();
  } else if (key === '+/-') {
    activeItem.qty = -activeItem.qty;
  } else if (!isNaN(key)) {
    if (numpadMode === 'qty') {
      activeItem.qty = parseInt(key) || 1;
    } else if (numpadMode === 'disc') {
      activeItem.discount = parseInt(key) || 0;
    } else if (numpadMode === 'price') {
      activeItem.price = parseFloat(key) * 100 || activeItem.price;
    }
  }
  renderPosCart();
}

function posAction(action) {
  const titles = {
    refund: '🔄 คืนเงิน / Refund',
    customer: '👤 เลือกชื่อลูกค้า (Customer)',
    note: '📝 บันทึกโน้ตลูกค้า (Customer Note)',
    internal_note: '🏷️ บันทึกโน้ตภายใน (Internal Note)',
    bill: '🖨️ พิมพ์ใบเสร็จเบื้องต้น (Print Bill)',
    split: '✂️ แยกบิล (Split Bill)',
    guests: '👥 จำนวนผู้รับบริการ (Guests)',
    transfer: '➡️ โอนย้ายรายการ (Transfer)',
    code: '🔢 กรอกรหัสส่วนลด (Enter Code)',
    reward: '⭐ ใช้แต้มสะสม (Reward)',
    order: '📑 ออกใบเสนอราคา / ใบสั่งซื้อ (Quotation)'
  };
  showToast(titles[action] || `กดปุ่ม ${action}`);
}

function handleBarcodeEnter(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const code = e.target.value.toLowerCase().trim();
    if (!code) return;

    const p = PRODUCTS_LIST.find(x => x.sku.toLowerCase() === code || x.name.toLowerCase().includes(code));
    if (p) {
      addToPosCart(p.id);
      e.target.value = '';
    } else {
      showToast(`⚠️ ไม่พบสินค้าที่มีบาร์โค้ด / SKU: "${code}"`);
    }
  }
}

function applyQuickCash(val) {
  const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const inp = document.getElementById('posCashReceived');
  if (!inp) return;

  if (val === 'exact') {
    inp.value = subtotal;
  } else {
    inp.value = val;
  }
  updatePosTotals();
  showToast(`💵 กำหนดเงินรับมา: ฿${inp.value}`);
}

function updatePosCartItemQty(prodId, delta) {
  const item = posCart.find(x => x.id === prodId);
  if (!item) return;
  const p = PRODUCTS_LIST.find(x => x.id === prodId);
  if (delta > 0 && p && item.qty + delta > p.qty) {
    showToast(`⚠️ สินค้า "${item.name}" เหลือในคลังเพียง ${p.qty} ชิ้น`);
    return;
  }
  item.qty += delta;
  if (item.qty <= 0) {
    posCart = posCart.filter(x => x.id !== prodId);
  }
  renderPosCart();
}

function removePosCartItem(prodId) {
  posCart = posCart.filter(x => x.id !== prodId);
  renderPosCart();
}

function clearPosCart() {
  if (!posCart.length) return;
  posCart = [];
  renderPosCart();
  showToast('🗑️ ล้างรายการสินค้าเรียบร้อยแล้ว');
}

function setPosPayMethod(method, el) {
  posPayMethod = method;
  const cashWrap = document.getElementById('entCashInpWrap');
  if (cashWrap) {
    cashWrap.style.display = (method === 'cash') ? 'block' : 'none';
  }
}

function renderPosProducts() {
  const grid = document.getElementById('posProductGrid');
  if (!grid) return;

  const products = (posActiveCat && posActiveCat !== 'all')
    ? PRODUCTS_LIST.filter(p => p.cat === posActiveCat)
    : PRODUCTS_LIST;

  if (!products.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--muted);background:var(--surface);border-radius:16px;border:1px dashed var(--border)">
        <div style="font-size:36px;margin-bottom:8px">📦</div>
        <h4 style="margin:0 0 6px;color:var(--text)">ยังไม่มีรายการสินค้า</h4>
        <span style="font-size:12.5px;color:var(--muted)">ไปที่หน้า "รายการสินค้า" แล้วกด "+ เพิ่มสินค้าใหม่" เพื่อสร้างรายการสินค้าของคุณเอง</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => {
    const imgContent = p.image 
      ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:6px" alt="${p.name}" />`
      : (p.icon || '📦');

    return `
      <div class="ent-card" onclick="addToPosCart(${p.id})">
        <div class="ent-card-actions">
          <button class="pos-card-btn pos-card-btn--edit" onclick="event.stopPropagation(); openEditProductModal(${p.id})" title="แก้ไขสินค้า">✏️</button>
          <button class="pos-card-btn pos-card-btn--del" onclick="event.stopPropagation(); deleteProduct(${p.id})" title="ลบสินค้า">🗑️</button>
        </div>
        <div class="ent-card-img-box">${imgContent}</div>
        <div class="ent-card-title">${p.name}</div>
        <div class="ent-card-foot">
          <span class="ent-card-price">${(p.posPrice || 0).toLocaleString()}</span>
          <span class="ent-card-stock">สต็อก: ${p.qty}</span>
        </div>
      </div>
    `;
  }).join('');
}

function addToPosCart(prodId) {
  const p = PRODUCTS_LIST.find(x => x.id === prodId);
  if (!p) return;

  if (p.qty <= 0) {
    showToast(`⚠️ สินค้า "${p.name}" หมดคลัง ไม่สามารถจำหน่ายได้`);
    return;
  }

  const netPrice = Math.max(0, p.posPrice - (p.discount || 0));

  const exist = posCart.find(x => x.id === prodId);
  if (exist) {
    if (exist.qty + 1 > p.qty) {
      showToast(`⚠️ สินค้า "${p.name}" เหลือในคลังเพียง ${p.qty} ชิ้น`);
      return;
    }
    exist.qty += 1;
  } else {
    posCart.push({ id: p.id, sku: p.sku || `SKU-${p.id}`, name: p.name, price: netPrice, qty: 1, icon: p.icon || '📦' });
  }

  renderPosCart();
  showToast(`🛒 เพิ่ม "${p.name}" (${netPrice.toLocaleString()}) ลงในรายการสั่งซื้อแล้ว`);
}

function renderPosCart() {
  const container = document.getElementById('posCartItems');
  if (!container) return;

  if (!posCart.length) {
    container.innerHTML = `
      <div style="text-align:center;color:#94a3b8;font-size:13px;flex:1;display:flex;align-items:center;justify-content:center;min-height:260px">
        ไม่มีสินค้าในตะกร้าชั่วคราว
      </div>
    `;
    updatePosTotals();
    return;
  }

  container.innerHTML = posCart.map(item => `
    <div class="ent-cart-item">
      <div class="ent-item-info">
        <div class="ent-item-title">${item.name}</div>
        <div class="ent-item-sub">${item.sku || ''} ${item.price.toLocaleString()} x ${item.qty}</div>
      </div>
      <div class="ent-qty-ctrl">
        <button class="ent-qty-btn" onclick="updatePosCartItemQty(${item.id}, -1)">-</button>
        <span class="ent-qty-num">${item.qty}</span>
        <button class="ent-qty-btn" onclick="updatePosCartItemQty(${item.id}, 1)">+</button>
      </div>
      <div class="ent-item-price">${(item.price * item.qty).toLocaleString()}</div>
    </div>
  `).join('');

  updatePosTotals();
}

function updatePosTotals() {
  const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const vat = subtotal * (7 / 107);
  const preVat = subtotal - vat;

  const subEl = document.getElementById('posSubtotalDisplay');
  const vatEl = document.getElementById('posVatDisplay');
  const preVatEl = document.getElementById('posPreVatDisplay');
  const grandEl = document.getElementById('posGrandTotalDisplay');

  const fmt = (num) => '฿' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (subEl) subEl.textContent = fmt(subtotal);
  if (vatEl) vatEl.textContent = fmt(vat);
  if (preVatEl) preVatEl.textContent = fmt(preVat);
  if (grandEl) grandEl.textContent = fmt(subtotal);
}

function checkoutPosOrder() {
  if (!posCart.length) {
    showToast('⚠️ กรุณาเลือกรายการสินค้าลงในตะกร้าก่อนชำระเงิน');
    return;
  }

  const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discount = parseFloat(document.getElementById('posDiscountInp')?.value || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const cashRecv = parseFloat(document.getElementById('posCashReceived')?.value || 0);

  if (posPayMethod === 'cash' && cashRecv < grandTotal) {
    showToast('⚠️ เงินสดที่รับมาไม่เพียงพอกับยอดชำระสุทธิ');
    return;
  }

  const rcpNum = `POS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random()*900)}`;
  const nowStr = `${new Date().toISOString().slice(0,10)} ${new Date().toTimeString().slice(0,5)}`;

  // Deduct stock in PRODUCTS_LIST & DB.storage & add DB.stock movement
  posCart.forEach(item => {
    let p = PRODUCTS_LIST.find(x => x.id === item.id);
    if (p) {
      p.qty = Math.max(0, p.qty - item.qty);
    }
    let st = DB.storage.find(s => s.product.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(s.product.toLowerCase()));
    if (st) {
      st.qty = Math.max(0, st.qty - item.qty);
    }
    DB.stock.unshift({
      id: DB.stock.length + 1,
      date: new Date().toISOString().slice(0,10),
      time: new Date().toTimeString().slice(0,5),
      name: item.name,
      variant: item.sku || 'POS-SKU',
      warehouse: 'Bangkok Main Warehouse',
      wcode: 'WH-BKK',
      type: 'ขายสินค้า',
      qty: -item.qty,
      user: 'ผู้ดูแลระบบ (Admin)',
      ref: rcpNum,
      note: 'การขายหน้าร้าน POS Store Register',
      color: '#3a3a3a'
    });
  });

  refreshDashboardFromDB();
  if (productsInited) applyProductFilters();
  if (whInited) applyWHFilters();
  if (stockInited) applyFilters();
  renderPosProducts();
  saveRealtimeStorage();

  // Populate Printable Receipt Modal
  document.getElementById('rcpNum').textContent = rcpNum;
  document.getElementById('rcpDate').textContent = nowStr;
  document.getElementById('rcpSubtotal').textContent = `฿${subtotal.toLocaleString()}`;
  document.getElementById('rcpDiscount').textContent = `฿${discount.toLocaleString()}`;
  document.getElementById('rcpGrandTotal').textContent = `฿${grandTotal.toLocaleString()}`;

  const payNames = { cash: 'เงินสด (Cash)', qr: 'สแกน QR PromptPay', card: 'บัตรเครดิต/เดบิต' };
  document.getElementById('rcpPayMethod').textContent = payNames[posPayMethod] || 'เงินสด';

  const rcpCashRow = document.getElementById('rcpCashRow');
  const rcpChangeRow = document.getElementById('rcpChangeRow');
  if (posPayMethod === 'cash') {
    if (rcpCashRow) rcpCashRow.style.display = 'flex';
    if (rcpChangeRow) rcpChangeRow.style.display = 'flex';
    document.getElementById('rcpReceived').textContent = `฿${cashRecv.toLocaleString()}`;
    document.getElementById('rcpChange').textContent = `฿${Math.max(0, cashRecv - grandTotal).toLocaleString()}`;
  } else {
    if (rcpCashRow) rcpCashRow.style.display = 'none';
    if (rcpChangeRow) rcpChangeRow.style.display = 'none';
  }

  const itemsContainer = document.getElementById('rcpItemsList');
  if (itemsContainer) {
    itemsContainer.innerHTML = posCart.map(i => `
      <div class="rcp-item-row">
        <span>${i.name} x${i.qty}</span>
        <span>฿${(i.price * i.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }

  // Open Receipt Modal
  document.getElementById('posReceiptModal')?.classList.add('open');
  showToast(`🎉 ชำระเงินสำเร็จ! ออกใบเสร็จเลขที่ ${rcpNum} และตัดสต็อกเรียบร้อยแล้ว`);

  // Clear cart
  posCart = [];
  document.getElementById('posDiscountInp').value = 0;
  document.getElementById('posCashReceived').value = '';
  renderPosCart();
}

function closePosReceiptModal() { document.getElementById('posReceiptModal')?.classList.remove('open'); }
function closePosReceiptModalBg(e) { if (e.target === document.getElementById('posReceiptModal')) closePosReceiptModal(); }

function printPosReceipt() {
  window.print();
  showToast('🖨️ สั่งพิมพ์ใบเสร็จรับเงิน POS เรียบร้อยแล้ว');
}

// ═══════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  setupTheme();
  loadMenuNames();
  captureSampleData();
  loadRealtimeStorage();
  checkSavedAuth();
  applyUserRolePermissions(false);
  initDashboard();
  applyPeriodKPI('today');
  initFirebaseRealtime();
});
