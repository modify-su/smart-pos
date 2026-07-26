/* ============================================================
   simple.js — Devtai Shop Dashboard (Minimal)
   ============================================================ */

/* ── Palette (matches CSS vars) ── */
const C = ['#e8637a','#f4a259','#f9d56e','#5cc8a0','#4a90d9'];

/* ── Category data ── */
const CATS = [
  { name:'เสื้อยืด',   pct:42, rev:131250 },
  { name:'หมวก',      pct:24, rev: 75000 },
  { name:'เสื้อโปโล', pct:18, rev: 56250 },
  { name:'ฮูดดี้',    pct:10, rev: 31250 },
  { name:'อื่นๆ',     pct: 6, rev: 18750 },
];

/* ── Period datasets ── */
const PERIODS = {
  today: {
    kv: { rev:'฿48,250', ord:'134',     pro:'286 SKU', cus:'28'       },
    kd: { rev:'↑ 12.4% จากเมื่อวาน', ord:'↑ 8.1% จากเมื่อวาน', pro:'2 คลังสินค้า', cus:'↑ 5.3% จากเมื่อวาน' },
    dc: { rev:true, ord:true, pro:null, cus:true },
    donutTotal: '฿312k',
    labels: ['08:00','10:00','12:00','14:00','16:00','18:00'],
    rev:    [4200,8500,12300,9800,15600,11200],
    orders: [12,24,36,28,45,32],
  },
  week: {
    kv: { rev:'฿312,500', ord:'842',    pro:'286 SKU', cus:'186'      },
    kd: { rev:'↑ 12.4% จากสัปดาห์ก่อน', ord:'↑ 10.8% จากสัปดาห์ก่อน', pro:'2 คลังสินค้า', cus:'↑ 5.3%' },
    dc: { rev:true, ord:true, pro:null, cus:true },
    donutTotal: '฿1.87M',
    labels: ['จ','อ','พ','พฤ','ศ','ส','อา'],
    rev:    [38000,52000,44000,67000,58000,72000,48250],
    orders: [110,148,128,195,170,210,134],
  },
  month: {
    kv: { rev:'฿1.24M', ord:'3,240',  pro:'286 SKU', cus:'724'       },
    kd: { rev:'↑ 13.0% จากเดือนก่อน', ord:'↑ 8.7% จากเดือนก่อน', pro:'2 คลังสินค้า', cus:'↑ 5.3%' },
    dc: { rev:true, ord:true, pro:null, cus:true },
    donutTotal: '฿7.46M',
    labels: ['ส1','ส2','ส3','ส4'],
    rev:    [280000,340000,310000,310000],
    orders: [780,940,860,660],
  },
};

/* ── Chart instances ── */
let donutChart = null;
let lineChart  = null;

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  setupTheme();
  initDonut();
  initLine('today');
  renderProducts();
  renderOrders();
  applyKPI('today');
});

/* ── KPI ── */
function applyKPI(period) {
  const p = PERIODS[period];
  const ids = ['rev','ord','pro','cus'];
  const labels = ['kv-rev','kv-ord','kv-pro','kv-cus'];
  const dlabels = ['kd-rev','kd-ord','kd-pro','kd-cus'];
  ids.forEach((k,i) => {
    const vel = document.getElementById(labels[i]);
    const del = document.getElementById(dlabels[i]);
    if (vel) { vel.style.opacity='.3'; setTimeout(()=>{ vel.textContent=p.kv[k]; vel.style.opacity='1'; vel.style.transition='opacity .3s'; },120*i); }
    if (del) {
      del.textContent = p.kd[k];
      del.className   = 'kpi-delta ' + (p.dc[k]===true?'up': p.dc[k]===false?'down':'neutral');
    }
  });
}

/* ── Period switch ── */
function switchPeriod(period, btn) {
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyKPI(period);
  updateLine(period);
  // update donut total label
  document.getElementById('donutTotal').textContent = PERIODS[period].donutTotal;
}

