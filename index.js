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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
  
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; line-height: 1.6; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
  
  nav { padding: 30px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
  .logo { font-size: 22px; letter-spacing: 5px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .cart-link { cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px; }

  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; margin-bottom: 20px; }
  .hero p { font-size: 14px; text-transform: uppercase; letter-spacing: 4px; opacity: 0.8; }

  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 60px 40px; }
  
  .product-card { transition: 0.4s; }
  .image-wrapper { width: 100%; height: 450px; background: #f9f9f9; overflow: hidden; margin-bottom: 20px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s cubic-bezier(0.2, 1, 0.3, 1); }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .buy-btn { border: 1px solid #000; background: none; padding: 15px 25px; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.4s; font-family: 'Montserrat', sans-serif; font-weight: 600; }
  .buy-btn:hover { background: #000; color: #fff; }

  #cart-sidebar { position: fixed; right: -500px; top: 0; width: 450px; height: 100%; background: #fff; box-shadow: -20px 0 50px rgba(0,0,0,0.1); z-index: 1000; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); padding: 60px 50px; box-sizing: border-box; display: flex; flex-direction: column; }
  #cart-sidebar.open { right: 0; }
  .close-cart { cursor: pointer; float: right; font-size: 12px; letter-spacing: 2px; opacity: 0.5; text-transform: uppercase; }
  
  #cart-items { flex-grow: 1; margin-top: 40px; overflow-y: auto; }
  .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; font-size: 13px; }
  
  .admin-item { display: flex; align-items: center; gap: 20px; padding: 15px 0; border-bottom: 1px solid #eee; }
  input { width: 100%; padding: 15px; margin-bottom: 15px; border: 1px solid #eee; outline: none; transition: 0.3s; }
  input:focus { border-color: #000; }
</style>
`;

// --- ГЛАВНАЯ ---
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
        <div style="font-size:15px; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:5px;">${p.title_en}</div>
        <div style="color:#888; margin-bottom:15px; font-family:'Cormorant Garamond'; font-size:20px;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Bag</button>
      </div>
    `).join('');

    res.send(`
      ${style}
      <nav>
        <a href="/" class="logo">Kyrgyz Modern</a>
        <div class="cart-link" onclick="toggleCart()">Bag (<span id="count">0</span>)</div>
      </nav>

      <div class="hero">
        <p>Est. 2026</p>
        <h1>Authentic Heritage.<br>Modern Soul.</h1>
      </div>

      <div class="container">
        <h2 style="text-align:center; margin-bottom:60px; font-size:32px;">The Collection</h2>
        <div class="grid">${productsHtml || '<p style="grid-column:1/-1; text-align:center;">Coming Soon...</p>'}</div>
      </div>
      
      <div id="cart-sidebar">
        <div class="close-cart" onclick="toggleCart()">Close ×</div>
        <h2 style="margin-top:40px; font-size:28px;">Your Selection</h2>
        <div id="cart-items"></div>
        
        <div style="padding-top:30px; border-top:2px solid #000; margin-top:20px;">
          <div style="display:flex; justify-content:space-between; font-weight:600; font-size:22px; margin-bottom:30px;">
            <span>Total</span><span id="total-val">$0</span>
          </div>
          <button id="pay-button" class="buy-btn" style="background:#000; color:#fff; padding: 20px;" onclick="checkout()">Secure Checkout</button>
          <p style="text-align:center; font-size:10px; margin-top:20px; color:#aaa; text-transform:uppercase; letter-spacing:1px;">Powered by Stripe</p>
        </div>
      </div>

      <script>
        let cart = [];
        function addToCart(n, p) { cart.push({name: n, price: p}); updateCart(); if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart(); }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          document.getElementById('cart-items').innerHTML = cart.map(i => \`
            <div class="cart-item">
              <span style="font-weight:600; text-transform:uppercase;">\${i.name}</span>
              <span style="font-family:'Cormorant Garamond'; font-size:18px;">$\${i.price}</span>
            </div>
          \`).join('');
          document.getElementById('total-val').innerText = '$' + cart.reduce((s, i) => s + i.price, 0);
        }

        async function checkout() {
          if (cart.length === 0) return;
          const btn = document.getElementById('pay-button');
          btn.innerText = 'Redirecting...';
          const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart })
          });
          const session = await response.json();
          if (session.url) window.location.href = session.url;
        }
      </script>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// --- ПЛАТЕЖ ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: item.price * 100 },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИНКА ---
app.get('/admin', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let itemsList = result.rows.map(p => `
      <div class="admin-item">
        <img src="${p.image_path}" style="width:60px; height:60px; object-fit:cover;">
        <div style="flex:1; font-size:13px;"><b>${p.title_en}</b><br>$${p.price}</div>
        <form action="/admin/delete/${p.id}" method="POST"><button type="submit" style="color:red; cursor:pointer; background:none; border:none; font-size:11px; text-transform:uppercase;">Delete</button></form>
      </div>
    `).join('');

    res.send(`
      ${style}
      <div style="max-width:600px; margin:80px auto; padding:50px; border:1px solid #eee;">
        <h2 style="margin-bottom:30px;">Inventory Management</h2>
        <form action="/admin/add" method="POST" enctype="multer-storage-cloudinary" enctype="multipart/form-data">
          <input name="title_en" placeholder="Item Name" required>
          <input name="price" type="number" placeholder="Price (USD)" required>
          <input name="image" type="file" required style="border:none; padding:10px 0;">
          <button type="submit" class="buy-btn" style="background:#000; color:#fff;">Add to Collection</button>
        </form>
        <div style="margin-top:60px;">${itemsList}</div>
        <a href="/" style="display:block; text-align:center; margin-top:40px; color:#999; text-decoration:none; font-size:11px;">← BACK TO BOUTIQUE</a>
      </div>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [req.body.title_en, req.body.price, req.file.path]);
  res.redirect('/admin');
});

app.post('/admin/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.redirect('/admin');
});

app.listen(process.env.PORT || 3000);
