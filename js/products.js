// Products Management
async function getAllProducts() {
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
    request.onsuccess = () => {
      showToast('Product added!');
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function updateProduct(product) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const request = store.put(product);
    request.onsuccess = () => {
      showToast('Product updated!');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteProduct(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');
    const request = store.delete(id);
    request.onsuccess = () => {
      showToast('Product deleted!');
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function renderProducts() {
  const products = await getAllProducts();
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="card">
      <h3>📦 Product Management</h3>
      <div class="search-box">
        <input type="text" id="searchProduct" placeholder="🔍 Search by name or barcode...">
        <button id="addProductBtn" class="btn-primary" style="width: auto;">➕ Add</button>
      </div>
    </div>
    <div class="card">
      <div class="products-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Barcode</th>
              <th>Actions</th>
             </tr>
          </thead>
          <tbody id="productsList"></tbody>
        </table>
      </div>
    </div>
  `;
  
  function renderList(filteredProducts) {
    const tbody = document.getElementById('productsList');
    if (filteredProducts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No products found</td></tr>';
      return;
    }
    
    tbody.innerHTML = filteredProducts.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.quantity} ${p.quantity <= 5 ? '<span class="low-stock">Low!</span>' : ''}</td>
        <td>${p.barcode || '-'}</td>
        <td>
          <button class="btn-icon edit-product" data-id="${p.id}">✏️</button>
          <button class="btn-icon delete-product" data-id="${p.id}">🗑️</button>
        </td>
      </tr>
    `).join('');
    
    document.querySelectorAll('.edit-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === id);
        if (product) await editProductDialog(product);
      });
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this product?')) {
          await deleteProduct(parseInt(btn.dataset.id));
          renderProducts();
        }
      });
    });
  }
  
  renderList(products);
  
  document.getElementById('searchProduct').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
    renderList(filtered);
  });
  
  document.getElementById('addProductBtn').addEventListener('click', () => addProductDialog());
}

async function addProductDialog() {
  const name = prompt('Product name:');
  if (!name) return;
  
  const price = parseFloat(prompt('Price:'));
  if (isNaN(price)) return;
  
  const quantity = parseInt(prompt('Quantity:'));
  if (isNaN(quantity)) return;
  
  const barcode = prompt('Barcode (optional):') || '';
  
  await addProduct({
    name,
    price,
    quantity,
    barcode,
    created_at: new Date().toISOString()
  });
  
  renderProducts();
}

async function editProductDialog(product) {
  const name = prompt('Product name:', product.name);
  if (!name) return;
  
  const price = parseFloat(prompt('Price:', product.price));
  if (isNaN(price)) return;
  
  const quantity = parseInt(prompt('Quantity:', product.quantity));
  if (isNaN(quantity)) return;
  
  const barcode = prompt('Barcode:', product.barcode || '');
  
  await updateProduct({
    ...product,
    name,
    price,
    quantity,
    barcode
  });
  
  renderProducts();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
