// ================================================================
// MEAT MART NEPAL — App Core (State, Nav, UI)
// ================================================================

// ─── APP STATE ────────────────────────────────────────────────
const App = {
  currentPage: 'dashboard',
  cart: [],
  selectedPay: 'cash',
  activeCat: 'all',
  mockProducts: [
    {id:1,name:'Broiler Chicken',category_slug:'chicken',emoji:'🐔',sale_price:450,unit:'kg',stock:4.5,sku:'CHK-BRL-01',cuts:['Curry Cut','Boneless','With Skin','Mince'],vat_applicable:true,is_low:true},
    {id:2,name:'Farm Chicken',category_slug:'chicken',emoji:'🐓',sale_price:520,unit:'kg',stock:12,sku:'CHK-FRM-02',cuts:['Whole','Curry Cut','Boneless'],vat_applicable:true,is_low:false},
    {id:3,name:'Mutton',category_slug:'mutton',emoji:'🐑',sale_price:900,unit:'kg',stock:8,sku:'MTN-REG-01',cuts:['Curry Cut','Boneless','Ribs','Mince'],vat_applicable:true,is_low:false},
    {id:4,name:'Goat Meat',category_slug:'mutton',emoji:'🐐',sale_price:850,unit:'kg',stock:5.5,sku:'GMT-REG-01',cuts:['Curry Cut','Whole','Ribs'],vat_applicable:true,is_low:false},
    {id:5,name:'Duck',category_slug:'duck',emoji:'🦆',sale_price:800,unit:'kg',stock:10,sku:'DCK-REG-01',cuts:['Whole','Curry Cut','Boneless'],vat_applicable:true,is_low:false},
    {id:6,name:'Eggs',category_slug:'egg',emoji:'🥚',sale_price:15,unit:'piece',stock:240,sku:'EGG-REG-01',cuts:[],vat_applicable:false,is_low:false},
    {id:7,name:'Egg Tray (30)',category_slug:'egg',emoji:'🍳',sale_price:165,unit:'tray',stock:8,sku:'EGG-TRY-01',cuts:[],vat_applicable:false,is_low:false},
    {id:8,name:'Pig Meat',category_slug:'other',emoji:'🐷',sale_price:650,unit:'kg',stock:6,sku:'PIG-REG-01',cuts:['Curry Cut','Boneless'],vat_applicable:true,is_low:false},
  ],
  products: [],
  billCounter: 1043,
};

// ─── OFFLINE DETECTION ────────────────────────────────────────
window.addEventListener('online',  () => document.getElementById('offlineBadge')?.classList.remove('show'));
window.addEventListener('offline', () => document.getElementById('offlineBadge')?.classList.add('show'));
if (!navigator.onLine) document.getElementById('offlineBadge')?.classList.add('show');

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, icon = '✅') {
  clearTimeout(toastTimer);
  const t = document.getElementById('toastEl');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── MODAL ────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ─── NAVIGATION ───────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard', pos: 'POS / Billing',
  inventory: 'Inventory', products: 'Products',
  purchases: 'Purchases', customers: 'Customers',
  khata: 'Khata Ledger', expenses: 'Expenses',
  reports: 'Reports', alerts: 'Alerts',
  branches: 'Branches', employees: 'Employees',
  settings: 'Settings'
};

function navigate(id) {
  if (App.currentPage === id) return;
  App.currentPage = id;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-page="${id}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('topbarTitle').textContent = PAGE_TITLES[id] || id;

  // Load data for page
  switch(id) {
    case 'dashboard': loadDashboard(); break;
    case 'pos': loadPosProducts(); break;
    case 'inventory': loadInventory(); break;
    case 'products': loadProducts(); break;
    case 'customers': loadCustomers(); break;
    case 'expenses': loadExpenses(); break;
    case 'reports': loadReports(); break;
    case 'alerts': loadAlerts(); break;
    case 'branches': loadBranches(); break;
    case 'settings': loadSettings(); break;
  }
}

