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

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper">
          <img src="${p.image_path || 'https://via.placeholder.com/400x500'}" class="product-img">
        </div>
        <div style="font-size:14px; text-transform:uppercase; margin-top:10px;">${p.title_en || 'Item'}</div>
        <div style="color:#888;">$${p.price || 0}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
      </div>
    `).join('');

    res.send(`
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond&family=Montserrat:wght@300;400;600&display=swap');
        body { font-family: 'Montserrat', sans-serif; margin: 0; background: #fff; }
        nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; color: #fff; }
        .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
        .hero h1 { font-family: 'Cormorant Garamond', serif; font-size: 80px; margin: 0; }
        .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
        .image-wrapper { width: 100%; height: 380px; overflow: hidden; background: #f7f7f7; }
        .product-img { width: 100%; height: 100%; object-fit: cover; }
        .buy-btn { border: 1px solid #000; background: none; padding: 12px; width: 100%; margin-top: 10px; cursor: pointer; text-transform: uppercase; font-size: 10px; }
        #cart-sidebar { position: fixed; right: -400px; top: 0; width: 350px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.1); z-index: 100; transition: 0.4s; padding: 40px; }
        #cart-sidebar.open { right: 0; }
      </style>
      <nav><strong>KYRGYZ MODERN</strong> <div onclick="tgl()" style="cursor:pointer">Cart (<span id="cnt">0</span>)</div></nav>
      <div class="hero"><h1>Tradition,<br>Reimagined.</h1></div>
      <div class="container"><div class="grid">${productsHtml || 'Your collection is empty.'}</div></div>
      <div id="cart-sidebar">
        <h2 onclick="tgl()" style="cursor:pointer">× CLOSE</h2>
        <div id="items"></div>
        <button class="buy-btn" style="background:#000; color:#fff;" onclick="alert('Order sent to WhatsApp!')">Checkout</button>
      </div>
      <script>
        let c = [];
        function addToCart(n,p) { c.push({n,p}); document.getElementById('cnt').innerText = c.length; tgl(); update(); }
        function tgl() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function update() { document.getElementById('items').innerHTML = c.map(i=>\`<p>\${i.n} - \$\${i.p}</p>\`).join(''); }
      </script>
    `);
  } catch (err) { res.status(500).send("Database Error: " + err.message); }
});

app.get('/admin', (req, res) => {
  res.send(`
    <div style="max-width:400px; margin:100px auto; font-family:sans-serif;">
      <h2>Add Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Title" required style="width:100%; padding:10px; margin-bottom:10px;">
        <input name="price" type="number" placeholder="Price" required style="width:100%; padding:10px; margin-bottom:10px;">
        <input name="image" type="file" required>
        <button type="submit" style="width:100%; padding:10px; background:#000; color:#fff; border:none; margin-top:10px;">Upload</button>
      </form>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { title_en, price } = req.body;
    // ВАЖНО: req.file.path теперь ВСЕГДА будет ссылкой на Cloudinary
    const img = req.file ? req.file.path : '';
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, img]);
    res.redirect('/');
  } catch (err) { res.status(500).send("Upload Error: " + err.message); }
});

app.listen(process.env.PORT || 3000);
