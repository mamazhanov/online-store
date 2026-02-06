const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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

app.use(express.urlencoded({ extended: true }));
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }
  nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
  .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #fff; font-weight: 600; }
  .nav-right { display: flex; align-items: center; gap: 20px; }
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: 80px; margin: 0; line-height: 1.1; }
  .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  .product-card { text-align: left; }
  .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
  .product-card:hover .product-img { transform: scale(1.05); }
  .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; cursor: pointer; transition: 0.3s; width: 100%; margin-top: 10px; }
  .buy-btn:hover { background: #000; color: #fff; }
  #cart-sidebar { position: fixed; right: -400px; top: 0; width: 350px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.1); z-index: 100; transition: 0.4s; padding: 40px; box-sizing: border-box; overflow-y: auto; color: #333; }
  #cart-sidebar.open { right: 0; }
  input { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; box-sizing: border-box; font-family: inherit; }
</style>
`;

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path || ''}" class="product-img"></div>
        <div style="font-size:14px; text-transform:uppercase;">${p.title_en}</div>
        <div style="color:#888;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
      </div>
    `).join('');

    res.send(`
      ${style}
      <nav>
        <a href="/" class="logo">KYRGYZ MODERN</a>
        <div class="nav-right">
          <div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:12px; letter-spacing:1px;">Cart (<span id="count">0</span>)</div>
          <a href="/admin" style="text-decoration:none; color:rgba(255,255,255,0.6); font-size:11px; letter-spacing:1px;">ADMIN</a>
        </div>
      </nav>

      <div class="hero">
        <p style="text-transform:uppercase; letter-spacing:3px; font-size:12px; margin-bottom:20px;">Heritage Collection</p>
        <h1>Tradition,<br>Reimagined.</h1>
      </div>

      <div class="container" id="collection">
        <div class="grid">${productsHtml || '<p>Our artisans are preparing new items...</p>'}</div>
      </div>

      <div id="cart-sidebar">
        <h2 onclick="toggleCart()" style="cursor:pointer; margin-top:0; letter-spacing:2px;">× CLOSE</h2>
        <div id="cart-items" style="margin: 30px 0;"></div>
        <div id="cart-total" style="font-weight:600; font-size:18px; border-top:1px solid #eee; padding-top:20px; margin-bottom:30px;">Total: $0</div>
        
        <div id="checkout-fields">
          <input id="cust-name" placeholder="Full Name">
          <input id="cust-phone" placeholder="WhatsApp Number">
          <button class="buy-btn" style="background:#000; color:#fff;" onclick="sendOrder()">Checkout via WhatsApp</button>
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
          itemsDiv.innerHTML = cart.map(i => \`
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px;">
              <span>\${i.name}</span><span>\$\${i.price}</span>
            </div>
          \`).join('');
          const total = cart.reduce((sum, i) => sum + i.price, 0);
          document.getElementById('cart-total').innerText = 'Total: $' + total;
        }
        function sendOrder() {
          const name = document.getElementById('cust-name').value;
          const phone = document.getElementById('cust-phone').value;
          if (cart.length === 0) return alert('Cart is empty');
          if (!name || !phone) return alert('Please enter your details');
          const total = cart.reduce((sum, i) => sum + i.price, 0);
          const items = cart.map(i => i.name).join(', ');
          const message = "New Order!\\nName: " + name + "\\nItems: " + items + "\\nTotal: $" + total;
          window.open("https://wa.me/996500002234?text=" + encodeURIComponent(message));
        }
      </script>
    `);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

app.get('/admin', (req, res) => {
  res.send(`
    ${style}
    <div style="max-width:400px; margin:100px auto; padding:40px; border:1px solid #eee;">
      <h2 style="margin-top:0;">Admin Panel</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Product Title" required>
        <input name="price" type="number" placeholder="Price (USD)" required>
        <input name="image" type="file" required style="border:none; margin: 10px 0;">
        <button type="submit" class="buy-btn" style="background:#000; color:#fff;">Upload to Cloud</button>
      </form>
      <a href="/" style="display:block; text-align:center; margin-top:20px; font-size:11px; color:#888; text-decoration:none;">Back to Shop</a>
    </div>
  `);
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