// ─── BRANCH SWITCHER ──────────────────────────────────────────
function initBranchSwitcher() {
  const user = Auth.getUser();
  const branches = Auth.getBranches();
  const activeBranch = Auth.getActiveBranch();

  const sbBranch = document.getElementById('sbBranch');
  const branchName = document.getElementById('sbBranchName');
  const dropdown = document.getElementById('branchDropdown');

  // Non-admin sees only their branch, no switcher
  if (!Auth.isAdmin() || branches.length === 0) {
    if (branchName) branchName.textContent = activeBranch?.name || user?.branch_name || 'Branch';
    if (sbBranch) sbBranch.style.cursor = 'default';
    return;
  }

  if (branchName) branchName.textContent = activeBranch?.name || 'All Branches';

  // Build dropdown
  if (dropdown) {
    const opts = [
      { id: null, name: 'All Branches', is_active: true }, // admin can see all
      ...branches.filter(b => !b.is_warehouse)
    ];

    dropdown.innerHTML = opts.map(b => `
      <div class="branch-opt ${activeBranch?.id === b.id ? 'active' : ''}" onclick="switchBranch(${JSON.stringify(b).replace(/"/g,"'")})">
        <span class="bo-dot" style="background:${b.is_active !== false ? 'var(--green)' : 'var(--text3)'}"></span>
        <span>${b.name}</span>
        <span class="bo-rev">${b.today_revenue ? 'NPR ' + parseInt(b.today_revenue).toLocaleString() : ''}</span>
      </div>
    `).join('');
  }

  // Toggle dropdown
  if (sbBranch) {
    sbBranch.addEventListener('click', (e) => {
      e.stopPropagation();
      sbBranch.classList.toggle('open');
      dropdown?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      sbBranch.classList.remove('open');
      dropdown?.classList.remove('open');
    });
  }
}

function switchBranch(branch) {
  const parsed = typeof branch === 'string' ? JSON.parse(branch.replace(/'/g, '"')) : branch;
  Auth.setActiveBranch(parsed.id ? parsed : null);
  document.getElementById('sbBranchName').textContent = parsed.id ? parsed.name : 'All Branches';
  document.getElementById('branchDropdown')?.classList.remove('open');
  document.getElementById('sbBranch')?.classList.remove('open');

  // Update topbar branch display
  updateTopbarBranch();
  showToast(`Switched to ${parsed.name || 'All Branches'}`, '🏪');

  // Reload current page
  navigate(App.currentPage);
}

function updateTopbarBranch() {
  const ab = Auth.getActiveBranch();
  const el = document.getElementById('topbarBranch');
  if (el) el.textContent = ab ? ab.name : 'All Branches';
}

// ─── USER DISPLAY ─────────────────────────────────────────────
function initUserDisplay() {
  const user = Auth.getUser();
  if (!user) return;

  const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAv').textContent = initials;
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  // Show admin-only nav items
  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────
async function logout() {
  try {
    await Http.post('/auth/logout', { refreshToken: Auth.getRefreshToken() });
  } catch {}
  Auth.clear();
  window.location.reload();
}

// ─── FORMAT HELPERS ───────────────────────────────────────────
function fmtNPR(v)    { return 'NPR ' + parseFloat(v || 0).toLocaleString('en-IN', {maximumFractionDigits: 0}); }
function fmtDate(d)   { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}); }
function fmtTime(d)   { if (!d) return '—'; return new Date(d).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}); }
function timeAgo(d)   {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}
function pillClass(status) {
  const map = {paid:'green',due:'red',partial:'amber',fresh:'green',expiring:'amber',expired:'red',
                active:'green',inactive:'gray',open:'green',closed:'gray',pending:'amber',
                received:'green',approved:'green',rejected:'red',critical:'red',warning:'amber',info:'blue'};
  return 'pill pill-' + (map[status?.toLowerCase()] || 'gray');
}

// ─── CLICK OUTSIDE NAV ────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});
