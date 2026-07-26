/* ================================================
   Devtai Shop — Dashboard JS
   dashboard.js
   ================================================ */

// ── Current period ──
let currentPeriod = 'today';

// ── Color palette ──
const COLORS = {
  accent:   '#ff6b35',
  purple:   '#8b5cf6',
  blue:     '#3b82f6',
  green:    '#22c55e',
  yellow:   '#f59e0b',
  red:      '#ef4444',
  teal:     '#14b8a6',
  pink:     '#ec4899',
};

// ── Period datasets ──
const PERIOD_DATA = {
  today: {
    revLabel: '฿48,250', revSub: 'เทียบกับเมื่อวาน ฿42,900', revChange: '+12.4%', revUp: true,
    ordLabel: '134',     ordSub: 'เทียบกับเมื่อวาน 124 ออเดอร์', ordChange: '+8.1%',  ordUp: true,
    cusLabel: '28',      cusSub: 'ทั้งหมด 1,847 ลูกค้า', cusChange: '+5.3%', cusUp: true,
    proLabel: '286',
    trendLabels: ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'],
    trendRevenue: [1200,3400,5800,4200,8900,7600,9200,11500,6800,8150],
    trendOrders:  [4,12,18,13,28,22,29,38,21,26],
  },
  week: {
    revLabel: '฿312,500', revSub: 'เทียบกับสัปดาห์ก่อน ฿278,000', revChange: '+12.4%', revUp: true,
    ordLabel: '842',      ordSub: 'เทียบกับสัปดาห์ก่อน 760 ออเดอร์', ordChange: '+10.8%', ordUp: true,
    cusLabel: '186',      cusSub: 'ทั้งหมด 1,847 ลูกค้า', cusChange: '+5.3%', cusUp: true,
    proLabel: '286',
    trendLabels: ['จ','อ','พ','พฤ','ศ','ส','อา'],
    trendRevenue: [38000,52000,44000,67000,58000,72000,48250],
    trendOrders:  [110,148,128,195,170,210,134],
  },
  month: {
    revLabel: '฿1,248,000', revSub: 'เทียบกับเดือนก่อน ฿1,104,000', revChange: '+13.0%', revUp: true,
    ordLabel: '3,240',      ordSub: 'เทียบกับเดือนก่อน 2,980 ออเดอร์', ordChange: '+8.7%', ordUp: true,
    cusLabel: '724',        cusSub: 'ทั้งหมด 1,847 ลูกค้า', cusChange: '+5.3%', cusUp: true,
    proLabel: '286',
    trendLabels: Array.from({length:30},(_,i)=>`${i+1}`),
    trendRevenue: [28000,42000,35000,51000,48000,62000,38000,55000,44000,70000,65000,80000,58000,72000,66000,88000,76000,92000,70000,85000,78000,95000,82000,98000,86000,102000,90000,108000,94000,112000],
    trendOrders:  Array.from({length:30},(_,i)=>Math.floor(70+Math.sin(i/3)*30+Math.random()*20)),
  },
  year: {
    revLabel: '฿14,560,000', revSub: 'เทียบกับปีก่อน ฿11,200,000', revChange: '+30.0%', revUp: true,
    ordLabel: '38,240',      ordSub: 'เทียบกับปีก่อน 29,800 ออเดอร์', ordChange: '+28.3%', ordUp: true,
    cusLabel: '8,540',       cusSub: 'ทั้งหมด 1,847 ลูกค้า', cusChange: '+5.3%', cusUp: true,
    proLabel: '286',
    trendLabels: ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
    trendRevenue: [880000,950000,1020000,1150000,1080000,1240000,1380000,1320000,1450000,1560000,1490000,1580000],
    trendOrders:  [2200,2450,2700,3100,2900,3300,3600,3450,3800,4100,3950,4150],
  },
};

// ── Chart instances ──
let chartSalesTrend = null;
let chartCategory   = null;
let chartWarehouse  = null;
let sparkCharts     = {};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  setupTheme();
  setGreeting();
  setDate();
  initSparklines();
  initSalesTrendChart();
  initCategoryChart();
  initWarehouseChart();
  renderTopProducts();
  renderRecentOrders();
  renderLowStock();
  renderActivity();
  updateKPIs('today');
});

