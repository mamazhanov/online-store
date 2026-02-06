const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const app = express();

// Проверка наличия переменных (чтобы не гадать)
if (!process.env.CLOUDINARY_NAME) {
  console.error("ОШИБКА: Переменные Cloudinary не найдены в Railway!");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kyrgyz_modern',
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Важно для стабильного соединения
});

// Добавим обработчик ошибок для всей страницы
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    
    // Весь твой HTML код (стили и верстка)
    const style = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
      body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; }
      h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }
      nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; position: absolute; width: 90%; z-index: 10; }
      .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #000; font-weight: 600; }
      .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 0 10%; color: #fff; }
      .hero h1 { font-size: 80px; margin: 0; }
      .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
      .product-card { text-align: left; }
      .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
      .product-img { width: 100%; height: 100%; object-fit: cover; }
      .buy-btn { border: 1px solid #000; background: none; padding: 12px 20px; text-transform: uppercase; font-size: 10px; cursor: pointer; width: 100%; }
      #cart-sidebar { position: fixed; right: -400px; top: 0; width: 350px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.1); z-index: 100; transition: 0.4s; padding: 40px; box-sizing: border-box; }
      #cart-sidebar.open { right: 0; }
    </style>`;

    let productsHtml = result.rows.map(p => `
      <div class="product-card">
        <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
        <div style="font-size:14px; text-transform:uppercase;">${p.title_en}</div>
        <div style="color:#888; margin-top:5px;">$${p.price}</div>
        <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
      </div>
    `).join('');

    res.send(`
      ${style}
      <nav><a href="/" class="logo">KYRGYZ MODERN</a><div onclick="toggleCart()" style="cursor:pointer">Cart <span id="count">0</span></div></nav>
      <div class="hero"><h1>Tradition,<br>Reimagined.</h1></div>
      <div class="container"><div class="grid">${productsHtml}</div></div>
      <div id="cart-sidebar">
        <h2 onclick="toggleCart()" style="cursor:pointer">× Close</h2>
        <div id="cart-items"></div>
        <div id="cart-total" style="font-weight:600; margin-top:20px;">Total: $0</div>
        <input id="cust-name" placeholder="Name" style="width:100%; margin-top:20px; padding:10px;">
        <input id="cust-phone" placeholder="WhatsApp" style="width:100%; margin-top:10px; padding:10px;">
        <button class="buy-btn" style="background:#000; color:#fff; margin-top:10px;" onclick="sendOrder()">Checkout</button>
      </div>
      <script>
        let cart = [];
        function addToCart(n, p) { cart.push({name:n, price:p}); updateCart(); toggleCart(); }
        function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('open'); }
        function updateCart() {
          document.getElementById('count').innerText = cart.length;
          document.getElementById('cart-items').innerHTML = cart.map(i => \`<p>\${i.name} - \$\${i.price}</p>\`).join('');
          document.getElementById('cart-total').innerText = 'Total: $' + cart.reduce((s, i) => s + i.price, 0);
        }
        function sendOrder() {
          const n = document.getElementById('cust-name').value;
          const p = document.getElementById('cust-phone').value;
          const msg = "New Order!\\nName: " + n + "\\nTotal: $" + cart.reduce((s,i)=>s+i.price,0);
          window.open("https://wa.me/996500002234?text=" + encodeURIComponent(msg));
        }
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error: " + err.message);
  }
});

// Админка
app.get('/admin', (req, res) => {
  res.send(`
    <div style="max-width:400px; margin:100px auto; font-family:sans-serif;">
      <h2>Add Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Title" required style="width:100%; margin-bottom:10px; padding:10px;">
        <input name="price" type="number" placeholder="Price" required style="width:100%; margin-bottom:10px; padding:10px;">
        <input name="image" type="file" required style="margin-bottom:10px;">
        <button type="submit" style="width:100%; padding:10px; background:#000; color:#fff; border:none; cursor:pointer;">Upload</button>
      </form>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  try {
    const { title_en, price } = req.body;
    const imagePath = req.file ? req.file.path : '';
    await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imagePath]);
    res.redirect('/');
  } catch (err) {
    res.status(500).send("Upload Error: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server is running...'));
