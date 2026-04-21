// ================================================================
// MEAT MART NEPAL — Dashboard + POS + Inventory
// ================================================================

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await Http.get('/dashboard/stats' + branchParam());
    if (!data) { renderDashboardMock(); return; }

    // Stats
    document.getElementById('dToday').textContent = fmtNPR(data.today.revenue);
    document.getElementById('dBills').textContent = data.today.bills;
    document.getElementById('dDue').textContent = fmtNPR(data.khata_due);
    document.getElementById('dAlerts').textContent = data.alerts_count;

    // Weekly chart
    renderWeekChart(data.weekly_sales);

    // Recent sales
    const tbody = document.getElementById('recentSalesBody');
    if (tbody) {
      tbody.innerHTML = data.recent_sales.map(s => `
        <tr>
          <td style="font-weight:700">${s.invoice_number}</td>
          <td>${s.customer_name}</td>
          <td>${s.branch_name}</td>
          <td style="font-weight:600">${fmtNPR(s.total_amount)}</td>
          <td><span class="pill pill-${s.payment_method === 'khata' ? 'amber' : 'blue'}">${s.payment_method}</span></td>
          <td><span class="${s.due_amount > 0 ? 'pill pill-red' : 'pill pill-green'}">${s.due_amount > 0 ? 'Due' : 'Paid'}</span></td>
        </tr>
      `).join('');
    }

    // Alerts
    const alertsEl = document.getElementById('dashAlerts');
    if (alertsEl && data.alerts.length > 0) {
      alertsEl.innerHTML = data.alerts.slice(0, 4).map(a => `
        <div class="alert-item" onclick="navigate('alerts')">
          <div class="ai-dot" style="background:${a.severity==='critical'?'var(--red)':a.severity==='warning'?'var(--amber)':'var(--blue)'}"></div>
          <div style="flex:1"><div class="ai-title">${a.title}</div><div class="ai-sub">${a.message?.substring(0,60)}...</div></div>
          <div class="ai-time">${timeAgo(a.created_at)}</div>
        </div>
      `).join('');
    }

    // Branch revenue bars
    if (data.branch_revenue.length > 0) {
      const max = Math.max(...data.branch_revenue.map(b => parseFloat(b.revenue)));
      const brvEl = document.getElementById('branchRevBars');
      if (brvEl) {
        brvEl.innerHTML = data.branch_revenue.map(b => {
          const pct = max > 0 ? (parseFloat(b.revenue) / max) * 100 : 0;
          return `<div class="mb1">
            <div class="prog-row"><span>${b.name}</span><strong style="color:var(--green)">${fmtNPR(b.revenue)}</strong></div>
            <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:var(--green)"></div></div>
          </div>`;
        }).join('');
      }
    }

    // Cash session
    if (data.cash_session) {
      const cs = data.cash_session;
      document.getElementById('csOpen').textContent = fmtNPR(cs.opening_balance);
      document.getElementById('csCash').textContent = fmtNPR(cs.total_cash_sales);
      document.getElementById('csCollected').textContent = fmtNPR(cs.total_collected);
      document.getElementById('csExpected').textContent = fmtNPR(cs.expected_total);
    }

  } catch (err) {
    console.error('Dashboard error:', err);
    renderDashboardMock();
  }
}

function renderDashboardMock() {
  const mock = { revenue: 48250, bills: 34, due: 12400, alerts: 3 };
  document.getElementById('dToday').textContent = fmtNPR(mock.revenue);
  document.getElementById('dBills').textContent = mock.bills;
  document.getElementById('dDue').textContent = fmtNPR(mock.due);
  document.getElementById('dAlerts').textContent = mock.alerts;
  renderWeekChart([]);
}

function renderWeekChart(data = []) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Today'];
  const vals = data.length >= 7
    ? data.slice(-7).map(d => parseFloat(d.revenue))
    : [32000, 28000, 45000, 38000, 52000, 41000, 48250];
  const max = Math.max(...vals) || 1;
  const el = document.getElementById('weekChart');
  if (!el) return;
  el.innerHTML = vals.map((v, i) => `
    <div class="bc-col">
      <div class="bc-bar${i === vals.length - 1 ? ' hi' : ''}" style="height:${Math.round((v/max)*66)}px" title="${fmtNPR(v)}"></div>
      <div class="bc-lbl">${days[i]}</div>
    </div>
  `).join('');
}

