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
  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: clamp(40px, 8vw, 80px); margin: 0; line-height: 1.1; }
  .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; }
  .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; cursor: pointer; width: 100%; margin-top: 10px; transition: 0.3s; }
  .buy-btn:hover { background: #000; color: #fff; }
  #cart-sidebar { position: fixed; right: -450px; top: 0; width: 400px; height: 100%; background: #fff; box-shadow: -10px 0 30px rgba(0,0,0,0.1); z-index: 100; transition: 0.5s; padding: 50px 40px; box-sizing: border-box; overflow-y: auto; }
  #cart-sidebar.open { right: 0; }
  input { width: 100%; padding: 15px; margin-bottom: 12px; border: 1px solid #eee; font-family: inherit; box-sizing: border-box; }
  .admin-item { display: flex; align-items: center; gap: 15px; padding: 10px; border-bottom: 1px solid #eee; margin-bottom: 10px; }
  .del-btn { background: #ff4444; color: #fff; border: none; padding: 5px 10px; cursor: pointer; font-size: 10px; text-transform: uppercase; }
</style>
`;

// ГЛАВНАЯ СТРАНИЦА
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path || ''}" class="product-img"></div>
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
      <div class="hero"><h1>Tradition,<br>Reimagined.</h1></div>
      <div class="container"><div class="grid">${productsHtml || 'Collection is being updated...'}</div></div>
      <div id="cart-sidebar">
        <div onclick="toggleCart()" style="cursor:pointer; float:right; opacity:0.5;">CLOSE ×</div>
        <h2 style="margin-top:60px; text-transform:uppercase;">Your Bag</h2>
        <div id="cart-items" style="margin: 30px 0;"></div>
        <div style="display:flex; justify-content:space-between; font-weight:600; font-size:20px; margin-bottom:40px;">
          <span>Total</span><span id="total-val">$0</span>
        </div>
        <input id="cust-name" placeholder="Full Name">
        <input id="cust-phone" placeholder="WhatsApp (e.g. 996...)">
        <button class="buy-btn" style="background:#000; color:#fff; padding: 18px;" onclick="sendOrder()">Checkout via WhatsApp</button>
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
        function sendOrder() {
          const name = document.getElementById('cust-name').value;
          const phone = document.getElementById('cust-phone').value;
          if (!name || !phone || cart.length === 0) return alert('Fill info');
          const msg = "Order: " + cart.map(i=>i.name).join(', ') + " Total: $" + cart.reduce((s,i)=>s+i.price,0);
          window.open("https://wa.me/996500002234?text=" + encodeURIComponent(msg));
        }
      </script>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// АДМИНКА (Добавление + Список с удалением)
app.get('/admin', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let itemsList = result.rows.map(p => `
      <div class="admin-item">
        <img src="${p.image_path}" style="width:50px; height:50px; object-fit:cover;">
        <div style="flex:1; font-size:12px;"><b>${p.title_en}</b><br>$${p.price}</div>
        <form action="/admin/delete/${p.id}" method="POST" onsubmit="return confirm('Delete this item?')">
          <button type="submit" class="del-btn">Delete</button>
        </form>
      </div>
    `).join('');

    res.send(`
      ${style}
      <div style="max-width:500px; margin:50px auto; padding:40px; border:1px solid #eee;">
        <h2 style="margin-top:0; letter-spacing:2px;">ADMIN PANEL</h2>
        
        <form action="/admin/add" method="POST" enctype="multipart/form-data" style="margin-bottom:50px; padding-bottom:30px; border-bottom:2px solid #000;">
          <p><b>Add New Product</b></p>
          <input name="title_en" placeholder="Product Title" required>
          <input name="price" type="number" placeholder="Price (USD)" required>
          <input name="image" type="file" required style="border:none; padding:10px 0;">
          <button type="submit" class="buy-btn" style="background:#000; color:#fff; padding: 15px;">Upload to Shop</button>
        </form>

        <p><b>Current Inventory (${result.rowCount})</b></p>
        <div>${itemsList || 'No products yet.'}</div>
        
        <a href="/" style="display:block; text-align:center; margin-top:30px; font-size:11px; color:#888; text-decoration:none;">← BACK TO SHOP</a>
      </div>
    `);
  } catch (err) { res.status(500).send(err.message); }
});

// ДОБАВЛЕНИЕ
app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { title_en, price } = req.body;
    const imgPath = req.file ? req.file.path : '';
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imgPath]);
    res.redirect('/admin');
  } catch (err) { res.status(500).send(err.message); }
});

// УДАЛЕНИЕ
app.post('/admin/delete/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.redirect('/admin');
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(process.env.PORT || 3000);
