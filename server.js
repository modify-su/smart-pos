/* ============================================================
   server.js — Direct Webhook Server (Multi-Channel Order Hub)
   TikTok Shop + Shopee + Facebook / Meta API Integrator
   ============================================================ */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

const PORT = 3001;

// In-Memory Unified Orders Store
let ordersStore = [];
let webhookStats = {
  tiktok: 0,
  shopee: 0,
  facebook: 0,
  total: 0
};

// Standardized Order Formatter
function createUnifiedOrder(data) {
  const order = {
    id: data.id || `ORD-${Date.now()}`,
    channel: data.channel || 'Direct Webhook',
    channelIcon: data.channelIcon || '📦',
    customer: data.customer || 'ลูกค้าไม่ระบุชื่อ',
    address: data.address || 'ไม่ระบุที่อยู่จัดส่ง',
    phone: data.phone || '-',
    items: data.items || '• สินค้าไม่ระบุรายการ (x1)',
    courier: data.courier || 'J&T Express',
    tracking: data.tracking || '',
    status: data.status || 'unfulfilled', // unfulfilled | tracking_created | shipped
    receivedAt: new Date().toISOString(),
    selected: false
  };

  ordersStore.unshift(order);
  webhookStats.total += 1;
  return order;
}

// CORS & Response Helper
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // Body parser helper
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    let payload = {};
    if (body) {
      try { payload = JSON.parse(body); } catch (e) { payload = { raw: body }; }
    }

    // ──────────────────────────────────────────────────────────
    // 1. HEALTH & STATUS ENDPOINT
    // ──────────────────────────────────────────────────────────
    if (path === '/api/status' && method === 'GET') {
      return sendJSON(res, 200, {
        status: 'online',
        uptime: process.uptime(),
        port: PORT,
        stats: webhookStats,
        webhooks: {
          tiktok: `http://localhost:${PORT}/api/webhooks/tiktok`,
          shopee: `http://localhost:${PORT}/api/webhooks/shopee`,
          facebook: `http://localhost:${PORT}/api/webhooks/facebook`
        }
      });
    }

    // ──────────────────────────────────────────────────────────
    // 2. GET UNIFIED ORDERS
    // ──────────────────────────────────────────────────────────
    if (path === '/api/orders' && method === 'GET') {
      return sendJSON(res, 200, {
        success: true,
        count: ordersStore.length,
        data: ordersStore
      });
    }

    // ──────────────────────────────────────────────────────────
    // 3. TIKTOK SHOP DIRECT WEBHOOK ENDPOINT
    // ──────────────────────────────────────────────────────────
    if (path === '/api/webhooks/tiktok' && method === 'POST') {
      webhookStats.tiktok += 1;
      console.log('[TikTok Webhook Received]:', payload);

      // Parse TikTok Order Payload Structure
      const ttOrder = payload.data || payload;
      const order = createUnifiedOrder({
        id: ttOrder.order_id || `TT-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        channel: 'TikTok Shop',
        channelIcon: '🎵',
        customer: ttOrder.recipient_address?.name || ttOrder.customer || 'คุณสมศักดิ์ (TikTok)',
        address: ttOrder.recipient_address?.full_address || ttOrder.address || '45/12 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000',
        phone: ttOrder.recipient_address?.phone || ttOrder.phone || '089-876-5432',
        items: ttOrder.items_summary || (ttOrder.item_list ? ttOrder.item_list.map(i => `• ${i.product_name} (x${i.quantity||1})`).join('\n') : '• เสื้อยืด Oversize สีดำ ไซส์ L (x2)'),
        courier: ttOrder.shipping_provider_name || 'J&T Express',
        status: 'unfulfilled'
      });

      return sendJSON(res, 200, { success: true, message: 'TikTok webhook received', order });
    }

    // ──────────────────────────────────────────────────────────
    // 4. SHOPEE DIRECT WEBHOOK ENDPOINT
    // ──────────────────────────────────────────────────────────
    if (path === '/api/webhooks/shopee' && method === 'POST') {
      webhookStats.shopee += 1;
      console.log('[Shopee Webhook Received]:', payload);

      const shpOrder = payload.data || payload;
      const order = createUnifiedOrder({
        id: shpOrder.ordersn || `SP-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        channel: 'Shopee',
        channelIcon: '🧡',
        customer: shpOrder.buyer_username || shpOrder.customer || 'คุณวิภาวรรณ (Shopee)',
        address: shpOrder.recipient_address?.full_address || shpOrder.address || '88/9 คอนโดไลฟ์ ถนนอโศก เขตห้วยขวาง กทม. 10310',
        phone: shpOrder.recipient_address?.phone || shpOrder.phone || '081-999-8877',
        items: shpOrder.items_summary || '• หมวกเบสบอล Minimal สีครีม (x1)',
        courier: shpOrder.shipping_carrier || 'Flash Express',
        status: 'unfulfilled'
      });

      return sendJSON(res, 200, { success: true, message: 'Shopee webhook received', order });
    }

    // ──────────────────────────────────────────────────────────
    // 5. FACEBOOK / META DIRECT WEBHOOK ENDPOINT
    // ──────────────────────────────────────────────────────────
    if (path === '/api/webhooks/facebook') {
      // Facebook Verification GET Challenge
      if (method === 'GET') {
        const mode = parsedUrl.query['hub.mode'];
        const token = parsedUrl.query['hub.verify_token'];
        const challenge = parsedUrl.query['hub.challenge'];

        if (mode === 'subscribe' && token === 'devtai_secret_token') {
          console.log('[FB Webhook Verified]');
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          return res.end(challenge);
        } else {
          return sendJSON(res, 403, { error: 'Verification token mismatch' });
        }
      }

      if (method === 'POST') {
        webhookStats.facebook += 1;
        console.log('[Facebook Webhook Received]:', payload);

        const fbOrder = payload.entry?.[0]?.changes?.[0]?.value || payload;
        const order = createUnifiedOrder({
          id: fbOrder.order_id || `FB-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          channel: 'Facebook',
          channelIcon: '💙',
          customer: fbOrder.sender_name || fbOrder.customer || 'คุณณัฐพล (Facebook Inbox)',
          address: fbOrder.shipping_address || fbOrder.address || '12/5 ถนนมิตรภาพ อ.เมือง จ.ขอนแก่น 40000',
          phone: fbOrder.phone || '086-555-1234',
          items: fbOrder.items_summary || '• เสื้อโปโล ผ้า CVC สีส้ม (x2)',
          courier: fbOrder.courier || 'Kerry Express',
          status: 'unfulfilled'
        });

        return sendJSON(res, 200, { success: true, message: 'Facebook webhook received', order });
      }
    }

    // ──────────────────────────────────────────────────────────
    // 6. TEST SIMULATE WEBHOOK TRIGGER FROM FRONTEND UI
    // ──────────────────────────────────────────────────────────
    if (path === '/api/orders/test-simulate' && method === 'POST') {
      const channel = payload.channel || 'TikTok Shop';
      const channelIcons = { 'TikTok Shop': '🎵', 'Shopee': '🧡', 'Facebook': '💙' };

      const simulated = createUnifiedOrder({
        id: `${channel === 'TikTok Shop' ? 'TT' : (channel === 'Shopee' ? 'SP' : 'FB')}-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        channel: channel,
        channelIcon: channelIcons[channel] || '📦',
        customer: payload.customer || `ลูกค้าทดสอบ (${channel})`,
        address: payload.address || '123/45 ถนนสุขุมวิท เขตวัฒนา กทม. 10110',
        phone: '081-234-5678',
        items: payload.items || '• เสื้อยืด Devtai Special Edition (x1)',
        courier: payload.courier || 'J&T Express',
        status: 'unfulfilled'
      });

      return sendJSON(res, 200, { success: true, order: simulated });
    }

    // 404 Fallback
    return sendJSON(res, 404, { error: 'Endpoint not found' });
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Direct Webhook Server running on http://localhost:${PORT}`);
  console.log(`🎵 TikTok Webhook:   http://localhost:${PORT}/api/webhooks/tiktok`);
  console.log(`🧡 Shopee Webhook:   http://localhost:${PORT}/api/webhooks/shopee`);
  console.log(`💙 Facebook Webhook: http://localhost:${PORT}/api/webhooks/facebook`);
  console.log(`====================================================`);
});
