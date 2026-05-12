// POS System
let currentCart = [];

async function renderPOS() {
  const products = await getAllProducts();
  const content = document.getElementById('pageContent');
  
  content.innerHTML = `
    <div class="card">
      <h3>💰 Point of Sale</h3>
      <div class="search-box">
        <input type="text" id="posSearch" placeholder="🔍 Search product by name or barcode...">
      </div>
      <div id="searchResults"></div>
    </div>
    <div class="card">
      <h3>🛒 Current Cart</h3>
      <div id="cartItems"></div>
      <div class="flex-between">
        <strong>Total:</strong>
        <span class="cart-total" id="cartTotal">$0.00</span>
      </div>
      <button id="completeSaleBtn" class="btn-primary">✅ Complete Sale</button>
    </div>
  `;
  
  function updateCart() {
    const cartDiv = document.getElementById('cartItems');
    let total = 0;
    
    if (currentCart.length === 0) {
      cartDiv.innerHTML = '<p style="color: #6b7a8a;">Cart is empty</p>';
    } else {
      cartDiv.innerHTML = currentCart.map((item, idx) => {
        total += item.price * item.quantity;
        return `
          <div class="cart-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div>$${item.price} x ${item.quantity}</div>
            </div>
            <div>
              <span style="font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</span>
              <button class="btn-icon remove-from-cart" data-idx="${idx}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    document.getElementById('cartTotal').innerText = `$${total.toFixed(2)}`;
    
    document.querySelectorAll('.remove-from-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        currentCart.splice(idx, 1);
        updateCart();
      });
    });
  }
  
  function searchProducts() {
    const term = document.getElementById('posSearch').value.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.barcode && p.barcode.includes(term))
    );
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = filtered.map(p => `
      <div class="product-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div>$${p.price} | Stock: ${p.quantity}</div>
        </div>
        <button class="btn-secondary add-to-cart" 
          data-id="${p.id}"
          data-name="${p.name}"
          data-price="${p.price}"
          data-stock="${p.quantity}">
          ➕ Add
        </button>
      </div>
    `).join('');
    
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const stock = parseInt(btn.dataset.stock);
        
        const existing = currentCart.find(item => item.id === id);
        if (existing) {
          if (existing.quantity + 1 <= stock) {
            existing.quantity++;
          } else {
            showToast('Not enough stock!');
            return;
          }
        } else {
          if (stock > 0) {
            currentCart.push({ id, name, price, quantity: 1 });
          } else {
            showToast('Out of stock!');
            return;
          }
        }
        updateCart();
        showToast(`Added ${name}`);
      });
    });
  }
  
  document.getElementById('posSearch').addEventListener('input', searchProducts);
  searchProducts();
  updateCart();
  
  document.getElementById('completeSaleBtn').addEventListener('click', async () => {
    if (currentCart.length === 0) {
      showToast('Cart is empty!');
      return;
    }
    
    const total = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create sale record
    const saleId = await createSale(total);
    
    // Update inventory
    for (const item of currentCart) {
      const product = products.find(p => p.id === item.id);
      if (product) {
        product.quantity -= item.quantity;
        await updateProduct(product);
      }
      await addSaleItem(saleId, item.id, item.quantity, item.price);
    }
    
    showToast(`Sale complete! Total: $${total.toFixed(2)}`);
    currentCart = [];
    renderPOS();
  });
}

async function createSale(total) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sales'], 'readwrite');
    const store = transaction.objectStore('sales');
    const request = store.add({
      total,
      created_at: new Date().toISOString()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addSaleItem(saleId, productId, quantity, price) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sale_items'], 'readwrite');
    const store = transaction.objectStore('sale_items');
    const request = store.add({
      sale_id: saleId,
      product_id: productId,
      quantity,
      price
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