// ── Greeting ──
function setGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById('greeting');
  if (h < 12) el.textContent = 'สวัสดีตอนเช้า 👋';
  else if (h < 17) el.textContent = 'สวัสดีตอนบ่าย 👋';
  else el.textContent = 'สวัสดีตอนเย็น 👋';
}

function setDate() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  document.getElementById('welcomeDate').textContent = now.toLocaleDateString('th-TH', opts);
}

// ── Period switch ──
function setPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateKPIs(period);
  updateSalesTrend(period);
}

function updateKPIs(period) {
  const d = PERIOD_DATA[period];
  animateCount('kpi-rev-val', d.revLabel);
  document.getElementById('kpi-rev-sub').textContent = d.revSub;
  setChange('kpi-rev-change', d.revChange, d.revUp);

  animateCount('kpi-ord-val', d.ordLabel);
  document.getElementById('kpi-ord-sub').textContent = d.ordSub;
  setChange('kpi-ord-change', d.ordChange, d.ordUp);

  animateCount('kpi-cus-val', d.cusLabel);
  document.getElementById('kpi-cus-sub').textContent = d.cusSub;
  setChange('kpi-cus-change', d.cusChange, d.cusUp);
}

function setChange(id, text, isUp) {
  const el = document.getElementById(id);
  el.className = `kpi-change kpi-change--${isUp ? 'up' : 'down'}`;
  el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <polyline points="${isUp ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"/></svg> ${text}`;
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = '0.4';
  el.style.transform = 'translateY(4px)';
  setTimeout(() => {
    el.textContent = target;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    el.style.transition = 'all .3s ease';
  }, 150);
}

// ── Sparklines ──
function initSparklines() {
  const sparkData = {
    sparkRevenue:   { data: [32000,38000,35000,42000,40000,45000,48250], color: COLORS.accent },
    sparkOrders:    { data: [95,110,105,120,115,125,134],                color: COLORS.purple },
    sparkProducts:  { data: [280,282,283,284,284,285,286],               color: COLORS.blue },
    sparkCustomers: { data: [18,20,22,19,24,26,28],                      color: COLORS.green },
  };
  Object.entries(sparkData).forEach(([id, cfg]) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    sparkCharts[id] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cfg.data.map((_,i) => i),
        datasets: [{
          data: cfg.data,
          borderColor: cfg.color,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          backgroundColor: hexAlpha(cfg.color, 0.12),
          pointRadius: 0,
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 800 },
      }
    });
  });
}

// ── Sales Trend Chart ──
function initSalesTrendChart() {
  const ctx = document.getElementById('chartSalesTrend');
  if (!ctx) return;
  const d = PERIOD_DATA.today;

  chartSalesTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.trendLabels,
      datasets: [
        {
          label: 'ยอดขาย (฿)',
          data: d.trendRevenue,
          borderColor: COLORS.accent,
          backgroundColor: hexAlpha(COLORS.accent, 0.08),
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
          pointRadius: 4,
          pointBackgroundColor: COLORS.accent,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
        {
          label: 'ออเดอร์',
          data: d.trendOrders,
          borderColor: COLORS.purple,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          yAxisID: 'y2',
          pointRadius: 3,
          pointBackgroundColor: COLORS.purple,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          borderDash: [5,4],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface') || '#fff',
          titleColor: '#1a1d23',
          bodyColor: '#6b7280',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? ` ยอดขาย: ฿${ctx.parsed.y.toLocaleString()}`
              : ` ออเดอร์: ${ctx.parsed.y} รายการ`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,.04)', drawTicks: false },
          ticks: { color: '#9ca3af', font: { family: 'Noto Sans Thai', size: 11 } },
        },
        y: {
          position: 'left',
          grid: { color: 'rgba(0,0,0,.04)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter', size: 11 },
            callback: v => v >= 1000 ? `฿${(v/1000).toFixed(0)}k` : `฿${v}`,
          }
        },
        y2: {
          position: 'right',
          grid: { display: false },
          ticks: {
            color: COLORS.purple,
            font: { family: 'Inter', size: 11 },
          }
        }
      }
    }
  });
}

function updateSalesTrend(period) {
  if (!chartSalesTrend) return;
  const d = PERIOD_DATA[period];
  chartSalesTrend.data.labels = d.trendLabels;
  chartSalesTrend.data.datasets[0].data = d.trendRevenue;
  chartSalesTrend.data.datasets[1].data = d.trendOrders;
  chartSalesTrend.update('active');
}

// ── Category Donut Chart ──
const CATEGORY_DATA = [
  { label: 'เสื้อยืด',  value: 42, color: COLORS.accent },
  { label: 'หมวก',     value: 24, color: COLORS.purple },
  { label: 'เสื้อโปโล', value: 18, color: COLORS.blue },
  { label: 'ฮูดดี้',   value: 10, color: COLORS.green },
  { label: 'อื่นๆ',    value: 6,  color: COLORS.yellow },
];

function initCategoryChart() {
  const ctx = document.getElementById('chartCategory');
  if (!ctx) return;
  const total = CATEGORY_DATA.reduce((s,d) => s+d.value, 0);

  chartCategory = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CATEGORY_DATA.map(d => d.label),
      datasets: [{
        data: CATEGORY_DATA.map(d => d.value),
        backgroundColor: CATEGORY_DATA.map(d => d.color),
        borderWidth: 3,
        borderColor: 'var(--bg-surface)',
        hoverBorderWidth: 4,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}% (฿${(ctx.raw/100*312500).toLocaleString()})`
          }
        }
      }
    }
  });

  // Legend
  const legend = document.getElementById('donutLegend');
  legend.innerHTML = CATEGORY_DATA.map(d => `
    <div class="donut-legend-item">
      <div class="donut-legend-left">
        <span class="donut-dot" style="background:${d.color}"></span>
        <span class="donut-label">${d.label}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="donut-value">${d.value}%</span>
        <span class="donut-pct">฿${Math.round(d.value/100*312500).toLocaleString()}</span>
      </div>
    </div>`).join('');
}