// ─── POS ──────────────────────────────────────────────────────
async function loadPosProducts() {
  try {
    const data = await Http.get('/products?active=true' + (branchParam() ? '&' + branchParam().slice(1) : ''));
    App.products = data || App.mockProducts;
  } catch {
    App.products = App.mockProducts;
  }
  renderPosProducts();
  updateCartTime();
  setInterval(updateCartTime, 60000);
}

function renderPosProducts() {
  const q = (document.getElementById('posSearch')?.value || '').toLowerCase();
  const filtered = App.products.filter(p =>
    (App.activeCat === 'all' || p.category_slug === App.activeCat) &&
    (p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
  );
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">🔍</div><p>No products found</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <div class="prod-card${p.is_low ? ' low-stock' : ''}" onclick="addToCart(${p.id})">
      <div class="prod-emoji">${p.emoji}</div>
      <div class="prod-name">${p.name}</div>
      <div class="prod-price">${fmtNPR(p.sale_price)}</div>
      <div class="prod-unit">per ${p.unit}</div>
      <div class="prod-stock-tag" style="color:${p.is_low ? 'var(--red2)' : 'var(--text3)'}">${p.stock || 0} ${p.unit} in stock</div>
    </div>
  `).join('');
}

function setCat(el, cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  App.activeCat = cat;
  renderPosProducts();
}

function addToCart(id) {
  const p = App.products.find(x => x.id === id);
  if (!p) return;
  const existing = App.cart.find(x => x.id === id);
  const step = p.unit === 'kg' ? 0.5 : 1;
  if (existing) existing.qty = +(existing.qty + step).toFixed(1);
  else App.cart.push({ ...p, qty: step });
  renderCart();
  showToast(`${p.emoji} ${p.name} added`, '✅');
}

function changeQty(id, delta) {
  const item = App.cart.find(x => x.id === id);
  if (!item) return;
  const step = item.unit === 'kg' ? 0.5 : 1;
  item.qty = Math.max(step, +(item.qty + delta * step).toFixed(1));
  renderCart();
}

function removeFromCart(id) {
  App.cart = App.cart.filter(x => x.id !== id);
  renderCart();
}

function renderCart() {
  const cl = document.getElementById('cartList');
  if (!cl) return;
  if (!App.cart.length) {
    cl.innerHTML = `<div class="cart-empty"><div class="ce-icon">🛒</div><div style="font-size:12px;font-weight:600">Cart is empty</div><div style="font-size:11px">Tap a product to add</div></div>`;
    updateCartTotals(0, 0, 0);
    return;
  }
  cl.innerHTML = App.cart.map(item => `
    <div class="ci">
      <span class="ci-emoji">${item.emoji}</span>
      <div style="flex:1;min-width:0">
        <div class="ci-name">${item.name}</div>
        <div class="ci-sub">${item.qty} ${item.unit} × ${fmtNPR(item.sale_price)}</div>
      </div>
      <div class="ci-qty">
        <div class="qb" onclick="changeQty(${item.id},-1)">−</div>
        <div class="qv">${item.qty}</div>
        <div class="qb" onclick="changeQty(${item.id},1)">+</div>
      </div>
      <div class="ci-total">${fmtNPR(item.qty * item.sale_price)}</div>
      <div class="ci-rm" onclick="removeFromCart(${item.id})">✕</div>
    </div>
  `).join('');
  const sub = App.cart.reduce((s, i) => s + i.qty * i.sale_price, 0);
  const vat = App.cart.some(i => i.vat_applicable) ? sub * 0.13 : 0;
  updateCartTotals(sub, vat, sub + vat);
}

function updateCartTotals(sub, vat, total) {
  ['cartSub','cartVat','cartTotal','checkoutAmt'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'checkoutAmt' ? fmtNPR(total) : fmtNPR(id === 'cartVat' ? vat : id === 'cartSub' ? sub : total);
  });
  const btn = document.getElementById('checkoutBtn');
  if (btn) btn.disabled = App.cart.length === 0;
}

function selPay(el, pay) {
  document.querySelectorAll('.pm').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  App.selectedPay = pay;
}

function updateCartTime() {
  const el = document.getElementById('cartTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const bno = document.getElementById('cartBillNo');
  if (bno) bno.textContent = `Bill #${App.billCounter}`;
}

async function doCheckout() {
  if (!App.cart.length) return;
  const sub = App.cart.reduce((s, i) => s + i.qty * i.sale_price, 0);
  const vat = App.cart.some(i => i.vat_applicable) ? sub * 0.13 : 0;
  const total = sub + vat;
  const custEl = document.getElementById('cartCustomer');
  const custName = custEl ? custEl.options[custEl.selectedIndex].text : 'Walk-in';
  const custId = custEl ? parseInt(custEl.value) || 1 : 1;

  try {
    const saleData = {
      customer_id: custId,
      payment_method: App.selectedPay,
      paid_amount: App.selectedPay === 'khata' ? 0 : total,
      items: App.cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        unit_price: item.sale_price,
        vat_applicable: item.vat_applicable,
        discount: 0
      }))
    };
    const result = await Http.post('/sales', saleData);
    const invoiceNo = result?.invoice_number || `MMN-${App.billCounter}`;

    // Show success modal
    document.getElementById('modalAmt').textContent = fmtNPR(total);
    document.getElementById('modalPay').textContent = App.selectedPay;
    document.getElementById('modalInvoiceNo').textContent = invoiceNo;
    document.getElementById('modalDetail').innerHTML = `
      <div class="inv-detail-row"><span>Invoice #</span><span style="font-weight:700">${invoiceNo}</span></div>
      <div class="inv-detail-row"><span>Subtotal</span><span>${fmtNPR(sub)}</span></div>
      <div class="inv-detail-row"><span>VAT (13%)</span><span>${fmtNPR(vat)}</span></div>
      <div class="inv-detail-row"><span>Customer</span><span>${custName}</span></div>
      <div class="inv-detail-row"><span>Payment</span><span>${App.selectedPay.toUpperCase()}</span></div>
      <div class="inv-detail-row"><span>Items</span><span>${App.cart.length} product(s)</span></div>
      <div class="inv-detail-row" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">
        <span style="font-weight:700">Total Paid</span>
        <span style="color:var(--green);font-weight:800">${fmtNPR(total)}</span>
      </div>
    `;
    openModal('successModal');
    App.billCounter++;
    App.cart = [];
    renderCart();
  } catch (err) {
    showToast('Sale failed: ' + err.message, '❌');
  }
}