/* ── Donut ── */
function initDonut() {
  const ctx = document.getElementById('donutChart');
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CATS.map(c=>c.name),
      datasets: [{
        data: CATS.map(c=>c.pct),
        backgroundColor: C,
        borderWidth: 3,
        borderColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--surface').trim() || '#fff',
        hoverOffset: 6,
        hoverBorderWidth: 4,
      }]
    },
    options: {
      responsive: false,
      cutout: '65%',
      plugins: {
        legend: { display:false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}%`,
          }
        }
      },
      animation: { animateRotate:true, duration:900 },
    }
  });

  /* Legend */
  const leg = document.getElementById('donutLegend');
  leg.innerHTML = CATS.map((c,i)=>`
    <div class="dl-item">
      <div class="dl-left">
        <span class="dl-dot" style="background:${C[i]}"></span>
        <span class="dl-name">${c.name}</span>
      </div>
      <span class="dl-pct">${c.pct}%</span>
    </div>`).join('');
}

/* ── Line ── */
function getGridColor() {
  return document.documentElement.hasAttribute('data-dark')
    ? 'rgba(255,255,255,.06)'
    : 'rgba(0,0,0,.05)';
}
function getTickColor() {
  return document.documentElement.hasAttribute('data-dark') ? '#555' : '#bbb';
}

function initLine(period) {
  const ctx = document.getElementById('lineChart');
  const p   = PERIODS[period];

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: p.labels,
      datasets: [
        {
          label: 'ยอดขาย',
          data: p.rev,
          borderColor: C[4],
          backgroundColor: hexA(C[4], .06),
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: C[4],
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          yAxisID: 'y',
        },
        {
          label: 'ออเดอร์',
          data: p.orders,
          borderColor: C[1],
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: C[1],
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          borderDash: [4,3],
          yAxisID: 'y2',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display:false },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#1c1c1c',
          bodyColor: '#8a8a8a',
          borderColor: '#ebebeb',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: ctx => ctx.datasetIndex===0
              ? ` ยอดขาย: ฿${ctx.parsed.y.toLocaleString()}`
              : ` ออเดอร์: ${ctx.parsed.y}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: getGridColor() },
          ticks: { color: getTickColor(), font:{ family:'Inter', size:11 } },
          border: { display:false },
        },
        y: {
          position: 'left',
          grid: { color: getGridColor() },
          ticks: {
            color: getTickColor(),
            font: { family:'Inter', size:11 },
            callback: v => v>=1000 ? `฿${(v/1000).toFixed(0)}k` : `฿${v}`,
          },
          border: { display:false },
        },
        y2: {
          position: 'right',
          grid: { display:false },
          ticks: { color: C[1], font:{ family:'Inter', size:11 } },
          border: { display:false },
        }
      }
    }
  });
}

function updateLine(period) {
  if (!lineChart) return;
  const p = PERIODS[period];
  lineChart.data.labels = p.labels;
  lineChart.data.datasets[0].data = p.rev;
  lineChart.data.datasets[1].data = p.orders;
  lineChart.update('active');
}

/* ── Products ── */
const PRODUCTS = [
  { rank:'1', name:'Center Logo T-Shirt', sold:324, rev:'฿259,200', pct:100, color:C[4] },
  { rank:'2', name:'Olive Lames Cap',      sold:218, rev:'฿174,400', pct:67,  color:C[0] },
  { rank:'3', name:'Pocket Logo T-Shirt',  sold:196, rev:'฿176,400', pct:61,  color:C[1] },
  { rank:'4', name:'Logo Hoodie',          sold:142, rev:'฿284,000', pct:44,  color:C[3] },
  { rank:'5', name:'Devtai Polo Shirt',    sold:98,  rev:'฿122,500', pct:30,  color:C[2] },
];

