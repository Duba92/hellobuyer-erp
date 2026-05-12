// Supabase Configuration (REPLACE WITH YOUR KEYS - Optional)
const SUPABASE_URL = 'https://drjknkqdgrwxyzlxdffp.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyamtua3FkZ3J3eHl6bHhkZmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDc2MTcsImV4cCI6MjA5NDE4MzYxN30.tsB5iskzJomNp2_5DOc1IEbSt2E1OpDgFoHYTUKz0fY';

let supabase = null;
let currentUser = null;
let db = null;

// Initialize IndexedDB with default data
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HelloBuyerDB', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      // Check if we need to seed data
      checkAndSeedData();
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        productStore.createIndex('name', 'name');
        productStore.createIndex('barcode', 'barcode');
      }
      if (!db.objectStoreNames.contains('sales')) {
        db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sale_items')) {
        db.createObjectStore('sale_items', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Seed default products if empty
async function checkAndSeedData() {
  const products = await getAllProducts();
  if (products.length === 0) {
    const defaultProducts = [
      { name: 'Fresh Milk 1L', price: 3.99, quantity: 50, barcode: '890123456789', created_at: new Date().toISOString() },
      { name: 'Wheat Bread', price: 2.49, quantity: 30, barcode: '890123456788', created_at: new Date().toISOString() },
      { name: 'Eggs (12pcs)', price: 4.29, quantity: 25, barcode: '890123456787', created_at: new Date().toISOString() },
      { name: 'White Rice 1kg', price: 5.99, quantity: 40, barcode: '890123456786', created_at: new Date().toISOString() },
      { name: 'Cooking Oil 1L', price: 7.49, quantity: 20, barcode: '890123456785', created_at: new Date().toISOString() },
      { name: 'Sugar 1kg', price: 1.99, quantity: 60, barcode: '890123456784', created_at: new Date().toISOString() },
      { name: 'Salt 500g', price: 0.99, quantity: 100, barcode: '890123456783', created_at: new Date().toISOString() },
      { name: 'Coffee 200g', price: 8.99, quantity: 15, barcode: '890123456782', created_at: new Date().toISOString() }
    ];
    
    for (const product of defaultProducts) {
      await addProduct(product);
    }
    console.log('Default products added!');
  }
}

// Helper functions
function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast hidden';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Navigation
function navigateTo(page) {
  const content = document.getElementById('pageContent');
  
  switch(page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'products':
      if (typeof renderProducts === 'function') {
        renderProducts();
      } else {
        content.innerHTML = '<div class="card"><h3>Loading products module...</h3></div>';
      }
      break;
    case 'pos':
      if (typeof renderPOS === 'function') {
        renderPOS();
      } else {
        content.innerHTML = '<div class="card"><h3>Loading POS module...</h3></div>';
      }
      break;
    case 'reports':
      if (typeof renderReports === 'function') {
        renderReports();
      } else {
        content.innerHTML = '<div class="card"><h3>Loading reports module...</h3></div>';
      }
      break;
  }
  
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-page="${page}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

// Render Dashboard
async function renderDashboard() {
  const products = await getAllProducts();
  const sales = await getSales();
  
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.quantity <= 5).length;
  
  // Calculate today's sales
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(sale => {
    const saleDate = sale.created_at ? sale.created_at.split('T')[0] : '';
    return saleDate === today;
  }).reduce((sum, sale) => sum + (sale.total || 0), 0);
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${totalProducts}</div>
        <div class="stat-label">Total Products</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">$${todaySales.toFixed(2)}</div>
        <div class="stat-label">Today's Sales</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${lowStock}</div>
        <div class="stat-label">Low Stock Items</div>
      </div>
    </div>
    <div class="card">
      <h3>⚡ Quick Actions</h3>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1rem;">
        <button id="quickPosBtn" class="btn-primary" style="width: auto;">💰 Make a Sale</button>
        <button id="quickProductBtn" class="btn-secondary" style="width: auto;">📦 Add Product</button>
      </div>
    </div>
    <div class="card">
      <h3>📊 Recent Activity</h3>
      <div id="recentSales">
        ${sales.slice(-5).reverse().map(sale => `
          <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
            <span>Sale #${sale.id}</span>
            <strong>$${sale.total.toFixed(2)}</strong>
            <span style="font-size: 0.8rem; color: #6b7a8a;">${new Date(sale.created_at).toLocaleDateString()}</span>
          </div>
        `).join('') || '<p>No sales yet. Start selling!</p>'}
      </div>
    </div>
  `;
  
  document.getElementById('quickPosBtn')?.addEventListener('click', () => navigateTo('pos'));
  document.getElementById('quickProductBtn')?.addEventListener('click', () => navigateTo('products'));
}

// Login function - FIXED
async function login(email, password) {
  // Hardcoded admin credentials for immediate use
  if (email === 'admin@hellobuyer.com' && password === 'admin123') {
    currentUser = { email, name: 'Admin' };
    localStorage.setItem('hellobuyer_user', JSON.stringify(currentUser));
    showToast('Login successful! Welcome to HelloBuyer ERP');
    return true;
  }
  
  // Alternative demo credentials
  if (email === 'demo@hellobuyer.com' && password === 'demo123') {
    currentUser = { email, name: 'Demo User' };
    localStorage.setItem('hellobuyer_user', JSON.stringify(currentUser));
    showToast('Login successful! (Demo mode)');
    return true;
  }
  
  // Try Supabase if configured (optional)
  if (supabase && SUPABASE_URL !== 'https://your-project.supabase.co') {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password
      });
      if (!error) {
        currentUser = data.user;
        localStorage.setItem('hellobuyer_user', JSON.stringify(currentUser));
        showToast('Login successful!');
        return true;
      }
    } catch(e) {
      console.log('Supabase not configured');
    }
  }
  
  showToast('Invalid credentials. Use: admin@hellobuyer.com / admin123');
  return false;
}

// Check auth on load
function checkAuth() {
  const user = localStorage.getItem('hellobuyer_user');
  if (user) {
    try {
      currentUser = JSON.parse(user);
      return true;
    } catch(e) {
      return false;
    }
  }
  return false;
}

// Logout
function logout() {
  localStorage.removeItem('hellobuyer_user');
  currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  showToast('Logged out successfully');
}

// Initialize Supabase (optional)
function initSupabase() {
  if (SUPABASE_URL !== 'https://your-project.supabase.co') {
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// Database helper functions
async function getAllProducts() {
  if (!db) return [];
  return new Promise((resolve) => {
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

async function addProduct(product) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const request = store.add(product);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateProduct(product) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const request = store.put(product);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getSales() {
  if (!db) return [];
  return new Promise((resolve) => {
    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

// Make functions available globally
window.getAllProducts = getAllProducts;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.getSales = getSales;
window.showToast = showToast;
window.navigateTo = navigateTo;

// Event listeners - FIXED initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing HelloBuyer ERP...');
  
  await initDB();
  initSupabase();
  
  // Setup login button
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      if (await login(email, password)) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        await renderDashboard();
        
        // Setup navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
          btn.removeEventListener('click', () => {});
          btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', logout);
        }
      }
    });
  }
  
  // Check if already logged in
  if (checkAuth()) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    await renderDashboard();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  }
  
  // Allow Enter key to login
  const passwordInput = document.getElementById('loginPassword');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('loginBtn').click();
      }
    });
  }
});
