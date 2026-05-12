// Reports System
async function renderReports() {
  const products = await getAllProducts();
  const sales = await getSales();
  const saleItems = await getSaleItems();
  
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalSales = sales.length;
  
  // Calculate best selling product
  const productSales = {};
  for (const item of saleItems) {
    productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
  }
  
  let bestProduct = null;
  let bestQuantity = 0;
  for (const [productId, qty] of Object.entries(productSales)) {
    if (qty > bestQuantity) {
      bestQuantity = qty;
      const product = products.find(p => p.id === parseInt(productId));
      bestProduct = product ? product.name : 'Unknown';
    }
  }
  
  // Daily sales
  const dailySales = {};
  for (const sale of sales) {
    const date = sale.created_at.split('T')[0];
    dailySales[date] = (dailySales[date] || 0) + sale.total;
  }
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card">
      <h3>📊 Sales Overview</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">$${totalRevenue.toFixed(2)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalSales}</div>
          <div class="stat-label">Total Sales</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${bestQuantity}</div>
          <div class="stat-label">Best Seller (${bestProduct || 'N/A'})</div>
        </div>
      </div>
    </div>
    <div class="card">
      <h3>📅 Daily Sales</h3>
      ${Object.entries(dailySales).map(([date, amount]) => `
        <div class="flex-between" style="padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0;">
          <span>${date}</span>
          <strong>$${amount.toFixed(2)}</strong>
        </div>
      `).join('') || '<p>No sales data yet</p>'}
    </div>
    <div class="card">
      <h3>🏆 Top Products</h3>
      ${Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0,5).map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id));
        return `
          <div class="flex-between" style="padding: 0.5rem 0;">
            <span>${product ? product.name : 'Unknown'}</span>
            <span>${qty} sold</span>
          </div>
        `;
      }).join('') || '<p>No sales data yet</p>'}
    </div>
  `;
}

async function getSales() {
  return new Promise((resolve) => {
    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

async function getSaleItems() {
  return new Promise((resolve) => {
    const transaction = db.transaction(['sale_items'], 'readonly');
    const store = transaction.objectStore('sale_items');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}