function renderProducts() {
  document.getElementById('prodList').innerHTML = PRODUCTS.map(p=>`
    <div class="prod-item">
      <span class="prod-rank">${p.rank}</span>
      <div class="prod-thumb" style="background:${hexA(p.color,.15)};display:flex;align-items:center;justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${p.color}" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name}</div>
        <div class="prod-bar-row">
          <div class="prod-bar-bg"><div class="prod-bar-fill" style="width:${p.pct}%;background:${p.color}"></div></div>
          <span class="prod-sold">${p.sold} ชิ้น</span>
        </div>
      </div>
      <span class="prod-rev">${p.rev}</span>
    </div>`).join('');
}

/* ── Orders ── */
const ORDERS = [
  { id:'ORD-001', cust:'ก้อง อรรถวิทย์',  total:'฿1,600', status:'delivered', date:'21/07' },
  { id:'ORD-002', cust:'แพร์ ศิริมา',      total:'฿800',   status:'shipping',  date:'21/07' },
  { id:'ORD-003', cust:'ไบรท์ ธีรพล',     total:'฿2,000', status:'confirmed', date:'21/07' },
  { id:'ORD-004', cust:'มิ้น สุภาพรรณ',    total:'฿2,500', status:'delivered', date:'20/07' },
  { id:'ORD-005', cust:'บอม จักรกฤษณ์',   total:'฿2,100', status:'delivered', date:'20/07' },
  { id:'ORD-006', cust:'ฝน ภัทราภรณ์',    total:'฿800',   status:'pending',   date:'20/07' },
  { id:'ORD-007', cust:'เต้ ธนัท',         total:'฿4,800', status:'delivered', date:'19/07' },
  { id:'ORD-008', cust:'นัท กัญญาพัชร์',  total:'฿800',   status:'cancelled', date:'19/07' },
];
const STATUS_MAP = {
  pending:   { label:'รอชำระ',    cls:'s-pending'   },
  confirmed: { label:'ยืนยันแล้ว', cls:'s-confirmed' },
  shipping:  { label:'กำลังส่ง',  cls:'s-shipping'  },
  delivered: { label:'ส่งแล้ว',   cls:'s-delivered' },
  cancelled: { label:'ยกเลิก',    cls:'s-cancelled' },
};
function renderOrders() {
  document.getElementById('ordersBody').innerHTML = ORDERS.map(o=>{
    const s = STATUS_MAP[o.status];
    return `<tr>
      <td style="font-size:12px;color:#8a8a8a;font-family:'Inter',monospace">${o.id}</td>
      <td style="font-weight:500">${o.cust}</td>
      <td style="font-weight:700">${o.total}</td>
      <td><span class="status-pill ${s.cls}">${s.label}</span></td>
      <td style="font-size:12px;color:#8a8a8a">${o.date}</td>
    </tr>`;
  }).join('');
}

/* ── Sidebar ── */
function setupSidebar() {
  const btn  = document.getElementById('collapseBtn');
  const side = document.getElementById('sidebar');
  const main = document.getElementById('main');
  btn.addEventListener('click', () => {
    side.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  });
}

/* ── Theme ── */
function setupTheme() {
  const btn   = document.getElementById('themeBtn');
  const saved = localStorage.getItem('devtai-theme') || 'light';
  if (saved==='dark') document.documentElement.setAttribute('data-dark','');
  btn.addEventListener('click', () => {
    const isDark = document.documentElement.hasAttribute('data-dark');
    if (isDark) {
      document.documentElement.removeAttribute('data-dark');
      localStorage.setItem('devtai-theme','light');
    } else {
      document.documentElement.setAttribute('data-dark','');
      localStorage.setItem('devtai-theme','dark');
    }
    // update chart colors
    if (lineChart) {
      lineChart.options.scales.x.grid.color = getGridColor();
      lineChart.options.scales.y.grid.color = getGridColor();
      lineChart.options.scales.x.ticks.color = getTickColor();
      lineChart.options.scales.y.ticks.color = getTickColor();
      lineChart.update();
    }
  });
}

/* ── Util ── */
function hexA(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