// ── Warehouse Bar Chart ──
function initWarehouseChart() {
  const ctx = document.getElementById('chartWarehouse');
  if (!ctx) return;

  const labels = ['เสื้อยืด','หมวก','เสื้อโปโล','ฮูดดี้','อื่นๆ'];
  chartWarehouse = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Bangkok WH',
          data: [85, 42, 38, 24, 18],
          backgroundColor: hexAlpha(COLORS.accent, 0.85),
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Chiang Mai WH',
          data: [32, 15, 12, 9, 5],
          backgroundColor: hexAlpha(COLORS.purple, 0.75),
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#6b7280',
            font: { family: 'Noto Sans Thai', size: 12 },
            boxWidth: 12, boxHeight: 12,
            borderRadius: 4,
            useBorderRadius: true,
            padding: 16,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw} ชิ้น`,
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { family: 'Noto Sans Thai', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(0,0,0,.04)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Inter', size: 11 },
            callback: v => `${v} ชิ้น`
          }
        }
      }
    }
  });
}

// ── Top Products ──
const topProducts = [
  { rank:1, name:'Devtai Center Logo T-Shirt', sku:'DVT-TEE-BLK', sold:324, revenue:259200, pct:100, color:'#3a3a3a' },
  { rank:2, name:'Olive Lames Cap',             sku:'UBE-CAP-OLV', sold:218, revenue:174400, pct:67,  color:'#6b8e7a' },
  { rank:3, name:'Devtai Pocket Logo T-Shirt',  sku:'DVT-TEE-PKT', sold:196, revenue:176400, pct:61,  color:'#2c2c2c' },
  { rank:4, name:'Logo Hoodie',                 sku:'DVT-HOODIE',  sold:142, revenue:284000, pct:44,  color:'#2c3e50' },
  { rank:5, name:'Devtai Polo Shirt',           sku:'DVT-POLO',    sold:98,  revenue:122500, pct:30,  color:'#c7d8c0' },
];

function productImg(color) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='6' fill='${encodeURIComponent(color)}'/%3E%3Cpath d='M12 28 L20 14 L28 28 Z' fill='rgba(255,255,255,0.35)'/%3E%3Ccircle cx='20' cy='17' r='4' fill='rgba(255,255,255,0.5)'/%3E%3C/svg%3E`;
}

