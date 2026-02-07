const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Подключаем Stripe
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

app.use(express.json()); // Нужно для обработки JSON от Stripe
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&display=swap');
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; }
  nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
  .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  .product-card { text-align: left; }
  .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; }
  .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; cursor: pointer; width: 100%; margin-top: 10px; transition: 0.3s; }
  .buy-btn:hover { background: #000; color: #fff; }
  #cart-sidebar { position: fixed; right: -450px; top: 0; width: 400px; height: 100%; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.1); z-index: 100; transition: 0.5s; padding: 50px 40px; box-sizing: border-box; overflow-y: auto; }
  #cart-sidebar.open { right: 0; }
  .admin-item { display: flex; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid #eee; }
</style>
`;

// --- ГЛАВНАЯ ---
app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  let productsHtml = result.rows.map(p => `
    <div class="product-card">
      <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
      <div style="font-size:14px; text-transform:uppercase; font-weight:600;">${p.title_en}</div>
      <div style="color:#888;">$${p.price}</div>
      <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Bag</button>
    </div>
  `).join('');

  res.send(`
    ${style}
    <nav>
      <a href="/" class="logo">KYRGYZ MODERN</a>
      <div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:11px; letter-spacing:2px;">Cart (<span id="count">0</span>)</div>
    </nav>
    <div class="hero"><h1 style="font-size:60px;">KYRGYZ MODERN</h1></div>
    <div class="container"><div class="grid">${productsHtml || 'Loading...'}</div></div>
    
    <div id="cart-sidebar">
      <div onclick="toggleCart()" style="cursor:pointer; float:right;">CLOSE ×</div>
      <h2 style="margin-top:60px;">Your Bag</h2>
      <div id="cart-items" style="margin: 30px 0;"></div>
      <div style="display:flex; justify-content:space-between; font-weight:600; font-size:20px; margin-bottom:40px;">
        <span>Total</span><span id="total-val">$0</span>
      </div>
      <button id="pay-button" class="buy-btn" style="background:#000; color:#fff; padding: 18px;" onclick="checkout()">Pay by Card</button>
      <p style="text-align:center; font-size:10px; margin-top:15px; color:#888;">Secure payment via Stripe</p>
    </div>

    <script>
      let cart = [];
      function addToCart(n, p) { cart.push({name: n, price: p}); updateCart(); toggleCart(); }
      function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
      function updateCart() {
        document.getElementById('count').innerText = cart.length;
        document.getElementById('cart-items').innerHTML = cart.map(i => '<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:13px;"><span>'+i.name+'</span><span>$'+i.price+'</span></div>').join('');
        document.getElementById('total-val').innerText = '$' + cart.reduce((s, i) => s + i.price, 0);
      }

      async function checkout() {
        if (cart.length === 0) return alert('Bag is empty');
        const btn = document.getElementById('pay-button');
        btn.innerText = 'Processing...';
        
        const response = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart })
        });
        
        const session = await response.json();
        if (session.url) {
          window.location.href = session.url; // Перенаправляем на Stripe
        } else {
          alert('Error creating payment session');
          btn.innerText = 'Pay by Card';
        }
      }
    </script>
  `);
});

// --- ЛОГИКА ОПЛАТЫ ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;
    
    // Формируем товары для Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: item.price * 100, // Stripe считает в центах
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: \`\${req.headers.origin}/?status=success\`,
      cancel_url: \`\${req.headers.origin}/?status=cancel\`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- АДМИНКА (без изменений) ---
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  let itemsList = result.rows.map(p => \`
    <div class="admin-item">
      <img src="\${p.image_path}" style="width:50px; height:50px; object-fit:cover;">
      <div style="flex:1; font-size:12px;"><b>\${p.title_en}</b> - $\${p.price}</div>
      <form action="/admin/delete/\${p.id}" method="POST"><button type="submit" style="color:red; border:none; background:none; cursor:pointer;">Delete</button></form>
    </div>
  \`).join('');

  res.send(\`
    \${style}
    <div style="max-width:500px; margin:50px auto; padding:40px; border:1px solid #eee;">
      <h2>Add Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Title" required style="width:100%; padding:10px; margin-bottom:10px;">
        <input name="price" type="number" placeholder="Price" required style="width:100%; padding:10px; margin-bottom:10px;">
        <input name="image" type="file" required style="margin-bottom:20px;">
        <button type="submit" class="buy-btn" style="background:#000; color:#fff;">Upload</button>
      </form>
      <hr style="margin:40px 0;">
      <h3>Inventory</h3>
      \${itemsList}
      <br><a href="/">Back to Shop</a>
    </div>
  \`);
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
