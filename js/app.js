const SUPABASE_URL = "https://drjknkqdgrwxyzlxdffp.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyamtua3FkZ3J3eHl6bHhkZmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDc2MTcsImV4cCI6MjA5NDE4MzYxN30.tsB5iskzJomNp2_5DOc1IEbSt2E1OpDgFoHYTUKz0fY";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let cart = [];
let total = 0;

async function addProduct() {

  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const qty = document.getElementById("qty").value;

  if (!name || !price || !qty) {
    alert("Fill all fields");
    return;
  }

  const { error } = await client
    .from("products")
    .insert([
      {
        name: name,
        price: price,
        quantity: qty
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Product Added");

  loadProducts();

  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("qty").value = "";
}

async function loadProducts() {

  const { data, error } = await client
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.log(error.message);

    const offlineProducts =
      JSON.parse(localStorage.getItem("products")) || [];

    showProducts(offlineProducts);

    return;
  }

  localStorage.setItem(
    "products",
    JSON.stringify(data)
  );

  showProducts(data);
}

function showProducts(products) {

  const container =
    document.getElementById("products");

  container.innerHTML = "";

  products.forEach(product => {

    container.innerHTML += `
      <div class="product">

        <h3>${product.name}</h3>

        <p>Price: ${product.price} ETB</p>

        <p>Quantity: ${product.quantity}</p>

        <button onclick="
          addToCart(
            ${product.id},
            '${product.name}',
            ${product.price}
          )
        ">
          Add To Cart
        </button>

      </div>
    `;
  });
}

function addToCart(id, name, price) {

  cart.push({
    id,
    name,
    price
  });

  total += Number(price);

  renderCart();
}

function renderCart() {

  const cartDiv =
    document.getElementById("cart");

  cartDiv.innerHTML = "";

  cart.forEach(item => {

    cartDiv.innerHTML += `
      <div class="cart-item">
        ${item.name} - ${item.price} ETB
      </div>
    `;
  });

  document.getElementById("total").innerText =
    total;
}

async function completeSale() {

  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  const { data, error } = await client
    .from("sales")
    .insert([
      {
        total: total
      }
    ])
    .select();

  if (error) {

    saveOfflineSale();

    alert("Saved Offline");

    return;
  }

  const saleId = data[0].id;

  const items = cart.map(item => ({
    sale_id: saleId,
    product_id: item.id,
    quantity: 1,
    price: item.price
  }));

  await client
    .from("sale_items")
    .insert(items);

  alert("Sale Completed");

  cart = [];
  total = 0;

  renderCart();
}

function saveOfflineSale() {

  const offlineSales =
    JSON.parse(
      localStorage.getItem("offlineSales")
    ) || [];

  offlineSales.push({
    cart,
    total
  });

  localStorage.setItem(
    "offlineSales",
    JSON.stringify(offlineSales)
  );
}

function searchProduct() {

  const text =
    document
      .getElementById("search")
      .value
      .toLowerCase();

  const products =
    JSON.parse(
      localStorage.getItem("products")
    ) || [];

  const filtered = products.filter(product =>
    product.name
      .toLowerCase()
      .includes(text)
  );

  showProducts(filtered);
}

if ("serviceWorker" in navigator) {

  navigator.serviceWorker.register(
    "service-worker.js"
  );
}

loadProducts();