function renderTopProducts() {
  const container = document.getElementById('topProductsList');
  const barColors = [COLORS.accent, COLORS.purple, COLORS.blue, COLORS.green, COLORS.yellow];
  const rankCls   = ['gold','silver','bronze','',''];
  const rankLabel = ['🥇','🥈','🥉','4','5'];

  container.innerHTML = topProducts.map((p, i) => `
    <div class="top-product-item">
      <span class="top-rank ${rankCls[i]}">${rankLabel[i]}</span>
      <img src="${productImg(p.color)}" alt="${p.name}" class="top-thumb" />
      <div class="top-info">
        <div class="top-name">${p.name}</div>
        <div class="top-bar-wrap">
          <div class="top-bar-bg">
            <div class="top-bar-fill" style="width:${p.pct}%;background:${barColors[i]}"></div>
          </div>
          <span class="top-sold">${p.sold} ชิ้น</span>
        </div>
      </div>
      <span class="top-revenue">฿${p.revenue.toLocaleString()}</span>
    </div>`).join('');
}

// ── Recent Orders ──
const recentOrders = [
  { id:'ORD-20250721-001', customer:'ก้อง อรรถวิทย์',  items:'Devtai Center Logo T-Shirt x2', total:1600, status:'delivered', date:'21/07/25' },
  { id:'ORD-20250721-002', customer:'แพร์ ศิริมา',      items:'Olive Lames Cap x1',            total: 800, status:'shipping',  date:'21/07/25' },
  { id:'ORD-20250721-003', customer:'ไบรท์ ธีรพล',     items:'Logo Hoodie x1',                total:2000, status:'confirmed', date:'21/07/25' },
  { id:'ORD-20250720-012', customer:'มิ้น สุภาพรรณ',    items:'Devtai Polo Shirt x2',          total:2500, status:'delivered', date:'20/07/25' },
  { id:'ORD-20250720-011', customer:'บอม จักรกฤษณ์',   items:'Black Cotton T-Shirt x3',       total:2100, status:'delivered', date:'20/07/25' },
  { id:'ORD-20250720-010', customer:'ฝน ภัทราภรณ์',    items:'Devtai Center Logo T-Shirt x1', total: 800, status:'pending',   date:'20/07/25' },
  { id:'ORD-20250719-008', customer:'เต้ ธนัท',         items:'Logo Hoodie x2, Cap x1',       total:4800, status:'delivered', date:'19/07/25' },
  { id:'ORD-20250719-007', customer:'นัท กัญญาพัชร์',  items:'Devtai Pocket Logo x1',         total: 800, status:'cancelled', date:'19/07/25' },
  { id:'ORD-20250718-005', customer:'กิ๊ก ปิยะนันท์',  items:'Olive Lames Cap x2',            total:1600, status:'delivered', date:'18/07/25' },
  { id:'ORD-20250718-004', customer:'อิ๊ก อภิสิทธิ์',  items:'Devtai Polo Shirt x1',          total:1250, status:'delivered', date:'18/07/25' },
];

const ORDER_STATUS = {
  pending:   { label:'รอชำระ',    cls:'pending'   },
  confirmed: { label:'ยืนยันแล้ว', cls:'confirmed' },
  shipping:  { label:'กำลังส่ง',  cls:'shipping'  },
  delivered: { label:'ส่งแล้ว',   cls:'delivered' },
  cancelled: { label:'ยกเลิก',    cls:'cancelled' },
};

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersBody');
  tbody.innerHTML = recentOrders.map(o => {
    const s = ORDER_STATUS[o.status];
    return `<tr>
      <td><span style="font-size:12px;font-family:'Inter',monospace;color:var(--text-secondary)">${o.id}</span></td>
      <td><span style="font-weight:600;font-size:13.5px">${o.customer}</span></td>
      <td><span style="font-size:12.5px;color:var(--text-secondary)">${o.items}</span></td>
      <td><span style="font-weight:700;font-size:13.5px">฿${o.total.toLocaleString()}</span></td>
      <td><span class="order-badge order-badge--${s.cls}">${s.label}</span></td>
      <td><span style="font-size:12px;color:var(--text-muted)">${o.date}</span></td>
    </tr>`;
  }).join('');
}