// ─── INVENTORY ────────────────────────────────────────────────
async function loadInventory() {
  try {
    const [batches, movements] = await Promise.all([
      Http.get('/inventory/batches' + branchParam()),
      Http.get('/inventory/movements' + branchParam()),
    ]);
    renderInventoryBatches(batches || getMockBatches());
    renderMovements(movements || getMockMovements());
  } catch {
    renderInventoryBatches(getMockBatches());
    renderMovements(getMockMovements());
  }
}

function getMockBatches() {
  return [
    {product_name:'Broiler Chicken',emoji:'🐔',batch_code:'B0035',current_qty:4.5,purchase_qty:20,unit:'kg',computed_freshness:'fresh',proc:'Apr 18',expiry_date:'2026-04-20',is_low:true,crit:true,warn:false,branch_name:'Baneshwor'},
    {product_name:'Mutton',emoji:'🐑',batch_code:'B0034',current_qty:8,purchase_qty:15,unit:'kg',computed_freshness:'expiring',expiry_date:'2026-04-20',is_low:false,crit:false,warn:true,branch_name:'Baneshwor'},
    {product_name:'Duck',emoji:'🦆',batch_code:'B0033',current_qty:10,purchase_qty:10,unit:'kg',computed_freshness:'fresh',expiry_date:'2026-04-21',is_low:false,crit:false,warn:false,branch_name:'Baneshwor'},
    {product_name:'Farm Chicken',emoji:'🐓',batch_code:'B0032',current_qty:12,purchase_qty:15,unit:'kg',computed_freshness:'fresh',expiry_date:'2026-04-22',is_low:false,crit:false,warn:false,branch_name:'Baneshwor'},
    {product_name:'Goat Meat',emoji:'🐐',batch_code:'B0031',current_qty:5.5,purchase_qty:10,unit:'kg',computed_freshness:'fresh',expiry_date:'2026-04-21',is_low:false,crit:false,warn:false,branch_name:'Baneshwor'},
    {product_name:'Eggs',emoji:'🥚',batch_code:'B0030',current_qty:240,purchase_qty:300,unit:'pcs',computed_freshness:'fresh',expiry_date:'2026-04-25',is_low:false,crit:false,warn:false,branch_name:'Baneshwor'},
  ];
}

