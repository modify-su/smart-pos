/* ============================================================
   firebase-service.js — Devtai Shop Realtime Firebase Service
   ============================================================ */

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.config = this.loadConfig();
    this.isConnected = false;
    this.init();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem('SMART_STOCK_FB_CONFIG_V2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.databaseURL) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  saveConfig(newConfig) {
    this.config = newConfig;
    try {
      localStorage.setItem('SMART_STOCK_FB_CONFIG_V2', JSON.stringify(this.config));
    } catch (e) {}
    this.reconnect();
  }

  clearConfig() {
    this.config = null;
    try {
      localStorage.removeItem('SMART_STOCK_FB_CONFIG_V2');
    } catch (e) {}
    location.reload();
  }

  init() {
    if (!this.config || !this.config.apiKey || !this.config.databaseURL) {
      console.log('ℹ️ Firebase Config not set. System running in offline local mode.');
      this.updateConnectionUI(false);
      return;
    }

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded.');
      this.updateConnectionUI(false);
      return;
    }

    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.app();
      }
      this.db = firebase.database();
      this.setupConnectionListener();
    } catch (err) {
      console.warn('Firebase Init Error:', err.message);
      this.updateConnectionUI(false);
    }
  }

  reconnect() {
    location.reload();
  }

  setupConnectionListener() {
    if (!this.db) return;
    const connectedRef = this.db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
      this.isConnected = snap.val() === true;
      this.updateConnectionUI(this.isConnected);
    });
  }

  updateConnectionUI(online) {
    const statusEl = document.getElementById('fbSettingsStatus');
    if (statusEl) {
      if (online) {
        statusEl.innerHTML = '🟢 เชื่อมต่อคลาวด์สำเร็จแล้ว (Realtime Online)';
        statusEl.style.color = '#10b981';
      } else if (this.config) {
        statusEl.innerHTML = '🟡 กำลังเชื่อมต่อระบบคลาวด์...';
        statusEl.style.color = '#f59e0b';
      } else {
        statusEl.innerHTML = '⚪ ยังไม่ได้บันทึกข้อมูลการเชื่อมต่อ';
        statusEl.style.color = 'var(--muted)';
      }
    }
  }

  // ── Realtime Sync Methods ──
  listenProducts(callback) {
    if (!this.db) return;
    this.db.ref('products_list').on('value', (snap) => {
      const val = snap.val();
      if (val !== undefined && val !== null) {
        let list = [];
        if (Array.isArray(val)) {
          list = val.filter(Boolean);
        } else if (typeof val === 'object') {
          list = Object.values(val);
        }
        callback(list);
      } else {
        callback([]);
      }
    });
  }

  saveProducts(products) {
    if (this.db) {
      this.db.ref('products_list').set(products);
    }
  }

  listenStock(callback) {
    if (!this.db) return;
    this.db.ref('stock_movements').on('value', (snap) => {
      const val = snap.val();
      if (val !== undefined && val !== null) {
        let list = [];
        if (Array.isArray(val)) {
          list = val.filter(Boolean);
        } else if (typeof val === 'object') {
          list = Object.values(val);
        }
        callback(list);
      } else {
        callback([]);
      }
    });
  }

  saveStock(stock) {
    if (this.db) {
      this.db.ref('stock_movements').set(stock);
    }
  }

  listenStorage(callback) {
    if (!this.db) return;
    this.db.ref('storage_locations').on('value', (snap) => {
      const val = snap.val();
      if (val !== undefined && val !== null) {
        let list = [];
        if (Array.isArray(val)) {
          list = val.filter(Boolean);
        } else if (typeof val === 'object') {
          list = Object.values(val);
        }
        callback(list);
      } else {
        callback([]);
      }
    });
  }

  saveStorage(storage) {
    if (this.db) {
      this.db.ref('storage_locations').set(storage);
    }
  }
}

const fbService = new FirebaseService();
