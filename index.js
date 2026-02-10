const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

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

  .hero { 
    height: 100vh; 
    background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.2)), url('https://res.cloudinary.com/duiel8ksn/image/upload/v1770544217/ChatGPT_Image_8_%D1%84%D0%B5%D0%B2%D1%80._2026_%D0%B3._15_48_06_nifdei.png'); 
    background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; 
  }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }

  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px 20px; }
  .product-card { display: flex; flex-direction: column; height: 100%; transition: 0.4s; }
  
  .image-wrapper { width: 100%; height: 380px; background: #f4f4f4; overflow: hidden; margin-bottom: 15px; cursor: pointer; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .product-title { 
    font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; margin-bottom: 5px; cursor: pointer;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; min-height: 32px;
  }

  .product-price { color: #666; font-family: 'Cormorant Garamond'; font-size: 20px; font-style: italic; margin-bottom: 15px; }

  .buy-btn { 
    border: 1px solid #1a1a1a; background: none; padding: 15px 20px; text-transform: uppercase; 
    font-size: 10px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.3s; font-weight: 600; 
    margin-top: auto; 
  }
  .buy-btn:hover { background: #1a1a1a; color: #fff; }

  .product-detail-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); z-index: 3000; display: none; align-items: center; justify-content: center; }
  .product-detail-content { background: #fff; width: 90%; max-width: 1100px; max-height: 90vh; display: flex; position: relative; overflow-y: auto; }
  .product-detail-img { width: 55%; height: 700px; object-fit: cover; }
  .product-detail-info { padding: 60px; display: flex; flex-direction: column; flex-grow: 1; justify-content: center; }
  
  #cart-sidebar { position: fixed; right: -550px; top: 0; width: 500px; height: 100%; background: #fff; box-shadow: -20px 0 60px rgba(0,0,0,0.15); z-index: 2000; transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); display: flex; flex-direction: column; }
  #cart-sidebar.open { right: 0; }
  .cart-header { padding: 40px; border-bottom: 1px solid #f5f5f5; }
  .cart-body { padding: 40px; flex-grow: 1; overflow-y: auto; }
  .cart-footer { padding: 40px; border-top: 1px solid #eee; }
  
  .cart-item-img { width: 80px; height: 80px; object-fit: cover; }
  .qty-btn { border: 1px solid #ddd; background: none; width: 30px; height: 30px; cursor: pointer; }
  .input-field { width: 100%; padding: 15px 0; margin-bottom: 15px; border: none; border-bottom: 1px solid #ddd; outline: none; font-family: inherit; }

  @media (max-width: 768px) { 
    .grid { grid-template-columns: repeat(2, 1fr); }
    .product-detail-content { flex-direction: column; width: 95%; }
    /* ФИКСИРОВАННЫЙ РАЗМЕР КАРТИНКИ В МОДАЛКЕ ДЛЯ МОБИЛОК */
    .product-detail-img { width: 100%; height: 40vh; min-height: 300px; object-fit: cover; }
    .product-detail-info { padding: 30px 20px; }
    #cart-sidebar { width: 100%; }
  }
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
            <img src="${p.image_path}" class="product-img">
          </div>
          <div class="product-title" onclick='openDetail(${productData})'>${p.title_en}</div>
          <div class="product-price">$${p.price}</div>
          <button class="buy-btn" onclick="addToCart('${p.title_en.replace(/'/g, "\\'")}', ${p.price}, '${p.image_path}')">Add to Bag</button>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html><html><head><title>Kyrgyz Modern</title><meta name="viewport" content="width=device-width, initial-scale=1">${style}</head><body>
      <nav><a href="/" class="logo">Kyrgyz Modern</a><div class="cart-link" onclick="toggleCart()">Bag (<span id="count">0</span>)</div></nav>
      <div class="hero"><h1>Authentic Heritage.<br>Modern Soul.</h1></div>
      <div class="container"><div class="grid">${productsHtml}</div></div>

      <div id="product-detail" class="product-detail-overlay" onclick="closeDetail()">
        <div class="product-detail-content" onclick="event.stopPropagation()">
          <img id="detail-img" src="" class="product-detail-img">
          <div class="product-detail-info">
            <h2 id="detail-title"></h2>
            <div id="detail-price"></div>
            <p id="detail-desc"></p>
            <button id="detail-buy-btn" class="buy-btn">Add to Bag</button>
            <button class="buy-btn" onclick="closeDetail()" style="margin-top: 15px;">&larr; Back</button>
          </div>
        </div>
      </div>
      
      <div id="cart-sidebar">
        <div class="cart-header"><h2 style="margin:0;">Your Bag</h2></div>
        <div class="cart-body"><div id="cart-items"></div><div id="shipping-form" style="display:none; margin-top:30px;">
          <input id="cust-name" class="input-field" placeholder="Full Name"><input id="cust-email" class="input-field" placeholder="Email">
        </div></div>
        <div class="cart-footer">
          <div style="display:flex; justify-content:space-between; margin-bottom:20px;"><span>Total</span><span id="total-val">$0</span></div>
          <button id="main-cart-btn" class="buy-btn" style="background:#1a1a1a; color:#fff;" onclick="showOrderForm()">Checkout</button>
          <button class="buy-btn" onclick="toggleCart()" style="margin-top: 15px;">&rarr; Back</button>
        </div>
      </div>

      <script>
        let cart = {};
        function openDetail(p) {
          document.getElementById('detail-img').src = p.image_path;
          document.getElementById('detail-title').innerText = p.title_en;
          document.getElementById('detail-price').innerText = '$' + p.price;
          document.getElementById('detail-desc').innerText = p.description_en || 'Handcrafted Kyrgyz piece.';
          document.getElementById('detail-buy-btn').onclick = () => addToCart(p.title_en, p.price, p.image_path);
          document.getElementById('product-detail').style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
        function closeDetail() { document.getElementById('product-detail').style.display = 'none'; document.body.style.overflow = 'auto'; }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function addToCart(n, p, img) {
          if (cart[n]) cart[n].qty++; else cart[n] = { price: p, qty: 1, image: img };
          updateCart(); 
        }
        function changeQty(n, d) { cart[n].qty += d; if (cart[n].qty <= 0) delete cart[n]; updateCart(); }
        function updateCart() {
          let total = 0, count = 0;
          document.getElementById('cart-items').innerHTML = Object.keys(cart).map(n => {
            const i = cart[n]; total += i.price * i.qty; count += i.qty;
            return \`<div style="display:flex; gap:15px; margin-bottom:20px;"><img src="\${i.image}" class="cart-item-img"><div><div style="font-size:10px; font-weight:600;">\${n}</div><div style="display:flex; align-items:center; gap:10px; margin-top:5px;"><button class="qty-btn" onclick="changeQty('\${n}',-1)">-</button>\${i.qty}<button class="qty-btn" onclick="changeQty('\${n}',1)">+</button></div></div></div>\`;
          }).join('');
          document.getElementById('count').innerText = count; document.getElementById('total-val').innerText = '$' + total;
        }
        function showOrderForm() { document.getElementById('shipping-form').style.display = 'block'; document.getElementById('main-cart-btn').innerText = 'Pay Now'; document.getElementById('main-cart-btn').onclick = checkout; }
        async function checkout() {
            const customer = { name: document.getElementById('cust-name').value, email: document.getElementById('cust-email').value };
            const res = await fetch('/create-checkout-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: Object.keys(cart).map(n => ({ name: n, price: cart[n].price, qty: cart[n].qty })), customer }) });
            const { url } = await res.json(); if (url) window.location.href = url;
        }
      </script>
    </body></html>`);
  } catch (err) { res.status(500).send(err.message); }
});

// Админские роуты оставлены без изменений
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const list = result.rows.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee;">
      <div style="display:flex; align-items:center; gap:10px;"><img src="${p.image_path}" style="width:40px; height:40px; object-fit:cover;"><span>${p.title_en}</span></div>
      <div style="display:flex; gap:10px;">
        <a href="/admin/edit/${p.id}" style="font-size:10px; text-transform:uppercase; color:#000;">Edit</a>
        <form action="/admin/delete/${p.id}" method="POST"><button style="color:red; background:none; border:none; cursor:pointer; font-size:10px; text-transform:uppercase;">Delete</button></form>
      </div>
    </div>`).join('');
  res.send(`${style}<div style="max-width:600px; margin:50px auto; padding:40px; border:1px solid #eee;"><h2>Admin Panel</h2><form action="/admin/add" method="POST" enctype="multipart/form-data"><input name="title_en" placeholder="Product Title" required class="input-field"><input name="price" type="number" placeholder="Price" required class="input-field"><textarea name="description_en" placeholder="Description" class="input-field" style="height:80px;"></textarea><input name="image" type="file" required style="margin:20px 0;"><button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Add Product</button></form><div style="margin-top:40px;">${list}</div></div>`);
});

app.get('/admin/edit/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  const p = result.rows[0];
  res.send(`${style}<div style="max-width:600px; margin:50px auto; padding:40px; border:1px solid #eee;"><h2>Edit Product</h2><form action="/admin/edit/${p.id}" method="POST" enctype="multipart/form-data"><input name="title_en" value="${p.title_en}" required class="input-field"><input name="price" type="number" value="${p.price}" required class="input-field"><textarea name="description_en" class="input-field" style="height:100px;">${p.description_en || ''}</textarea><div style="margin:20px 0;"><img src="${p.image_path}" style="width:100px; display:block; margin-bottom:10px;"><input name="image" type="file"></div><button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Save Changes</button><a href="/admin" style="display:block; margin-top:20px; font-size:10px; text-align:center; color:#666; text-decoration:none;">CANCEL</a></form></div>`);
});

app.post('/admin/edit/:id', upload.single('image'), async (req, res) => {
  const { title_en, price, description_en } = req.body;
  if (req.file) await pool.query('UPDATE products SET title_en=$1, price=$2, description_en=$3, image_path=$4 WHERE id=$5', [title_en, price, description_en, req.file.path, req.params.id]);
  else await pool.query('UPDATE products SET title_en=$1, price=$2, description_en=$3 WHERE id=$4', [title_en, price, description_en, req.params.id]);
  res.redirect('/admin');
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  await pool.query('INSERT INTO products (title_en, price, description_en, image_path) VALUES ($1, $2, $3, $4)', [req.body.title_en, req.body.price, req.body.description_en, req.file.path]);
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