function getMockMovements() {
  return [
    {emoji:'🐔',product_name:'Broiler Chicken',batch_code:'B0035',movement_type:'purchase_in',quantity:20,created_at:new Date(),created_by_name:'Gopal Rai',branch_name:'Baneshwor'},
    {emoji:'🐑',product_name:'Mutton',batch_code:'B0034',movement_type:'sale_out',quantity:-1.5,created_at:new Date(),created_by_name:'POS Auto',branch_name:'Baneshwor'},
    {emoji:'🐑',product_name:'Mutton',batch_code:'B0034',movement_type:'wastage',quantity:-0.3,created_at:new Date(Date.now()-3600000),created_by_name:'Gopal Rai',branch_name:'Baneshwor'},
    {emoji:'🦆',product_name:'Duck',batch_code:'B0033',movement_type:'purchase_in',quantity:10,created_at:new Date(Date.now()-86400000),created_by_name:'Gopal Rai',branch_name:'Baneshwor'},
  ];
}

function renderInventoryBatches(batches) {
  const grid = document.getElementById('invGrid');
  if (!grid) return;
  grid.innerHTML = batches.map(item => {
    const pct = item.purchase_qty > 0 ? Math.min(100, Math.round((item.current_qty / item.purchase_qty) * 100)) : 0;
    const fc = item.computed_freshness === 'expiring' ? 'var(--amber)' : item.is_low ? 'var(--red)' : 'var(--green)';
    const tagClass = item.computed_freshness === 'expiring' ? 'pill-amber' : item.computed_freshness === 'expired' ? 'pill-red' : 'pill-green';
    const cardClass = item.crit ? 'crit' : item.warn ? 'warn' : '';
    return `
      <div class="inv-card ${cardClass}">
        <div class="inv-tag"><span class="pill ${tagClass}">${item.computed_freshness}</span></div>
        <div class="inv-prod">${item.emoji} ${item.product_name}</div>
        <div class="inv-batch">Batch #${item.batch_code} · ${item.branch_name || ''}</div>
        <div class="inv-qty-row"><span class="inv-qty">${item.current_qty}</span><span class="inv-unit">${item.unit}</span></div>
        <div class="stock-bg"><div class="stock-fill" style="width:${pct}%;background:${fc}"></div></div>
        <div class="inv-dates">
          <span>Proc: ${item.processing_date ? fmtDate(item.processing_date) : '—'}</span>
          <span>Exp: ${fmtDate(item.expiry_date)}</span>
        </div>
      </div>`;
  }).join('');
}

function renderMovements(movements) {
  const tbody = document.getElementById('movementsBody');
  if (!tbody) return;
  const typeConfig = {
    purchase_in:  { label: 'Purchase In',  cls: 'pill-green' },
    sale_out:     { label: 'Sale Out',     cls: 'pill-red' },
    wastage:      { label: 'Wastage',      cls: 'pill-amber' },
    transfer_in:  { label: 'Transfer In',  cls: 'pill-blue' },
    transfer_out: { label: 'Transfer Out', cls: 'pill-purple' },
    adjustment:   { label: 'Adjustment',   cls: 'pill-gray' },
  };
  tbody.innerHTML = movements.map(m => {
    const cfg = typeConfig[m.movement_type] || { label: m.movement_type, cls: 'pill-gray' };
    const qty = parseFloat(m.quantity);
    return `
      <tr>
        <td style="font-weight:700">#${m.batch_code || '—'}</td>
        <td>${m.emoji || ''} ${m.product_name}</td>
        <td><span class="pill ${cfg.cls}">${cfg.label}</span></td>
        <td style="color:${qty > 0 ? 'var(--green)' : 'var(--red2)'};font-weight:600">${qty > 0 ? '+' : ''}${qty} ${m.unit || 'kg'}</td>
        <td>${fmtDate(m.created_at)}</td>
        <td>${m.created_by_name || '—'}</td>
      </tr>`;
  }).join('');
}
