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
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; line-height: 1.6; overflow-x: hidden; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
  nav { padding: 30px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
  .logo { font-size: 22px; letter-spacing: 5px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }
  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 60px 40px; }
  .image-wrapper { width: 100%; height: 450px; background: #f9f9f9; overflow: hidden; margin-bottom: 20px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s; }
  .product-card:hover .product-img { transform: scale(1.05); }
  .buy-btn { border: 1px solid #000; background: none; padding: 15px 25px; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.4s; font-weight: 600; }
  .buy-btn:hover { background: #000; color: #fff; }
  #cart-sidebar { position: fixed; right: -500px; top: 0; width: 450px; height: 100%; background: #fff; box-shadow: -20px 0 50px rgba(0,0,0,0.1); z-index: 1000; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); padding: 60px 50px; box-sizing: border-box; }
  #cart-sidebar.open { right: 0; }
  
  /* Стили для окна уведомления */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal-content { background: #fff; padding: 60px; text-align: center; max-width: 500px; width: 90%; position: relative; }
  .modal-content h2 { font-size: 32px; margin-bottom: 20px; }
  .modal-content p { font-size: 14px; color: #666; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px; }
</style>
`;

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
      <nav><a href="/" class="logo">Kyrgyz Modern</a><div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:11px; letter-spacing:2px;">Bag (<span id="count">0</span>)</div></nav>
      <div class="hero"><p style="text-transform:uppercase; letter-spacing:4px; margin-bottom:10px; opacity:0.8;">Est. 2026</p><h1>Authentic Heritage.<br>Modern Soul.</h1></div>
      <div class="container"><div class="grid">${productsHtml || 'Loading...'}</div></div>
      
      <div id="cart-sidebar">
        <div onclick="toggleCart()" style="cursor:pointer; opacity:0.5; text-transform:uppercase; font-size:11px; letter-spacing:2px;">Close ×</div>
        <h2 style="margin-top:40px;">Your Selection</h2>
        <div id="cart-items" style="margin: 40px 0; max-height: 50vh; overflow-y: auto;"></div>
        <div style="border-top: 1px solid #eee; padding-top: 20px;">
          <div style="display:flex; justify-content:space-between; font-weight:600; font-size:22px; margin-bottom:30px;">
            <span>Total</span><span id="total-val">$0</span>
          </div>
          <button id="pay-button" class="buy-btn" style="background:#000; color:#fff; padding:20px;" onclick="checkout()">Secure Checkout</button>
        </div>
      </div>

      <div id="status-modal" class="modal-overlay">
        <div class="modal-content">
          <h2 id="modal-title">Thank You</h2>
          <p id="modal-text">Your order has been received. We will contact you shortly regarding delivery.</p>
          <button class="buy-btn" onclick="closeModal()">Continue Shopping</button>
        </div>
      </div>

      <script>
        let cart = [];
        function addToCart(n, p) { cart.push({name: n, price: p}); updateCart(); toggleCart(); }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          document.getElementById('cart-items').innerHTML = cart.map(i => '<div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px; text-transform:uppercase;"><span>'+i.name+'</span><span style="font-family:serif; font-size:16px;">$'+i.price+'</span></div>').join('');
          document.getElementById('total-val').innerText = '$' + cart.reduce((s, i) => s + i.price, 0);
        }

        async function checkout() {
          if (cart.length === 0) return;
          const btn = document.getElementById('pay-button');
          btn.innerText = 'Redirecting...';
          const res = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart })
          });
          const session = await res.json();
          if (session.url) window.location.href = session.url;
        }

        // Логика показа уведомлений после оплаты
        window.onload = function() {
          const params = new URLSearchParams(window.location.search);
          const modal = document.getElementById('status-modal');
          if (params.get('status') === 'success') {
            modal.style.display = 'flex';
          } else if (params.get('status') === 'cancel') {
            document.getElementById('modal-title').innerText = 'Payment Cancelled';
            document.getElementById('modal-text').innerText = 'The transaction was not completed. You can try again later.';
            modal.style.display = 'flex';
          }
        };

        function closeModal() {
          document.getElementById('status-modal').style.display = 'none';
          window.history.replaceState({}, document.title, "/"); // Очищаем URL
        }
      </script>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// --- СТРАЙП ЛОГИКА ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: req.body.items.map(i => ({
        price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price * 100 },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИНКА (Без изменений) ---
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const itemsList = result.rows.map(p => `
    <div style="display:flex; align-items:center; gap:15px; padding:10px 0; border-bottom:1px solid #eee;">
      <img src="${p.image_path}" style="width:40px; height:40px; object-fit:cover;">
      <div style="flex:1; font-size:12px;">${p.title_en} - $${p.price}</div>
      <form action="/admin/delete/${p.id}" method="POST"><button type="submit" style="color:red; cursor:pointer;">Del</button></form>
    </div>
  `).join('');

  res.send(`
    ${style}
    <div style="max-width:500px; margin:50px auto; padding:40px; border:1px solid #eee;">
      <h2>Admin Panel</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Product Title" required style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee;">
        <input name="price" type="number" placeholder="Price (USD)" required style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #eee;">
        <input name="image" type="file" required style="margin-bottom:20px;">
        <button type="submit" class="buy-btn" style="background:#000; color:#fff;">Upload to Catalog</button>
      </form>
      <div style="margin-top:40px;">${itemsList}</div>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const imgPath = req.file ? req.file.path : '';
  await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [req.body.title_en, req.body.price, imgPath]);
  res.redirect('/admin');
});

app.post('/admin/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.redirect('/admin');
});

app.listen(process.env.PORT || 3000);
