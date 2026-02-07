const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Настройка Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
    folder: 'kyrgyz_modern', 
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;600&display=swap');
  
  :root { --gold: #c5a059; --dark: #1a1a1a; --light: #f9f9f9; }

  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; line-height: 1.6; overflow-x: hidden; }
  h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 400; text-transform: uppercase; letter-spacing: 3px; }
  
  /* Navigation */
  nav { padding: 40px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 100; color: #fff; }
  .logo { font-size: 24px; letter-spacing: 6px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; transition: 0.3s; }
  .logo:hover { opacity: 0.7; }
  .cart-link { cursor: pointer; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px; transition: 0.3s; }
  .cart-link:hover { border-color: #fff; }

  /* Hero Section */
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero p { text-transform: uppercase; letter-spacing: 5px; font-size: 12px; margin-bottom: 20px; animation: fadeIn 1.5s ease; }
  .hero h1 { font-size: clamp(45px, 9vw, 100px); margin: 0; line-height: 0.85; animation: fadeInUp 1.2s ease; }

  /* Grid & Products */
  .container { max-width: 1440px; margin: 120px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 80px 50px; }
  .product-card { position: relative; transition: 0.4s; }
  .image-wrapper { width: 100%; height: 500px; background: var(--light); overflow: hidden; margin-bottom: 25px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 1.2s cubic-bezier(0.2, 1, 0.3, 1); }
  .product-card:hover .product-img { transform: scale(1.08); }
  
  .product-info { text-align: center; }
  .product-title { font-size: 16px; text-transform: uppercase; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px; color: var(--dark); }
  .product-price { font-family: 'Cormorant Garamond'; font-size: 24px; color: #777; font-style: italic; margin-bottom: 20px; }

  .buy-btn { border: 1px solid var(--dark); background: transparent; padding: 18px 30px; text-transform: uppercase; font-size: 11px; letter-spacing: 3px; cursor: pointer; width: 100%; transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); font-weight: 600; position: relative; overflow: hidden; }
  .buy-btn:hover { background: var(--dark); color: #fff; }

  /* Sidebar Cart */
  #cart-sidebar { position: fixed; right: -550px; top: 0; width: 500px; height: 100%; background: #fff; box-shadow: -30px 0 70px rgba(0,0,0,0.1); z-index: 1000; transition: 0.7s cubic-bezier(0.19, 1, 0.22, 1); padding: 60px 50px; box-sizing: border-box; display: flex; flex-direction: column; }
  #cart-sidebar.open { right: 0; }
  .close-cart { cursor: pointer; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; opacity: 0.4; transition: 0.3s; margin-bottom: 40px; }
  .close-cart:hover { opacity: 1; }
  
  #cart-items { flex-grow: 1; overflow-y: auto; margin-bottom: 30px; }
  .cart-item { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; }
  
  /* Inputs */
  .input-group { margin-top: 30px; border-top: 1px solid #eee; padding-top: 30px; }
  .input-field { width: 100%; padding: 15px 0; margin-bottom: 15px; border: none; border-bottom: 1px solid #e0e0e0; font-family: 'Montserrat'; font-size: 12px; outline: none; transition: 0.3s; text-transform: uppercase; letter-spacing: 1px; }
  .input-field:focus { border-bottom-color: var(--dark); }

  /* Modal */
  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
  .modal-content { background: #fff; padding: 80px 60px; text-align: center; max-width: 500px; width: 90%; animation: fadeInUp 0.6s ease; }
  .modal-content h2 { font-size: 36px; margin-bottom: 20px; }
  
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  /* Admin Styles */
  .admin-container { max-width: 600px; margin: 100px auto; padding: 60px; border: 1px solid #eee; background: #fff; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper">
          <img src="${p.image_path}" class="product-img" loading="lazy">
        </div>
        <div class="product-info">
          <div class="product-title">${p.title_en}</div>
          <div class="product-price">$${p.price}</div>
          <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Bag</button>
        </div>
      </div>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Kyrgyz Modern | Boutique</title>${style}</head>
      <body>
        <nav>
          <a href="/" class="logo">Kyrgyz Modern</a>
          <div class="cart-link" onclick="toggleCart()">Bag (<span id="count">0</span>)</div>
        </nav>

        <div class="hero">
          <p>Handcrafted Heritage</p>
          <h1>The New Era of<br>Central Asian Style.</h1>
        </div>
        
        <div class="container">
          <div class="grid">${productsHtml || '<p>Our collection is coming soon.</p>'}</div>
        </div>
        
        <div id="cart-sidebar">
          <div class="close-cart" onclick="toggleCart()">Close Index [×]</div>
          <h2>Your Selection</h2>
          
          <div id="cart-items"></div>
          
          <div id="shipping-form" class="input-group">
            <h3 style="font-size:14px; margin-bottom:20px;">Shipping Information</h3>
            <input type="text" id="cust-name" class="input-field" placeholder="Full Name">
            <input type="email" id="cust-email" class="input-field" placeholder="Email Address">
            <input type="tel" id="cust-phone" class="input-field" placeholder="Phone Number">
            <input type="text" id="cust-address" class="input-field" placeholder="Complete Address">
            <input type="text" id="cust-zip" class="input-field" placeholder="Postal / ZIP Code">
          </div>

          <div style="margin-top:auto; padding-top:30px;">
            <div style="display:flex; justify-content:space-between; font-weight:600; font-size:22px; margin-bottom:40px;">
              <span>Total</span><span id="total-val">$0</span>
            </div>
            <button id="pay-button" class="buy-btn" style="background:var(--dark); color:#fff;" onclick="checkout()">Secure Checkout</button>
          </div>
        </div>

        <div id="status-modal" class="modal-overlay">
          <div class="modal-content">
            <h2 id="modal-title">Rakhmat.</h2>
            <p id="modal-text" style="color:#666; text-transform:uppercase; font-size:12px; letter-spacing:2px; margin-bottom:40px;">
              Your order has been successfully placed.<br>We will reach out for delivery details.
            </p>
            <button class="buy-btn" onclick="closeModal()">Return to Collection</button>
          </div>
        </div>

        <script>
          let cart = [];
          
          function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }

          function addToCart(name, price) {
            cart.push({name, price});
            updateCart();
            if (!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart();
          }

          function updateCart() {
            document.getElementById('count').innerText = cart.length;
            const itemsDiv = document.getElementById('cart-items');
            itemsDiv.innerHTML = cart.map(i => \`
              <div class="cart-item">
                <span style="font-size:11px; text-transform:uppercase; font-weight:600; letter-spacing:1px;">\${i.name}</span>
                <span style="font-family:serif; font-size:18px; color:#999;">$\${i.price}</span>
              </div>
            \`).join('');
            const total = cart.reduce((sum, item) => sum + item.price, 0);
            document.getElementById('total-val').innerText = '$' + total;
          }

          async function checkout() {
            const customer = {
              name: document.getElementById('cust-name').value,
              email: document.getElementById('cust-email').value,
              phone: document.getElementById('cust-phone').value,
              address: document.getElementById('cust-address').value,
              zip: document.getElementById('cust-zip').value
            };

            if (cart.length === 0) return alert('Bag is empty');
            if (!Object.values(customer).every(v => v.trim() !== '')) return alert('Please complete all shipping fields');

            const btn = document.getElementById('pay-button');
            btn.innerText = 'Connecting to Stripe...';

            const res = await fetch('/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: cart, customer })
            });
            const session = await res.json();
            if (session.url) window.location.href = session.url;
          }

          window.onload = function() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('status') === 'success') {
              document.getElementById('status-modal').style.display = 'flex';
            }
          };

          function closeModal() {
            document.getElementById('status-modal').style.display = 'none';
            window.history.replaceState({}, document.title, "/");
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send("Database Error: " + err.message); }
});

// --- STRIPE LOGIC ---
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: items.map(i => ({
        price_data: { 
          currency: 'usd', 
          product_data: { name: i.name }, 
          unit_amount: i.price * 100 
        },
        quantity: 1,
      })),
      mode: 'payment',
      metadata: {
        "Name": customer.name,
        "Phone": customer.phone,
        "Email": customer.email,
        "Address": customer.address,
        "ZIP": customer.zip
      },
      payment_intent_data: {
        metadata: {
          "Name": customer.name,
          "Phone": customer.phone,
          "Email": customer.email,
          "Address": customer.address,
          "ZIP": customer.zip
        }
      },
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN PANEL ---
app.get('/admin', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  const items = result.rows.map(p => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee;">
      <div style="display:flex; align-items:center; gap:15px;">
        <img src="${p.image_path}" style="width:50px; height:50px; object-fit:cover;">
        <div>
          <div style="font-size:12px; font-weight:600; text-transform:uppercase;">${p.title_en}</div>
          <div style="font-size:12px; color:#888;">$${p.price}</div>
        </div>
      </div>
      <form action="/admin/delete/${p.id}" method="POST">
        <button type="submit" style="color:#ff4444; background:none; border:none; cursor:pointer; font-size:10px; font-weight:600; letter-spacing:1px;">REMOVE</button>
      </form>
    </div>
  `).join('');

  res.send(`
    ${style}
    <div class="admin-container">
      <h2 style="text-align:center; margin-bottom:40px;">Boutique Inventory</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Item Name" required class="input-field">
        <input name="price" type="number" placeholder="Price (USD)" required class="input-field">
        <div style="margin:20px 0;">
          <label style="font-size:10px; letter-spacing:1px; display:block; margin-bottom:10px;">PRODUCT IMAGE</label>
          <input name="image" type="file" required>
        </div>
        <button type="submit" class="buy-btn" style="background:#000; color:#fff; margin-top:20px;">Upload to Catalog</button>
      </form>
      <div style="margin-top:60px;">
        <h3 style="font-size:14px; margin-bottom:20px; color:#aaa;">Active Listings</h3>
        ${items}
      </div>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const imgPath = req.file ? req.file.path : '';
  if (imgPath) {
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [req.body.title_en, req.body.price, imgPath]);
  }
  res.redirect('/admin');
});

app.post('/admin/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
  res.redirect('/admin');
});

app.listen(process.env.PORT || 3000);
