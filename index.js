const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Настройки
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
  
  /* ОСНОВНЫЕ СТИЛИ */
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #1a1a1a; background: #fff; line-height: 1.6; overflow-x: hidden; }
  h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 400; text-transform: uppercase; letter-spacing: 2px; }
  
  /* НАВИГАЦИЯ */
  nav { padding: 30px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 100; color: #fff; }
  .logo { font-size: 24px; letter-spacing: 5px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .cart-link { cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,0.5); padding-bottom: 5px; transition: 0.3s; }
  .cart-link:hover { border-color: #fff; }

  /* ГЕРОЙ (ФОН ОБНОВЛЕН) */
  .hero { 
    height: 100vh; 
    /* Используем новое изображение с юртой и горами */
    background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.2)), url('https://res.cloudinary.com/duiel8ksn/image/upload/v1770544217/ChatGPT_Image_8_%D1%84%D0%B5%D0%B2%D1%80._2026_%D0%B3._15_48_06_nifdei.png'); 
    background-size: cover; 
    background-position: center; 
    display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; 
  }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }

  /* СЕТКА ТОВАРОВ */
  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 60px 40px; }
  .product-card { transition: 0.3s; }
  .image-wrapper { width: 100%; height: 480px; background: #f4f4f4; overflow: hidden; margin-bottom: 20px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s ease; }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .buy-btn { border: 1px solid #1a1a1a; background: none; padding: 15px 25px; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.3s; font-weight: 600; font-family: 'Montserrat'; }
  .buy-btn:hover { background: #1a1a1a; color: #fff; }

  /* КОРЗИНА (FLEXBOX - ИСПРАВЛЕННЫЙ СКРОЛЛ) */
  #cart-sidebar { 
    position: fixed; right: -550px; top: 0; width: 500px; height: 100%; 
    background: #fff; box-shadow: -20px 0 60px rgba(0,0,0,0.15); z-index: 1000; 
    transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); 
    display: flex; flex-direction: column; 
    max-width: 100vw;
  }
  #cart-sidebar.open { right: 0; }
  
  .cart-header { padding: 40px 40px 20px 40px; flex-shrink: 0; }
  
  .cart-body { 
    padding: 0 40px; 
    flex-grow: 1; 
    overflow-y: auto; 
    scrollbar-width: thin;
  }
  
  .cart-footer { 
    padding: 30px 40px 40px 40px; 
    flex-shrink: 0; 
    border-top: 1px solid #eee; 
    background: #fff;
    z-index: 2;
  }

  .input-field { width: 100%; padding: 15px 0; margin-bottom: 10px; border: none; border-bottom: 1px solid #ddd; font-family: 'Montserrat'; font-size: 12px; outline: none; background: transparent; border-radius: 0; }
  .input-field:focus { border-bottom-color: #000; }

  /* Модальное окно */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal-content { background: #fff; padding: 60px; text-align: center; max-width: 450px; width: 90%; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path}" class="product-img" loading="lazy"></div>
        <div style="font-size:14px; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:5px;">${p.title_en}</div>
        <div style="color:#666; margin-bottom:15px; font-family:'Cormorant Garamond'; font-size:22px; font-style:italic;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Bag</button>
      </div>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Kyrgyz Modern Store</title><meta name="viewport" content="width=device-width, initial-scale=1">${style}</head>
      <body>
        <nav>
          <a href="/" class="logo">Kyrgyz Modern</a>
          <div class="cart-link" onclick="toggleCart()">Bag (<span id="count">0</span>)</div>
        </nav>

        <div class="hero">
          <p style="text-transform:uppercase; letter-spacing:4px; opacity:0.8; margin-bottom:15px; font-size:12px;">Est. 2026</p>
          <h1>Authentic Heritage.<br>Modern Soul.</h1>
        </div>
        
        <div class="container">
          <div class="grid">${productsHtml || '<p style="text-align:center; grid-column:1/-1;">Loading collection...</p>'}</div>
        </div>
        
        <div id="cart-sidebar">
          <div class="cart-header">
            <div onclick="toggleCart()" style="cursor:pointer; opacity:0.5; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:20px;">Close [×]</div>
            <h2 style="font-size:24px; margin:0;">Your Selection</h2>
          </div>
          
          <div class="cart-body">
            <div id="cart-items" style="margin: 30px 0;"></div>
            
            <div id="shipping-form" style="margin-top:40px;">
              <p style="text-transform:uppercase; font-size:10px; letter-spacing:2px; font-weight:600; margin-bottom:20px; color:#888;">Shipping Details</p>
              <input type="text" id="cust-name" class="input-field" placeholder="Full Name *">
              <input type="email" id="cust-email" class="input-field" placeholder="Email Address *">
              <input type="tel" id="cust-phone" class="input-field" placeholder="Phone Number *">
              <input type="text" id="cust-address" class="input-field" placeholder="Shipping Address *">
              <input type="text" id="cust-zip" class="input-field" placeholder="Zip / Postal Code *">
            </div>
          </div>

          <div class="cart-footer">
            <div style="display:flex; justify-content:space-between; font-weight:600; font-size:20px; margin-bottom:25px;">
              <span>Total</span><span id="total-val">$0</span>
            </div>
            <button id="pay-button" class="buy-btn" style="background:#1a1a1a; color:#fff; padding:18px;" onclick="checkout()">Secure Checkout</button>
          </div>
        </div>

        <div id="status-modal" class="modal-overlay">
          <div class="modal-content">
            <h2 id="modal-title">Thank You</h2>
            <p id="modal-text" style="color:#666; font-size:13px; margin: 20px 0 30px;">Your order has been received successfully.</p>
            <button class="buy-btn" onclick="closeModal()">Back to Shop</button>
          </div>
        </div>

        <script>
          let cart = [];
          
          function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
          
          function addToCart(n, p) { 
            cart.push({name: n, price: p}); 
            updateCart(); 
            if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart(); 
          }
          
          function updateCart() {
            document.getElementById('count').innerText = cart.length;
            document.getElementById('cart-items').innerHTML = cart.map(i => \`
              <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:12px; text-transform:uppercase; border-bottom:1px solid #f5f5f5; padding-bottom:10px;">
                <span style="font-weight:600;">\${i.name}</span>
                <span style="font-family:'Cormorant Garamond'; font-size:16px;">$\${i.price}</span>
              </div>
            \`).join('');
            document.getElementById('total-val').innerText = '$' + cart.reduce((s, i) => s + i.price, 0);
          }

          async function checkout() {
            const customer = {
              name: document.getElementById('cust-name').value,
              email: document.getElementById('cust-email').value,
              phone: document.getElementById('cust-phone').value,
              address: document.getElementById('cust-address').value,
              zip: document.getElementById('cust-zip').value
            };

            if (cart.length === 0) return alert('Your bag is empty.');
            if (!Object.values(customer).every(val => val.trim() !== '')) return alert('Please fill in all shipping details.');

            const btn = document.getElementById('pay-button');
            const originalText = btn.innerText;
            btn.innerText = 'Processing...';

            try {
              const res = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, customer })
              });
              const session = await res.json();
              if (session.url) window.location.href = session.url;
              else throw new Error('Session creation failed');
            } catch (e) {
              alert('Error connecting to payment system.');
              btn.innerText = originalText;
            }
          }

          window.onload = function() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('status') === 'success') document.getElementById('status-modal').style.display = 'flex';
          };
          
          function closeModal() { 
            document.getElementById('status-modal').style.display = 'none'; 
            window.history.replaceState({}, document.title, "/"); 
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// --- БЭКЕНД: ПЛАТЕЖИ ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    console.log("Processing order for:", customer.name);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: items.map(i => ({
        price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price * 100 },
        quantity: 1,
      })),
      mode: 'payment',
      metadata: customer,
      payment_intent_data: { metadata: customer },
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- АДМИНКА ---
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const items = result.rows.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:15px 0;">
      <div style="display:flex; align-items:center; gap:15px;">
        <img src="${p.image_path}" style="width:50px; height:50px; object-fit:cover;">
        <div>
          <div style="font-size:12px; font-weight:600; text-transform:uppercase;">${p.title_en}</div>
          <div style="font-size:12px; color:#888;">$${p.price}</div>
        </div>
      </div>
      <form action="/admin/delete/${p.id}" method="POST">
        <button type="submit" style="color:#ff4444; background:none; border:none; cursor:pointer; font-size:10px; font-weight:600; text-transform:uppercase;">Remove</button>
      </form>
    </div>
  `).join('');

  res.send(`
    ${style}
    <div style="max-width:500px; margin:50px auto; padding:40px; border:1px solid #eee; background:#fff;">
      <h2 style="text-align:center; margin-bottom:30px;">Admin Panel</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Product Title" required class="input-field">
        <input name="price" type="number" placeholder="Price (USD)" required class="input-field">
        <input name="image" type="file" required style="margin:20px 0; font-size:12px;">
        <button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Upload Item</button>
      </form>
      <div style="margin-top:50px;">
        <h3 style="font-size:12px; color:#999; margin-bottom:20px;">Current Inventory</h3>
        ${items}
      </div>
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