// ── Low Stock ──
const lowStockItems = [
  { name:'Devtai Pocket Logo T-Shirt', sku:'DVT-TEE-PKT / S', qty:2,  level:'critical' },
  { name:'Olive Lames Cap',            sku:'UBE-CAP / RED',   qty:3,  level:'critical' },
  { name:'Black Cotton T-Shirt',       sku:'UBE-TSHIRT / XS', qty:5,  level:'warning'  },
  { name:'Logo Hoodie',                sku:'DVT-HOODIE / XL', qty:6,  level:'warning'  },
  { name:'Devtai Polo Shirt',          sku:'DVT-POLO / S',    qty:8,  level:'warning'  },
];

function renderLowStock() {
  const container = document.getElementById('lowStockList');
  document.getElementById('lowStockCount').textContent = lowStockItems.length;
  container.innerHTML = lowStockItems.map(item => `
    <div class="low-stock-item">
      <div class="low-stock-info">
        <div class="low-stock-name">${item.name}</div>
        <div class="low-stock-sku">${item.sku}</div>
      </div>
      <span class="low-stock-qty ${item.level}">${item.qty} ชิ้น</span>
    </div>`).join('');
}

// ── Activity Feed ──
const activities = [
  { dot:'green',  text:'<strong>รับสินค้าเข้า</strong> Olive Lames Cap x10 ชิ้น',               time:'09:32' },
  { dot:'red',    text:'<strong>ขายสินค้า</strong> ORD-20250721-003 Devtai Center Logo T-Shirt',  time:'09:28' },
  { dot:'blue',   text:'<strong>โอนสต็อก</strong> Logo Hoodie x3 → Chiang Mai WH',               time:'08:55' },
  { dot:'yellow', text:'<strong>ปรับยอด</strong> Black Cotton T-Shirt M สต็อกผิดพลาด +2',          time:'08:40' },
  { dot:'red',    text:'<strong>ขายสินค้า</strong> ORD-20250721-002 Olive Lames Cap x1',          time:'08:30' },
  { dot:'green',  text:'<strong>ชำระเงินแล้ว</strong> ORD-20250720-012 ฿2,500',                  time:'เมื่อวาน' },
];

function renderActivity() {
  const container = document.getElementById('activityList');
  container.innerHTML = activities.map(a => `
    <div class="activity-item">
      <span class="activity-dot activity-dot--${a.dot}"></span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${a.time}</span>
    </div>`).join('');
}

// ── Sidebar & Theme ──
function setupSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainWrapper');
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  });
}

function setupTheme() {
  const btn   = document.getElementById('btn-theme');
  const saved = localStorage.getItem('devtai-theme') || 'light';
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  updateChartColors();
  btn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('devtai-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('devtai-theme', 'dark');
    }
    updateChartColors();
  });
}

function updateChartColors() {
  // Re-color chart tooltip backgrounds after theme switch
  if (chartSalesTrend) chartSalesTrend.update();
}

// ── Nav group toggle ──
function toggleGroup(name) {
  const sub   = document.getElementById(`sub-${name}`);
  const arrow = document.querySelector(`#group-${name} .nav-arrow`);
  if (!sub) return;
  sub.classList.toggle('show');
  if (arrow) arrow.classList.toggle('open');
  const header = document.querySelector(`#group-${name} .nav-group-header`);
  if (header) header.classList.toggle('active');
}

// ── Print ──
function printReport() {
  window.print();
}

// ── Toast ──
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Util ──
function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
