const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const app = express();

// Конфигурация облака
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'kyrgyz_modern', allowed_formats: ['jpg', 'png', 'jpeg'] }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));

// Улучшенное подключение к базе данных
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Это решает 90% проблем с Internal Server Error в Railway
});

app.get('/', async (req, res) => {
  try {
    // Пробуем достать данные. Если какого-то столбца нет, упадем в блок catch
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    
    let productsHtml = result.rows.map(p => {
      // Подстраховка: если фото нет в новом формате, пробуем старый или ставим заглушку
      const photo = p.image_path || p.image_url || 'https://via.placeholder.com/400x500?text=No+Image';
      return `
        <div class="product-card">
          <div class="image-wrapper"><img src="${photo}" class="product-img"></div>
          <div style="font-size:14px; text-transform:uppercase; letter-spacing:1px; margin-top:10px;">${p.title_en || 'Untitled'}</div>
          <div style="color:#888; margin-top:5px;">$${p.price || 0}</div>
          <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
        </div>
      `;
    }).join('');

    const style = `<style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
      body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; }
      h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }
      nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; }
      .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #000; font-weight: 600; }
      .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
      .hero h1 { font-size: 80px; margin: 0; line-height: 1; }
      .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
      .product-card { text-align: left; }
      .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; }
      .product-img { width: 100%; height: 100%; object-fit: cover; }
      .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; cursor: pointer; width: 100%; margin-top: 10px; }
      #cart-sidebar { position: fixed; right: -400px; top: 0; width: 350px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.1); z-index: 100; transition: 0.4s; padding: 40px; box-sizing: border-box; }
      #cart-sidebar.open { right: 0; }
    </style>`;

    res.send(`
      ${style}
      <nav><a href="/" class="logo">KYRGYZ MODERN</a><div onclick="toggleCart()" style="cursor:pointer; text-transform:uppercase; font-size:12px; letter-spacing:1px;">Cart (<span id="count">0</span>)</div></nav>
      <div class="hero">
        <p style="text-transform:uppercase; letter-spacing:3px; font-size:12px;">Heritage Collection</p>
        <h1>Tradition,<br>Reimagined.</h1>
      </div>
      <div class="container"><div class="grid">${productsHtml || '<p>No products found.</p>'}</div></div>
      <div id="cart-sidebar">
        <h2 onclick="toggleCart()" style="cursor:pointer; margin-bottom:30px;">× CLOSE</h2>
        <div id="cart-items"></div>
        <div id="cart-total" style="font-weight:600; margin-top:20px; font-size:18px;">Total: $0</div>
        <button class="buy-btn" style="background:#000; color:#fff; margin-top:20px;" onclick="sendOrder()">Checkout via WhatsApp</button>
      </div>
      <script>
        let cart = [];
        function addToCart(n, p) { cart.push({name:n, price:p}); updateCart(); if(!document.getElementById('cart-sidebar').classList.contains('open')) toggleCart(); }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          document.getElementById('cart-items').innerHTML = cart.map(i => \`<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>\${i.name}</span><span>\$\${i.price}</span></div>\`).join('');
          document.getElementById('cart-total').innerText = 'Total: $' + cart.reduce((s, i) => s + i.price, 0);
        }
        function sendOrder() {
          if(cart.length === 0) return alert('Cart is empty');
          const msg = "New Order from Kyrgyz Modern!\\nTotal: $" + cart.reduce((s,i)=>s+i.price,0);
          window.open("https://wa.me/996500002234?text=" + encodeURIComponent(msg));
        }
      </script>
    `);
  } catch (err) {
    console.error("DETAILED ERROR:", err);
    res.status(500).send("<h3>Something went wrong</h3><p>" + err.message + "</p>");
  }
});

// Админка
app.get('/admin', (req, res) => {
  res.send(`
    <div style="max-width:400px; margin:100px auto; font-family:sans-serif; border:1px solid #eee; padding:40px;">
      <h2>Add New Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Product Title" required style="width:100%; margin-bottom:10px; padding:12px; border:1px solid #ddd;">
        <input name="price" type="number" placeholder="Price (USD)" required style="width:100%; margin-bottom:10px; padding:12px; border:1px solid #ddd;">
        <input name="image" type="file" required style="margin-bottom:20px;">
        <button type="submit" style="width:100%; padding:15px; background:#000; color:#fff; border:none; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">Upload Product</button>
      </form>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { title_en, price } = req.body;
    // req.file.path — это прямая ссылка от Cloudinary
    const imagePath = req.file ? req.file.path : '';
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imagePath]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send("Upload Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Ready!'));
