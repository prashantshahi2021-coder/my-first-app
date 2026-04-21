// Meat Mart Nepal - Pages 2
async function loadProducts() {
  try { renderProductsTable(await Http.get('/products') || App.mockProducts); }
  catch { renderProductsTable(App.mockProducts); }
}
function renderProductsTable(products) {
  var tbody = document.getElementById('prodTableBody'); if (!tbody) return;
  tbody.innerHTML = products.map(function(p) {
    var cuts = p.cuts || []; var cutStr = cuts.length ? cuts.slice(0,2).join(', ') + (cuts.length > 2 ? ' +' + (cuts.length-2) : '') : '—';
    return '<tr><td><span style="font-size:16px">' + p.emoji + '</span> <strong>' + p.name + '</strong></td>' +
      '<td>' + (p.category_name || p.category_slug || '—') + '</td>' +
      '<td style="font-family:monospace;font-size:11px;color:var(--text3)">' + (p.sku || '—') + '</td>' +
      '<td style="font-size:11px;color:var(--text2)">' + cutStr + '</td><td>' + p.unit + '</td>' +
      '<td><strong style="color:var(--green)">' + fmtNPR(p.sale_price) + '</strong></td>' +
      '<td style="color:var(--text3)">' + fmtNPR(p.purchase_cost || p.sale_price * 0.8) + '</td>' +
      '<td><span class="pill ' + (p.vat_applicable ? 'pill-amber' : 'pill-green') + '">' + (p.vat_applicable ? '13%' : '0%') + '</span></td>' +
      '<td><span class="pill ' + (p.is_active !== false ? 'pill-green' : 'pill-red') + '">' + (p.is_active !== false ? 'Active' : 'Inactive') + '</span></td></tr>';
  }).join('');
}
async function saveNewProduct() {
  var name = document.getElementById('newProdName').value.trim();
  if (!name) { showToast('Product name required','⚠️'); return; }
  var catId = parseInt(document.getElementById('newProdCatId').value);
  var emojiMap = {1:'🐔',2:'🐑',3:'🦆',4:'🥚',5:'🍖'};
  var catMap = {1:'chicken',2:'mutton',3:'duck',4:'egg',5:'other'};
  var data = { name: name, category_id: catId, unit: document.getElementById('newProdUnit').value,
    sale_price: parseFloat(document.getElementById('newProdPrice').value) || 0,
    purchase_cost: parseFloat(document.getElementById('newProdCost').value) || 0,
    vat_applicable: document.getElementById('newProdVat').value === 'yes',
    low_stock_threshold: parseFloat(document.getElementById('newProdThresh').value) || 5,
    cuts: (document.getElementById('newProdCuts').value || '').split(',').map(function(c){return c.trim();}).filter(Boolean) };
  try { await Http.post('/products', data); } catch {}
  App.mockProducts.push(Object.assign({}, data, {id: App.mockProducts.length+1, emoji: emojiMap[catId]||'🥩', category_slug: catMap[catId]||'other', is_low:false, is_active:true}));
  showToast(name + ' added!','✅'); closeModal('addProdModal'); loadProducts();
  ['newProdName','newProdPrice','newProdCost','newProdCuts'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
}
var MOCK_CUSTOMERS = [
  {id:2,name:'Hotel Shivam',customer_type:'hotel',total_due:4800,last_purchase_date:new Date(),phone:'9841-234567'},
  {id:3,name:'Hotel Mount View',customer_type:'hotel',total_due:3200,last_purchase_date:new Date(Date.now()-86400000),phone:'9851-345678'},
  {id:4,name:'Rajan Thapa',customer_type:'household',total_due:2400,last_purchase_date:new Date(),phone:'9800-111222'},
  {id:5,name:'Krishna Prasad',customer_type:'wholesale',total_due:2000,last_purchase_date:new Date(Date.now()-172800000),phone:'9812-567890'},
  {id:6,name:'Sita Sharma',customer_type:'household',total_due:0,last_purchase_date:new Date(),phone:'9845-678901'},
  {id:7,name:'Bina Rai',customer_type:'retail',total_due:0,last_purchase_date:new Date(Date.now()-259200000),phone:'9860-789012'}
];
async function loadCustomers() {
  var customers; try { customers = await Http.get('/customers' + branchParam()) || MOCK_CUSTOMERS; } catch { customers = MOCK_CUSTOMERS; }
  renderCustomerList(customers);
  var total = customers.reduce(function(s,c){return s+parseFloat(c.total_due||0);},0);
  setEl('custTotalDue', fmtNPR(total)); setEl('custWithDue', customers.filter(function(c){return c.total_due>0;}).length);
}
function renderCustomerList(customers) {
  var el = document.getElementById('custList'); if (!el) return;
  var typeColors = {hotel:'var(--purple)',wholesale:'var(--cyan)',household:'var(--blue)',retail:'var(--text2)'};
  el.innerHTML = customers.map(function(c) {
    var init = c.name.split(' ').map(function(n){return n[0];}).join('').toUpperCase().slice(0,2);
    var col = c.total_due > 0 ? 'var(--red2)' : 'var(--green)'; var bg = c.total_due > 0 ? 'var(--red-bg2)' : 'var(--green-bg)';
    var tl = (c.customer_type||'retail'); var td = tl.charAt(0).toUpperCase()+tl.slice(1);
    return '<div class="cust-row"><div class="cust-av" style="background:'+bg+';color:'+col+'">'+init+'</div>' +
      '<div style="flex:1"><div class="cust-name">'+c.name+'</div>' +
      '<div class="cust-meta" style="color:'+(typeColors[c.customer_type]||'var(--text3)')+'">'+td+' · '+(c.phone||'No phone')+' · Last: '+(c.last_purchase_date?fmtDate(c.last_purchase_date):'Never')+'</div></div>' +
      '<div><div class="cust-due-amt" style="color:'+col+'">'+(c.total_due>0?fmtNPR(c.total_due):'✓ Clear')+'</div>' +
      '<div class="cust-due-lbl">'+(c.total_due>0?'outstanding':'no due')+'</div></div></div>';
  }).join('');
}
async function loadExpenses() {
  var data; try { data = await Http.get('/expenses' + branchParam()); } catch {}
  renderExpensesTable((data&&data.expenses)||getMockExpenses()); renderExpenseStats((data&&data.category_stats)||[]);
}
function getMockExpenses(){return[{category_name:'Salary',branch_name:'Baneshwor',description:'Ram Kumar — Cashier salary April',amount:18000,payment_method:'bank',expense_date:'2026-04-18',created_by_name:'Admin'},{category_name:'Transport',branch_name:'Baneshwor',description:'Meat delivery from Kalimati',amount:800,payment_method:'cash',expense_date:'2026-04-18',created_by_name:'Manager'},{category_name:'Electricity',branch_name:'Baneshwor',description:'April NEA electricity bill',amount:3200,payment_method:'esewa',expense_date:'2026-04-17',created_by_name:'Manager'},{category_name:'Rent',branch_name:'Baneshwor',description:'Shop rent — Baneshwor Chowk',amount:15000,payment_method:'bank',expense_date:'2026-04-15',created_by_name:'Admin'},{category_name:'Miscellaneous',branch_name:'Baneshwor',description:'Cleaning supplies',amount:450,payment_method:'cash',expense_date:'2026-04-14',created_by_name:'Storekeeper'}];}
function renderExpensesTable(expenses) {
  var tbody = document.getElementById('expensesBody'); if (!tbody) return;
  tbody.innerHTML = expenses.map(function(e){return '<tr><td>'+fmtDate(e.expense_date)+'</td><td><span class="pill pill-amber">'+e.category_name+'</span></td><td>'+e.description+'</td><td style="font-weight:700">'+fmtNPR(e.amount)+'</td><td><span class="pill pill-blue">'+e.payment_method+'</span></td><td>'+(e.branch_name||'—')+'</td><td style="color:var(--text3)">'+(e.created_by_name||'—')+'</td></tr>';}).join('');
  setEl('expTotal', fmtNPR(expenses.reduce(function(s,e){return s+parseFloat(e.amount);},0)));
}
function renderExpenseStats(stats) {
  var el = document.getElementById('expenseCatBars'); if (!el) return;
  if (!stats.length) stats = [{category:'Salary',total:45000},{category:'Rent',total:15000},{category:'Electricity',total:3200},{category:'Transport',total:800},{category:'Misc',total:450}];
  var max = Math.max.apply(null, stats.map(function(s){return parseFloat(s.total);})) || 1;
  el.innerHTML = stats.slice(0,5).map(function(s){var pct=Math.round((parseFloat(s.total)/max)*100);return '<div class="mb1"><div class="prog-row"><span>'+s.category+'</span><strong>'+fmtNPR(s.total)+'</strong></div><div class="prog-bar"><div class="prog-fill" style="width:'+pct+'%;background:var(--amber)"></div></div></div>';}).join('');
}
async function loadReports() {
  var period = document.getElementById('reportPeriod') ? document.getElementById('reportPeriod').value : 'month';
  var bp = branchParam() ? '&' + branchParam().slice(1) : '';
  var data; try { data = await Http.get('/reports/sales?period=' + period + bp); } catch {}
  renderReports(data || getMockReportData());
}
function getMockReportData(){return {summary:{revenue:842500,bills:843,avg_bill:999},by_product:[{name:'Broiler Chicken',emoji:'🐔',qty_sold:'820',revenue:369000},{name:'Mutton',emoji:'🐑',qty_sold:'240',revenue:216000},{name:'Duck',emoji:'🦆',qty_sold:'95',revenue:76000},{name:'Eggs',emoji:'🥚',qty_sold:'1200',revenue:18000}],by_payment:[{payment_method:'cash',count:412,total:380000},{payment_method:'khalti',count:180,total:210000},{payment_method:'bank',count:120,total:180000},{payment_method:'khata',count:80,total:52500}],wastage:{total_qty:42,total_loss:12600},purchases:{total:630500},expenses:{total:68400}};}
function renderReports(data) {
  setEl('rRevenue',fmtNPR(data.summary.revenue)); setEl('rBills',(data.summary.bills||'—')+' bills');
  var profit = parseFloat(data.summary.revenue)-parseFloat((data.purchases&&data.purchases.total)||0)-parseFloat((data.expenses&&data.expenses.total)||0)-parseFloat((data.wastage&&data.wastage.total_loss)||0);
  setEl('rProfit',fmtNPR(profit)); setEl('rWastage',((data.wastage&&data.wastage.total_qty)||0)+' kg'); setEl('rWastageLoss',fmtNPR((data.wastage&&data.wastage.total_loss)||0)+' loss value'); setEl('rPurchases',fmtNPR((data.purchases&&data.purchases.total)||0));
  var prodEl = document.getElementById('topProductsBars');
  if (prodEl&&data.by_product&&data.by_product.length){var maxP=Math.max.apply(null,data.by_product.map(function(p){return parseFloat(p.revenue);}));prodEl.innerHTML=data.by_product.map(function(p){var pct=Math.round((parseFloat(p.revenue)/maxP)*100);return '<div class="mb1"><div class="prog-row"><span>'+p.emoji+' '+p.name+' ('+p.qty_sold+' sold)</span><strong>'+fmtNPR(p.revenue)+'</strong></div><div class="prog-bar"><div class="prog-fill" style="width:'+pct+'%;background:var(--red)"></div></div></div>';}).join('');}
  var payEl = document.getElementById('paymentBreakdown');
  if (payEl&&data.by_payment&&data.by_payment.length){payEl.innerHTML='<table style="width:100%"><thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead><tbody>'+data.by_payment.map(function(p){return '<tr><td><span class="pill pill-blue">'+p.payment_method+'</span></td><td>'+p.count+'</td><td style="font-weight:700">'+fmtNPR(p.total)+'</td></tr>';}).join('')+'</tbody></table>';}
}
async function loadAlerts() {
  var alerts; try { alerts = await Http.get('/alerts' + branchParam()) || getMockAlerts(); } catch { alerts = getMockAlerts(); }
  renderAlerts(alerts);
}
function getMockAlerts(){return[{id:1,alert_type:'low_stock',severity:'critical',title:'Broiler Chicken — Low Stock',message:'Only 4.5 kg remaining. Order immediately.',branch_name:'Baneshwor',is_read:false,created_at:new Date()},{id:2,alert_type:'near_expiry',severity:'warning',title:'Mutton Batch #B0034 — Near Expiry',message:'Expires Apr 20. 8 kg remaining.',branch_name:'Baneshwor',is_read:false,created_at:new Date(Date.now()-3600000)},{id:3,alert_type:'khata_due',severity:'warning',title:'Hotel Shivam — Overdue Khata',message:'NPR 4,800 overdue since Apr 10.',branch_name:'Baneshwor',is_read:false,created_at:new Date(Date.now()-28800000)}];}
function renderAlerts(alerts) {
  var crit = alerts.filter(function(a){return a.severity==='critical'&&!a.is_read;}); var warn = alerts.filter(function(a){return a.severity!=='critical'&&!a.is_read;});
  setEl('critCount',crit.length); setEl('warnCount',warn.length);
  function makeHTML(items){if(!items.length)return '<div style="padding:10px;color:var(--text3);font-size:12px">No alerts</div>';return items.map(function(a){var dc=a.severity==='critical'?'var(--red)':a.severity==='warning'?'var(--amber)':'var(--blue)';return '<div class="alert-item" onclick="markAlertRead('+a.id+')"><div class="ai-dot" style="background:'+dc+'"></div><div style="flex:1"><div class="ai-title">'+a.title+'</div><div class="ai-sub">'+(a.message||'')+' · '+(a.branch_name||'')+'</div></div><div class="ai-time">'+timeAgo(a.created_at)+'</div></div>';}).join('');}
  setInner('criticalAlerts',makeHTML(crit)); setInner('warningAlerts',makeHTML(warn));
  var hb = document.getElementById('alertHistoryBody');
  if (hb) hb.innerHTML = alerts.slice(0,20).map(function(a){var tc=a.alert_type.indexOf('stock')!==-1?'pill-red':a.alert_type.indexOf('expiry')!==-1?'pill-amber':'pill-blue';return '<tr><td><span class="pill '+tc+'">'+a.alert_type.replace('_',' ')+'</span></td><td>'+a.title+'</td><td>'+(a.branch_name||'—')+'</td><td>'+fmtTime(a.created_at)+'</td><td><span class="pill '+(a.is_read?'pill-green':'pill-amber')+'">'+(a.is_read?'Resolved':'Open')+'</span></td></tr>';}).join('');
}
async function markAlertRead(id) { try{await Http.put('/alerts/'+id+'/read');}catch{} showToast('Alert read','✅'); loadAlerts(); }
async function loadBranches() {
  var branches; try { branches = await Http.get('/branches') || getMockBranches(); } catch { branches = getMockBranches(); }
  renderBranches(branches);
}
function getMockBranches(){return[{id:2,name:'Baneshwor',address:'Baneshwor Chowk, Kathmandu',phone:'01-4234567',manager_name:'Sushil Thapa',is_active:true,today_revenue:48250,today_bills:34,active_alerts:3},{id:3,name:'Kalanki',address:'Kalanki Chowk, Kathmandu',phone:'01-4298765',manager_name:'Binod Karki',is_active:true,today_revenue:35100,today_bills:28,active_alerts:1},{id:4,name:'Patan',address:'Mangal Bazar, Lalitpur',phone:'01-5522334',manager_name:'Laxmi Shrestha',is_active:true,today_revenue:28900,today_bills:22,active_alerts:0}];}
function renderBranches(branches) {
  var grid = document.getElementById('branchesGrid'); if (!grid) return;
  var colors = ['var(--green)','var(--blue)','var(--purple)','var(--cyan)'];
  grid.innerHTML = branches.filter(function(b){return !b.is_warehouse;}).map(function(b,i){
    return '<div class="branch-card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><div class="bc-name">'+b.name+'</div><span class="pill '+(b.is_active?'pill-green':'pill-red')+'">'+(b.is_active?'Active':'Inactive')+'</span></div><div class="bc-addr">📍 '+(b.address||'—')+' · 📞 '+(b.phone||'—')+'</div><div class="bc-stats"><div class="bc-stat"><div class="bc-stat-lbl">Today Revenue</div><div class="bc-stat-val" style="color:'+colors[i%4]+'">'+fmtNPR(b.today_revenue||0)+'</div></div><div class="bc-stat"><div class="bc-stat-lbl">Manager</div><div class="bc-stat-val">'+(b.manager_name||'—')+'</div></div><div class="bc-stat"><div class="bc-stat-lbl">Bills Today</div><div class="bc-stat-val">'+(b.today_bills||0)+'</div></div><div class="bc-stat"><div class="bc-stat-lbl">Alerts</div><div class="bc-stat-val" style="color:'+(b.active_alerts>0?'var(--red2)':'var(--green)')+'">'+(b.active_alerts||0)+' '+(b.active_alerts>0?'⚠':'✓')+'</div></div></div></div>';
  }).join('');
}
async function loadSettings() {
  var users; try { users = await Http.get('/users') || getMockUsers(); } catch { users = getMockUsers(); }
  renderUsersTable(users);
}
function getMockUsers(){return[{full_name:'Prashant (You)',email:'admin@meatmart.np',role_name:'admin',branch_name:'All Branches',is_active:true,last_login:new Date()},{full_name:'Sushil Thapa',email:'sushil@meatmart.np',role_name:'manager',branch_name:'Baneshwor',is_active:true,last_login:new Date()},{full_name:'Ram Kumar',email:'ram@meatmart.np',role_name:'cashier',branch_name:'Baneshwor',is_active:true,last_login:new Date()},{full_name:'Gopal Rai',email:'gopal@meatmart.np',role_name:'storekeeper',branch_name:'Kalanki',is_active:true,last_login:new Date()}];}
function renderUsersTable(users) {
  var tbody = document.getElementById('usersBody'); if (!tbody) return;
  var rc = {admin:'pill-red',manager:'pill-blue',cashier:'pill-amber',storekeeper:'pill-cyan'};
  tbody.innerHTML = users.map(function(u){return '<tr><td><strong>'+u.full_name+'</strong></td><td style="color:var(--text3)">'+u.email+'</td><td><span class="pill '+(rc[u.role_name]||'pill-gray')+'">'+u.role_name+'</span></td><td>'+(u.branch_name||'All')+'</td><td style="color:var(--text3)">'+(u.last_login?fmtTime(u.last_login):'Never')+'</td><td><span class="pill '+(u.is_active?'pill-green':'pill-red')+'">'+(u.is_active?'Active':'Inactive')+'</span></td></tr>';}).join('');
}
function setEl(id,text){var el=document.getElementById(id);if(el)el.textContent=text;}
function setInner(id,html){var el=document.getElementById(id);if(el)el.innerHTML=html;}
