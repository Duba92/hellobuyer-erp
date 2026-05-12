// Supabase Configuration (REPLACE WITH YOUR KEYS)
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let supabase = null;
let currentUser = null;
let db = null;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HelloBuyerDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
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

// Helper functions
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
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
      renderProducts();
      break;
    case 'pos':
      renderPOS();
      break;
    case 'reports':
      renderReports();
      break;
  }
  
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-page="${page}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

// Login function
async function login(email, password) {
  // Demo login for offline use
  if (email === 'admin@hellobuyer.com' && password === 'admin123') {
    currentUser = { email, name: 'Admin' };
    localStorage.setItem('hellobuyer_user', JSON.stringify(currentUser));
    showToast('Login successful!');
    return true;
  }
  
  // Try Supabase if configured
  if (supabase && SUPABASE_URL !== 'https://your-project.supabase.co') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    });
    if (!error) {
      currentUser = data.user;
      localStorage.setItem('hellobuyer_user', JSON.stringify(currentUser));
      showToast('Login successful!');
      return true;
    }
  }
  
  showToast('Invalid credentials. Use admin@hellobuyer.com / admin123');
  return false;
}

// Check auth on load
function checkAuth() {
  const user = localStorage.getItem('hellobuyer_user');
  if (user) {
    currentUser = JSON.parse(user);
    return true;
  }
  return false;
}

// Logout
function logout() {
  localStorage.removeItem('hellobuyer_user');
  currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  showToast('Logged out');
}

// Initialize Supabase
function initSupabase() {
  if (SUPABASE_URL !== 'https://your-project.supabase.co') {
    supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  initSupabase();
  
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (await login(email, password)) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'block';
      renderDashboard();
      
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.page));
      });
      document.getElementById('logoutBtn').addEventListener('click', logout);
    }
  });
  
  if (checkAuth()) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    renderDashboard();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }
});
