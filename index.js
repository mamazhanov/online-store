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
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }
  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 60px 40px; }
  .image-wrapper { width: 100%; height: 450px; background: #f9f9f9; overflow: hidden; margin-bottom: 20px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s; }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .buy-btn { border: 1px solid #000; background: none; padding: 15px 25px; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.4s; font-weight: 600; font-family: 'Montserrat'; }
  .buy-btn:hover { background: #000; color: #fff; }

  #cart-sidebar { position: fixed; right: -500px; top: 0; width: 450px; height: 100%; background: #fff; box-shadow: -20px 0 50px rgba(0,0,0,0.1); z-index: 1000; transition: 0.6s cubic-bezier(0.2, 1, 0.3, 1); padding: 40px; box-sizing: border-box; overflow-y: auto; }
  #cart-sidebar.open { right: 0; }
  
  .input-field { width: 100%; padding: 12px 0; margin-bottom: 15px; border: none; border-bottom: 1px solid #eee; font-family: 'Montserrat'; font-size: 13px; outline: none; transition: 0.3s; }
  .input-field:focus { border-bottom-color: #000; }
  
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal-content { background: #fff; padding: 60px; text-align: center; max-width: 500px; width: 90%; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
        <div style="font-size:14px; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:5px;">${p.title_en}</div>
        <div style="color:#888; margin-bottom:15px; font-family:'Cormorant Garamond'; font-size:20px;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Bag</button>
      </div>
    `).join('');

    res.send(`
      ${style}
      <nav><a href="/" class="logo">Kyrgyz Modern</a><div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:11px; letter-spacing:2px;">Bag (<span id="count">0</span>)</div></nav>
      <div class="hero"><p style="text-transform:uppercase; letter-spacing:4px; opacity:0.8;">Est. 2026</p><h1>Authentic Heritage.<br>Modern Soul.</h1></div>
      
      <div class="container"><div class="grid">${productsHtml || 'Loading...'}</div></div>
      
      <div id="cart-sidebar">
        <div onclick="toggleCart()" style="cursor:pointer; opacity:0.5; font-size:11px; letter-spacing:2px; text-transform:uppercase;">Close ×</div>
        <h2 style="margin-top:30px;">Your Bag</h2>
        <div id="cart-items" style="margin: 30px 0; border-bottom: 1px solid #eee; padding-bottom: 20px;"></div>
        
        <div id="shipping-form">
          <p style="text-transform:uppercase; font-size:10px; letter-spacing:2px; font-weight:600; margin-bottom:20px;">Shipping Details</p>
          <input type="text" id="cust-name" class="input-field" placeholder="FULL NAME">
          <input type="text" id="cust-address" class="input-field" placeholder="SHIPPING ADDRESS">
          <input type="text" id="cust-zip" class="input-field" placeholder="POSTAL CODE / ZIP">
        </div>

        <div style="margin-top:20px;">
          <div style="display:flex; justify-content:space-between; font-weight:600; font-size:20px; margin-bottom:30px;">
            <span>Total</span><span id="total-val">$0</span>
          </div>
          <button id="pay-button" class="buy-btn" style="background:#000; color:#fff; padding:18px;" onclick="checkout()">Checkout via Stripe</button>
        </div>
      </div>

      <div id="status-modal" class="modal-overlay"><div class="modal-content"><h2 id="modal-title">Thank You</h2><p id="modal-text">Order confirmed.</p><button class="buy-btn" onclick="closeModal()">Back to Shop</button></div></div>

      <script>
        let cart = [];
        function addToCart(n, p) { cart.push({name: n, price: p}); updateCart(); if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart(); }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          document.getElementById('cart-items').innerHTML = cart.map(i => '<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:12px; text-transform:uppercase;"><span>'+i.name+'</span><span>$'+i.price+'</span></div>').join('');
          document.getElementById('total-val').innerText = '$' + cart.reduce((s, i) => s + i.price, 0);
        }

        async function checkout() {
          const name = document.getElementById('cust-name').value;
          const address = document.getElementById('cust-address').value;
          const zip = document.getElementById('cust-zip').value;

          if (cart.length === 0) return alert('Bag is empty');
          if (!name || !address || !zip) return alert('Please fill all shipping details');

          const btn = document.getElementById('pay-button');
          btn.innerText = 'Redirecting...';

          const res = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              items: cart,
              customer: { name, address, zip }
            })
          });
          const session = await res.json();
          if (session.url) window.location.href = session.url;
          else { alert('Error'); btn.innerText = 'Checkout'; }
        }

        window.onload = function() {
          const params = new URLSearchParams(window.location.search);
          if (params.get('status') === 'success') document.getElementById('status-modal').style.display = 'flex';
        };
        function closeModal() { document.getElementById('status-modal').style.display = 'none'; window.history.replaceState({}, document.title, "/"); }
      </script>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// --- СЕРВЕР: STRIPE SESSION (Исправленный) ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    
    // Это поможет тебе увидеть в логах Railway, что пришло с фронтенда
    console.log("Order Data:", customer); 

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(i => ({
        price_data: { 
          currency: 'usd', 
          product_data: { name: i.name }, 
          unit_amount: i.price * 100 
        },
        quantity: 1,
      })),
      mode: 'payment',
      // Добавляем метаданные СТРОГО строковыми значениями
      metadata: {
        "Customer_Name": String(customer.name),
        "Address": String(customer.address),
        "ZIP_Code": String(customer.zip),
        "Items": items.map(i => i.name).join(', ')
      },
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });

    res.json({ url: session.url });
  } catch (err) { 
    console.error("Stripe Error:", err.message);
    res.status(500).json({ error: err.message }); 
  }
});

// --- АДМИНКА ---
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const items = result.rows.map(p => `
    <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; font-size:12px;">
      <span>${p.title_en} ($${p.price})</span>
      <form action="/admin/delete/${p.id}" method="POST"><button type="submit" style="color:red; border:none; background:none; cursor:pointer;">Delete</button></form>
    </div>
  `).join('');
  res.send(`${style}<div style="max-width:400px; margin:50px auto; padding:40px; border:1px solid #eee;">
    <h2>Admin</h2><form action="/admin/add" method="POST" enctype="multipart/form-data">
    <input name="title_en" placeholder="Title" required class="input-field">
    <input name="price" type="number" placeholder="Price" required class="input-field">
    <input name="image" type="file" required style="margin-bottom:20px;">
    <button type="submit" class="buy-btn">Upload</button></form><div style="margin-top:30px;">${items}</div></div>`);
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
