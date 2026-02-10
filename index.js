const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Конфигурация Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'kyrgyz_modern', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
  
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #1a1a1a; background: #fff; line-height: 1.6; overflow-x: hidden; }
  h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
  
  nav { padding: 30px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 100; color: #fff; }
  .logo { font-size: 24px; letter-spacing: 5px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .cart-link { cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 5px; transition: 0.3s; }
  .cart-link:hover { border-color: #fff; }

  .hero { 
    height: 100vh; 
    background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.2)), url('https://res.cloudinary.com/duiel8ksn/image/upload/v1770544217/ChatGPT_Image_8_%D1%84%D0%B5%D0%B2%D1%80._2026_%D0%B3._15_48_06_nifdei.png'); 
    background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; 
  }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }

  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px 20px; }

  @media (max-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px) { 
    .grid { grid-template-columns: repeat(2, 1fr); gap: 20px 12px; }
    .product-detail-content { flex-direction: column !important; width: 95% !important; }
    .product-detail-img { width: 100% !important; height: 300px !important; }
    #cart-sidebar { width: 100% !important; }
  }

  .product-card { display: flex; flex-direction: column; transition: 0.4s; }
  .image-wrapper { width: 100%; height: 380px; background: #f4f4f4; overflow: hidden; margin-bottom: 15px; cursor: pointer; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .product-title { font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; margin-bottom: 5px; cursor: pointer; }
  .product-price { color: #666; font-family: 'Cormorant Garamond'; font-size: 20px; font-style: italic; margin-bottom: 15px; }

  .buy-btn { 
    border: 1px solid #1a1a1a; background: none; padding: 15px 20px; text-transform: uppercase; 
    font-size: 10px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.3s; font-weight: 600; 
  }
  .buy-btn:hover { background: #1a1a1a; color: #fff; }

  /* Всплывающее окно товара */
  .product-detail-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    z-index: 3000; display: none; align-items: center; justify-content: center;
  }
  .product-detail-content {
    background: #fff; width: 90%; max-width: 1100px; max-height: 90vh;
    display: flex; position: relative; overflow-y: auto;
  }
  .product-detail-img { width: 55%; height: 700px; object-fit: cover; }
  .product-detail-info { padding: 60px; display: flex; flex-direction: column; flex-grow: 1; justify-content: center; }
  .close-detail { position: absolute; top: 30px; right: 30px; cursor: pointer; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.5; z-index: 10; }

  /* Корзина */
  #cart-sidebar { 
    position: fixed; right: -550px; top: 0; width: 500px; height: 100%; 
    background: #fff; box-shadow: -20px 0 60px rgba(0,0,0,0.15); z-index: 2000; 
    transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); display: flex; flex-direction: column; 
  }
  #cart-sidebar.open { right: 0; }
  .cart-header { padding: 40px; border-bottom: 1px solid #f5f5f5; }
  .cart-body { padding: 40px; flex-grow: 1; overflow-y: auto; }
  .cart-footer { padding: 40px; border-top: 1px solid #eee; background: #fff; }
  
  .cart-item-img { width: 80px; height: 80px; object-fit: cover; }
  .qty-btn { border: 1px solid #ddd; background: none; width: 30px; height: 30px; cursor: pointer; }
  .input-field { width: 100%; padding: 15px 0; margin-bottom: 15px; border: none; border-bottom: 1px solid #ddd; outline: none; font-family: inherit; }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 4000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal-content { background: #fff; padding: 60px; text-align: center; max-width: 450px; width: 90%; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => {
      const productData = JSON.stringify(p).replace(/'/g, "&apos;");
      return `
        <div class="product-card">
          <div class="image-wrapper" onclick='openDetail(${productData})'>
            <img src="${p.image_path}" class="product-img" loading="lazy">
          </div>
          <div class="product-title" onclick='openDetail(${productData})'>${p.title_en}</div>
          <div class="product-price">$${p.price}</div>
          <button class="buy-btn" onclick="addToCart('${p.title_en.replace(/'/g, "\\'")}', ${p.price}, '${p.image_path}')">Add to Bag</button>
        </div>
      `;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Kyrgyz Modern</title><meta name="viewport" content="width=device-width, initial-scale=1">${style}</head>
      <body>
        <nav>
          <a href="/" class="logo">Kyrgyz Modern</a>
          <div class="cart-link" onclick="toggleCart()">Bag (<span id="count">0</span>)</div>
        </nav>

        <div class="hero">
          <p style="text-transform:uppercase; letter-spacing:4px; opacity:0.8; margin-bottom:15px; font-size:12px;">Est. 2026</p>
          <h1>Authentic Heritage.<br>Modern Soul.</h1>
        </div>
        
        <div class="container"><div class="grid">${productsHtml}</div></div>

        <div id="product-detail" class="product-detail-overlay" onclick="closeDetail(event)">
          <div class="product-detail-content" onclick="event.stopPropagation()">
            <div class="close-detail" onclick="closeDetail()">Back [×]</div>
            <img id="detail-img" src="" class="product-detail-img">
            <div class="product-detail-info">
              <h2 id="detail-title" style="margin-top:0; font-size:32px;"></h2>
              <div id="detail-price" style="font-family:'Cormorant Garamond'; font-size:28px; font-style:italic; margin-bottom:30px; color:#666;"></div>
              <p id="detail-desc" style="color:#444; font-size:14px; margin-bottom:40px; white-space: pre-wrap; line-height:1.8;"></p>
              <button id="detail-buy-btn" class="buy-btn" style="background:#1a1a1a; color:#fff; padding:20px;">Add to Bag</button>
            </div>
          </div>
        </div>
        
        <div id="cart-sidebar">
          <div class="cart-header">
            <div onclick="toggleCart()" style="cursor:pointer; opacity:0.5; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:20px;">Close [×]</div>
            <h2 style="font-size:28px; margin:0;">Your Bag</h2>
          </div>
          <div class="cart-body">
            <div id="cart-items"></div>
            <div id="shipping-form" style="display:none; margin-top:30px; border-top:1px solid #eee; padding-top:30px;">
              <input type="text" id="cust-name" class="input-field" placeholder="Full Name *">
              <input type="email" id="cust-email" class="input-field" placeholder="Email Address *">
              <input type="text" id="cust-address" class="input-field" placeholder="Shipping Address *">
            </div>
          </div>
          <div class="cart-footer">
            <div style="display:flex; justify-content:space-between; font-weight:600; font-size:20px; margin-bottom:25px;">
              <span>Total</span><span id="total-val">$0</span>
            </div>
            <button id="main-cart-btn" class="buy-btn" style="background:#1a1a1a; color:#fff; padding:20px;" onclick="showOrderForm()">Proceed to Checkout</button>
          </div>
        </div>

        <div id="status-modal" class="modal-overlay">
          <div class="modal-content">
            <h2>Success</h2>
            <p>Your order has been placed.</p>
            <button class="buy-btn" onclick="closeModal()">Continue Shopping</button>
          </div>
        </div>

        <script>
          let cart = {}; 
          function openDetail(product) {
            document.getElementById('detail-img').src = product.image_path;
            document.getElementById('detail-title').innerText = product.title_en;
            document.getElementById('detail-price').innerText = '$' + product.price;
            document.getElementById('detail-desc').innerText = product.description_en || 'Kyrgyz Modern Heritage piece.';
            const btn = document.getElementById('detail-buy-btn');
            btn.onclick = () => { addToCart(product.title_en, product.price, product.image_path); closeDetail(); };
            document.getElementById('product-detail').style.display = 'flex';
            document.body.style.overflow = 'hidden';
          }
          function closeDetail() { document.getElementById('product-detail').style.display = 'none'; document.body.style.overflow = 'auto'; }
          function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
          function addToCart(n, p, img) { 
            if (cart[n]) cart[n].qty++;
            else cart[n] = { price: p, qty: 1, image: img };
            updateCart(); 
            if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart();
          }
          function changeQty(n, delta) {
            cart[n].qty += delta;
            if (cart[n].qty <= 0) delete cart[n];
            updateCart();
          }
          function updateCart() {
            const itemsDiv = document.getElementById('cart-items');
            let total = 0, count = 0;
            itemsDiv.innerHTML = Object.keys(cart).map(n => {
              const item = cart[n];
              total += item.price * item.qty; count += item.qty;
              return \`
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:25px;">
                  <img src="\${item.image}" class="cart-item-img">
                  <div style="flex-grow:1;">
                    <div style="font-size:11px; font-weight:600; text-transform:uppercase;">\${n}</div>
                    <div style="font-family:'Cormorant Garamond'; font-size:18px;">$\${item.price}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <button class="qty-btn" onclick="changeQty('\${n}', -1)">-</button>
                    <span>\${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('\${n}', 1)">+</button>
                  </div>
                </div>\`;
            }).join('');
            document.getElementById('count').innerText = count;
            document.getElementById('total-val').innerText = '$' + total;
          }
          function showOrderForm() { document.getElementById('shipping-form').style.display = 'block'; document.getElementById('main-cart-btn').innerText = 'Complete Purchase'; document.getElementById('main-cart-btn').onclick = checkout; }
          async function checkout() {
            const customer = { name: document.getElementById('cust-name').value, email: document.getElementById('cust-email').value, address: document.getElementById('cust-address').value };
            if (!customer.name || !customer.email) return alert('Fill details');
            const res = await fetch('/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.keys(cart).map(n => ({ name: n, price: cart[n].price, qty: cart[n].qty })), customer }) });
            const { url } = await res.json(); if (url) window.location.href = url;
          }
          window.onload = () => { if (new URLSearchParams(window.location.search).get('status') === 'success') document.getElementById('status-modal').style.display = 'flex'; };
          function closeModal() { window.location.href = '/'; }
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// АДМИНКА
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const items = result.rows.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:15px 0;">
      <div style="display:flex; align-items:center; gap:15px;">
        <img src="${p.image_path}" style="width:50px; height:50px; object-fit:cover;">
        <span style="font-size:12px; font-weight:600;">${p.title_en}</span>
      </div>
      <div style="display:flex; gap:10px;">
        <a href="/admin/edit/${p.id}" style="text-decoration:none; color:blue; font-size:12px;">Edit</a>
        <form action="/admin/delete/${p.id}" method="POST" onsubmit="return confirm('Delete?')"><button type="submit" style="color:red; background:none; border:none; cursor:pointer; font-size:12px;">Delete</button></form>
      </div>
    </div>
  `).join('');
  res.send(`${style}<div style="max-width:600px; margin:50px auto; padding:40px; border:1px solid #eee;">
    <h2>Admin Panel</h2>
    <form action="/admin/add" method="POST" enctype="multipart/form-data">
      <input name="title_en" placeholder="Product Name" required class="input-field">
      <input name="price" type="number" placeholder="Price (USD)" required class="input-field">
      <textarea name="description_en" placeholder="Full Description" class="input-field" style="height:100px;"></textarea>
      <input name="image" type="file" required style="margin:20px 0;">
      <button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Upload Product</button>
    </form>
    <div style="margin-top:50px;">${items}</div>
  </div>`);
});

app.get('/admin/edit/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  const p = result.rows[0];
  if (!p) return res.redirect('/admin');
  res.send(`${style}<div style="max-width:600px; margin:50px auto; padding:40px; border:1px solid #eee;">
    <h2>Edit Product</h2>
    <form action="/admin/edit/${p.id}" method="POST" enctype="multipart/form-data">
      <input name="title_en" value="${p.title_en}" required class="input-field">
      <input name="price" type="number" value="${p.price}" required class="input-field">
      <textarea name="description_en" class="input-field" style="height:150px;">${p.description_en || ''}</textarea>
      <div style="margin:20px 0; display:flex; align-items:center; gap:20px;">
        <img src="${p.image_path}" style="width:80px;">
        <input name="image" type="file">
      </div>
      <button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Save Changes</button>
      <a href="/admin" style="display:block; text-align:center; margin-top:20px; font-size:11px; text-decoration:none; color:#666;">Cancel</a>
    </form>
  </div>`);
});

app.post('/admin/edit/:id', upload.single('image'), async (req, res) => {
  const { title_en, price, description_en } = req.body;
  if (req.file) {
    await pool.query('UPDATE products SET title_en=$1, price=$2, description_en=$3, image_path=$4 WHERE id=$5', [title_en, price, description_en, req.file.path, req.params.id]);
  } else {
    await pool.query('UPDATE products SET title_en=$1, price=$2, description_en=$3 WHERE id=$4', [title_en, price, description_en, req.params.id]);
  }
  res.redirect('/admin');
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const imgPath = req.file ? req.file.path : '';
  await pool.query('INSERT INTO products (title_en, price, description_en, image_path) VALUES ($1, $2, $3, $4)', [req.body.title_en, req.body.price, req.body.description_en, imgPath]);
  res.redirect('/admin');
});

app.post('/admin/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.redirect('/admin');
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: items.map(i => ({ price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price * 100 }, quantity: i.qty })),
      mode: 'payment', success_url: `${req.headers.origin}/?status=success`, cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(process.env.PORT || 3000);
