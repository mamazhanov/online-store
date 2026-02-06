const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const app = express();

// Настройка облака Cloudinary
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

app.use(express.urlencoded({ extended: true }));

// Подключение к базе данных
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; line-height: 1.6; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }
  nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
  .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .nav-right { display: flex; align-items: center; gap: 20px; }
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: clamp(40px, 8vw, 80px); margin: 0; line-height: 1.1; }
  .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  .product-card { text-align: left; transition: 0.3s; }
  .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: 0.6s; }
  .product-card:hover .product-img { transform: scale(1.05); }
  .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; cursor: pointer; transition: 0.3s; width: 100%; margin-top: 10px; }
  .buy-btn:hover { background: #000; color: #fff; }
  #cart-sidebar { position: fixed; right: -450px; top: 0; width: 400px; height: 100%; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.1); z-index: 100; transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1); padding: 50px 40px; box-sizing: border-box; overflow-y: auto; color: #333; }
  #cart-sidebar.open { right: 0; }
  .close-btn { cursor: pointer; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; float: right; margin-bottom: 40px; opacity: 0.6; }
  input { width: 100%; padding: 15px; margin-bottom: 12px; border: 1px solid #eee; background: #fafafa; box-sizing: border-box; font-family: inherit; font-size: 13px; }
  input:focus { border-color: #000; outline: none; background: #fff; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path || ''}" class="product-img"></div>
        <div style="font-size:14px; text-transform:uppercase; letter-spacing:1px; font-weight:600;">${p.title_en}</div>
        <div style="color:#888; margin-top:5px; font-size:15px;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
      </div>
    `).join('');

    res.send(`
      ${style}
      <nav>
        <a href="/" class="logo">KYRGYZ MODERN</a>
        <div class="nav-right">
          <div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:11px; letter-spacing:2px;">Cart (<span id="count">0</span>)</div>
          <a href="/admin" style="text-decoration:none; color:rgba(255,255,255,0.7); font-size:11px; letter-spacing:1px;">ADMIN</a>
        </div>
      </nav>

      <div class="hero">
        <p style="text-transform:uppercase; letter-spacing:4px; font-size:11px; margin-bottom:20px; opacity:0.8;">Exclusive Heritage</p>
        <h1>Traditional Spirit,<br>Modern Soul.</h1>
      </div>

      <div class="container" id="collection">
        <div class="grid">${productsHtml || '<p style="grid-column: 1/-1; text-align: center; color: #888;">Collection is being updated...</p>'}</div>
      </div>

      <div id="cart-sidebar">
        <div class="close-btn" onclick="toggleCart()">Close ×</div>
        <h2 style="margin: 60px 0 30px 0; letter-spacing:3px; text-transform:uppercase; font-size:24px;">Your Bag</h2>
        <div id="cart-items" style="margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 20px;"></div>
        <div id="cart-total" style="font-weight:600; font-size:20px; margin-bottom:40px; display:flex; justify-content:space-between;">
          <span>Total</span><span id="total-val">$0</span>
        </div>
        
        <div id="checkout-form">
          <p style="font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px; color:#888;">Delivery Details</p>
          <input id="cust-name" placeholder="Full Name">
          <input id="cust-phone" placeholder="WhatsApp Number (e.g. 996...)">
          <button class="buy-btn" style="background:#000; color:#fff; padding: 18px;" onclick="sendOrder()">Place Order</button>
        </div>
      </div>

      <script>
        let cart = [];
        function addToCart(n, p) {
          cart.push({name: n, price: p});
          updateCart();
          if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart();
        }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          const itemsDiv = document.getElementById('cart-items');
          itemsDiv.innerHTML = cart.length ? cart.map((i, idx) => \`
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px;">
              <span>\${i.name}</span><span style="font-weight:600;">\$\${i.price}</span>
            </div>
          \`).join('') : '<p style="color:#888; font-size:13px;">Bag is empty</p>';
          const total = cart.reduce((sum, i) => sum + i.price, 0);
          document.getElementById('total-val').innerText = '$' + total;
        }
        function sendOrder() {
          const name = document.getElementById('cust-name').value;
          const phone = document.getElementById('cust-phone').value;
          if (cart.length === 0) return alert('Your bag is empty');
          if (!name || !phone) return alert('Please fill in your name and phone');
          const total = cart.reduce((sum, i) => sum + i.price, 0);
          const items = cart.map(i => i.name).join(', ');
          const message = "New Order!\\n-----------\\nCustomer: " + name + "\\nContact: " + phone + "\\nItems: " + items + "\\nTotal: $" + total;
          window.open("https://wa.me/996500002234?text=" + encodeURIComponent(message));
        }
      </script>
    `);
  } catch (err) { res.status(500).send("Error loading shop: " + err.message); }
});

app.get('/admin', (req, res) => {
  res.send(\`
    \${style}
    <div style="max-width:450px; margin:100px auto; padding:50px; border:1px solid #f0f0f0; background:#fff; box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
      <h2 style="margin-top:0; letter-spacing:2px; text-transform:uppercase;">Admin Portal</h2>
      <p style="font-size:12px; color:#888; margin-bottom:30px;">Add a new masterpiece to the collection.</p>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Product Title" required>
        <input name="price" type="number" placeholder="Price (USD)" required>
        <div style="margin: 20px 0;">
          <label style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888;">Product Image</label>
          <input name="image" type="file" required style="border:none; padding:10px 0; background:none;">
        </div>
        <button type="submit" class="buy-btn" style="background:#000; color:#fff; padding: 18px;">Upload to Collection</button>
      </form>
      <a href="/" style="display:block; text-align:center; margin-top:30px; font-size:11px; color:#888; text-decoration:none; letter-spacing:1px;">← BACK TO SHOP</a>
    </div>
  \`);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { title_en, price } = req.body;
    const imgPath = req.file ? req.file.path : '';
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imgPath]);
    res.redirect('/');
  } catch (err) { res.status(500).send("Upload Error: " + err.message); }
});

app.listen(process.env.PORT || 3000);
