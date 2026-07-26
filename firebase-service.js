/* ============================================================
   firebase-service.js — Devtai Shop Realtime Firebase Service
   ============================================================ */

// ── Default / Demo Firebase Config (Editable via UI) ──
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemoConfigKeyForDevtaiShop2026",
  authDomain: "devtai-shop.firebaseapp.com",
  databaseURL: "https://devtai-shop-default-rtdb.firebaseio.com",
  projectId: "devtai-shop",
  storageBucket: "devtai-shop.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:demo1234567890"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.config = this.loadConfig();
    this.isConnected = false;
    this.currentUser = null;
    this.init();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem('devtai-firebase-config');
      return saved ? JSON.parse(saved) : DEFAULT_FIREBASE_CONFIG;
    } catch(e) {
      return DEFAULT_FIREBASE_CONFIG;
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem('devtai-firebase-config', JSON.stringify(this.config));
    } catch(e){}
    this.reconnect();
  }

  init() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded, running in offline demo mode.');
      return;
    }
    try {
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(this.config);
      } else {
        this.app = firebase.app();
      }
      this.db = firebase.database();
      this.auth = firebase.auth();

      this.setupConnectionListener();
      this.setupAuthListener();
    } catch (err) {
      console.warn('Firebase init warning:', err.message);
    }
  }

  reconnect() {
    if (typeof firebase !== 'undefined' && firebase.apps.length) {
      // Re-initialize if config changes
      location.reload();
    }
  }

  setupConnectionListener() {
    if (!this.db) return;
    const connectedRef = this.db.ref('.info/connected');
    connectedRef.on('value', (snap) => {
      this.isConnected = snap.val() === true;
      this.updateConnectionUI();
    });
  }

  updateConnectionUI() {
    const badge = document.getElementById('fbStatusBadge');
    if (badge) {
      badge.className = `fb-badge ${this.isConnected ? 'online' : 'offline'}`;
      badge.innerHTML = `<span class="fb-dot"></span> Firebase ${this.isConnected ? 'Realtime 🟢' : ' 🟠'}`;
    }
  }

  setupAuthListener() {
    if (!this.auth) return;
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      if (typeof onAuthStatusChanged === 'function') {
        onAuthStatusChanged(user);
      }
    });
  }

  // ── Authentication Methods ──
  async login(email, password) {
    if (!this.auth) {
      // Offline fallback login
      const mockUser = { displayName: email.split('@')[0], email };
      this.currentUser = mockUser;
      if (typeof onAuthStatusChanged === 'function') onAuthStatusChanged(mockUser);
      return mockUser;
    }
    return await this.auth.signInWithEmailAndPassword(email, password);
  }

  async register(name, email, password) {
    if (!this.auth) {
      const mockUser = { displayName: name, email };
      this.currentUser = mockUser;
      if (typeof onAuthStatusChanged === 'function') onAuthStatusChanged(mockUser);
      return mockUser;
    }
    const res = await this.auth.createUserWithEmailAndPassword(email, password);
    if (res.user) {
      await res.user.updateProfile({ displayName: name });
    }
    return res.user;
  }

  async logout() {
    if (this.auth) {
      await this.auth.signOut();
    }
    this.currentUser = null;
    if (typeof onAuthStatusChanged === 'function') onAuthStatusChanged(null);
  }

  // ── Realtime Sync: Products List ──
  listenProducts(callback) {
    if (!this.db) return;
    const prodRef = this.db.ref('products_list');
    prodRef.on('value', (snap) => {
      const val = snap.val();
      if (val) {
        let list = Array.isArray(val) ? val : Object.keys(val).map(k => ({ id: k, ...val[k] }));
        callback(list);
      }
    });
  }

  saveProductsToFirebase(products) {
    if (this.db && this.isConnected) {
      this.db.ref('products_list').set(products);
    }
  }

  // ── Realtime Sync: Stock Movements ──
  listenStock(callback) {
    if (!this.db) return;
    const stockRef = this.db.ref('stock_movements');
    stockRef.on('value', (snap) => {
      const val = snap.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        callback(list);
      }
    });
  }

  pushStock(entry) {
    if (this.db && this.isConnected) {
      const stockRef = this.db.ref('stock_movements');
      stockRef.push(entry);
    }
  }

  updateStock(id, data) {
    if (this.db && this.isConnected && id) {
      this.db.ref(`stock_movements/${id}`).update(data);
    }
  }

  deleteStock(id) {
    if (this.db && this.isConnected && id) {
      this.db.ref(`stock_movements/${id}`).remove();
    }
  }

  // ── Realtime Sync: Storage Locations ──
  listenStorage(callback) {
    if (!this.db) return;
    const storageRef = this.db.ref('storage_locations');
    storageRef.on('value', (snap) => {
      const val = snap.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        callback(list);
      }
    });
  }

  pushStorage(entry) {
    if (this.db && this.isConnected) {
      const storageRef = this.db.ref('storage_locations');
      storageRef.push(entry);
    }
  }

  updateStorage(id, data) {
    if (this.db && this.isConnected && id) {
      this.db.ref(`storage_locations/${id}`).update(data);
    }
  }

  deleteStorage(id) {
    if (this.db && this.isConnected && id) {
      this.db.ref(`storage_locations/${id}`).remove();
    }
  }
}

// Global Instance
const fbService = new FirebaseService();
