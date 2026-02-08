const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

// Настройки Cloudinary
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
    background-size: cover; 
    background-position: center; 
    display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; 
  }
  .hero h1 { font-size: clamp(40px, 8vw, 90px); margin: 0; line-height: 0.9; }

  .container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
  
  /* ОБНОВЛЕННАЯ СЕТКА: 4 колонки для ПК, 2 для мобильных */
  .grid { 
    display: grid; 
    grid-template-columns: repeat(4, 1fr); 
    gap: 40px 20px; 
  }

  @media (max-width: 1024px) {
    .grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 768px) {
    .grid { grid-template-columns: repeat(2, 1fr); gap: 20px 15px; }
    .image-wrapper { height: 250px !important; }
    #cart-sidebar { width: 100% !important; }
  }

  .product-card { transition: 0.3s; }
  .image-wrapper { width: 100%; height: 400px; background: #f4f4f4; overflow: hidden; margin-bottom: 15px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.8s ease; }
  
  .buy-btn { border: 1px solid #1a1a1a; background: none; padding: 15px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: 0.3s; font-weight: 600; font-family: 'Montserrat'; }
  .buy-btn:hover { background: #1a1a1a; color: #fff; }

  #cart-sidebar { 
    position: fixed; right: -550px; top: 0; width: 500px; height: 100%; 
    background: #fff; box-shadow: -20px 0 60px rgba(0,0,0,0.15); z-index: 1000; 
    transition: 0.5s cubic-bezier(0.2, 1, 0.3, 1); 
    display: flex; flex-direction: column; max-width: 100vw;
  }
  #cart-sidebar.open { right: 0; }
  .cart-header { padding: 40px 40px 20px 40px; flex-shrink: 0; }
  .cart-body { padding: 0 40px; flex-grow: 1; overflow-y: auto; scrollbar-width: thin; }
  .cart-footer { padding: 30px 40px 40px 40px; flex-shrink: 0; border-top: 1px solid #eee; background: #fff; }

  .cart-item-img { width: 70px; height: 70px; object-fit: cover; background: #f9f9f9; }
  .qty-btn { border: 1px solid #ddd; background: none; width: 28px; height: 28px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
  
  .input-field { width: 100%; padding: 15px 0; margin-bottom: 10px; border: none; border-bottom: 1px solid #ddd; font-family: 'Montserrat'; font-size: 12px; outline: none; background: transparent; }
  #shipping-form { display: none; margin-top: 30px; border-top: 1px solid #f5f5f5; padding-top: 30px; }

  .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
  .modal-content { background: #fff; padding: 60px; text-align: center; max-width: 450px; width: 90%; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
        <div style="font-size:12px; text-transform:uppercase; font-weight:600; letter-spacing:1px; margin-bottom:5px;">${p.title_en}</div>
        <div style="color:#666; margin-bottom:12px; font-family:'Cormorant Garamond'; font-size:20px; font-style:italic;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price}, '${p.image_path}')">Add to Bag</button>
      </div>
    `).join('');

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
        
        <div id="cart-sidebar">
          <div class="cart-header">
            <div onclick="toggleCart()" style="cursor:pointer; opacity:0.5; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:20px;">Close [×]</div>
            <h2 style="font-size:24px; margin:0;">Your Selection</h2>
          </div>
          
          <div class="cart-body">
            <div id="cart-items" style="margin: 30px 0;"></div>
            <div id="shipping-form">
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
            <button id="main-cart-btn" class="buy-btn" style="background:#1a1a1a; color:#fff; padding:18px;" onclick="showOrderForm()">Proceed to Order</button>
          </div>
        </div>

        <div id="status-modal" class="modal-overlay">
          <div class="modal-content">
            <h2>Thank You</h2>
            <p style="color:#666; font-size:13px; margin-bottom:30px;">Your order has been received successfully.</p>
            <button class="buy-btn" onclick="closeModal()">Back to Shop</button>
          </div>
        </div>

        <script>
          let cart = {}; 
          function toggleCart() { 
            document.getElementById('cart-sidebar').classList.toggle('open'); 
            if (!document.getElementById('cart-sidebar').classList.contains('open')) {
                document.getElementById('shipping-form').style.display = 'none';
                const btn = document.getElementById('main-cart-btn');
                btn.innerText = 'Proceed to Order';
                btn.onclick = showOrderForm;
            }
          }
          function addToCart(n, p, img) { 
            if (cart[n]) cart[n].qty++;
            else cart[n] = { price: p, qty: 1, image: img };
            updateCart(); 
          }
          function changeQty(n, delta) {
            cart[n].qty += delta;
            if (cart[n].qty <= 0) delete cart[n];
            updateCart();
          }
          function updateCart() {
            const itemsDiv = document.getElementById('cart-items');
            const keys = Object.keys(cart);
            let total = 0;
            let count = 0;
            itemsDiv.innerHTML = keys.map(n => {
              const item = cart[n];
              total += item.price * item.qty;
              count += item.qty;
              return \`
                <div style="display:flex; gap:20px; align-items:center; margin-bottom:25px; border-bottom:1px solid #f9f9f9; padding-bottom:20px;">
                  <img src="\${item.image}" class="cart-item-img">
                  <div style="flex-grow:1;">
                    <div style="font-size:11px; font-weight:600; text-transform:uppercase;">\${n}</div>
                    <div style="font-family:'Cormorant Garamond'; font-size:18px; font-style:italic;">$\${item.price}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <button class="qty-btn" onclick="changeQty('\${n}', -1)">-</button>
                    <span style="font-size:13px; min-width:15px; text-align:center;">\${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('\${n}', 1)">+</button>
                  </div>
                </div>\`;
            }).join('');
            document.getElementById('count').innerText = count;
            document.getElementById('total-val').innerText = '$' + total;
            const btn = document.getElementById('main-cart-btn');
            if (count === 0) { btn.style.display = 'none'; } else { btn.style.display = 'block'; }
          }
          function showOrderForm() {
            document.getElementById('shipping-form').style.display = 'block';
            const btn = document.getElementById('main-cart-btn');
            btn.innerText = 'Pay Now';
            btn.onclick = checkout;
            document.querySelector('.cart-body').scrollTo({ top: 1000, behavior: 'smooth' });
          }
          async function checkout() {
            const customer = {
              name: document.getElementById('cust-name').value,
              email: document.getElementById('cust-email').value,
              phone: document.getElementById('cust-phone').value,
              address: document.getElementById('cust-address').value,
              zip: document.getElementById('cust-zip').value
            };
            if (!Object.values(customer).every(v => v.trim() !== '')) return alert('Please fill all fields');
            const btn = document.getElementById('main-cart-btn');
            btn.innerText = 'Redirecting...';
            const itemsArr = Object.keys(cart).map(n => ({ name: n, price: cart[n].price, qty: cart[n].qty }));
            try {
              const res = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsArr, customer })
              });
              const { url } = await res.json();
              if (url) window.location.href = url;
            } catch (e) { alert('Error'); btn.innerText = 'Pay Now'; }
          }
          window.onload = () => { if (new URLSearchParams(window.location.search).get('status') === 'success') document.getElementById('status-modal').style.display = 'flex'; };
          function closeModal() { window.location.href = '/'; }
        </script>
      </body>
      </html>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// ПЛАТЕЖИ И АДМИНКА
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: items.map(i => ({
        price_data: { currency: 'usd', product_data: { name: i.name }, unit_amount: i.price * 100 },
        quantity: i.qty,
      })),
      mode: 'payment',
      metadata: customer,
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
      <form action="/admin/delete/${p.id}" method="POST"><button type="submit" style="color:#ff4444; background:none; border:none; cursor:pointer;">Remove</button></form>
    </div>
  `).join('');
  res.send(`${style}<div style="max-width:500px; margin:50px auto; padding:40px; border:1px solid #eee; background:#fff;"><h2 style="text-align:center;">Admin Panel</h2><form action="/admin/add" method="POST" enctype="multipart/form-data"><input name="title_en" placeholder="Title" required class="input-field"><input name="price" type="number" placeholder="Price" required class="input-field"><input name="image" type="file" required style="margin:20px 0;"><button type="submit" class="buy-btn" style="background:#1a1a1a; color:#fff;">Upload</button></form><div style="margin-top:50px;">${items}</div></div>`);
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
