const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Montserrat:wght@300;400;600&display=swap');
  body { font-family: 'Montserrat', sans-serif; margin: 0; color: #333; background: #fff; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }

  nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; background: #fff; position: absolute; width: 90%; z-index: 10; }
  .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #000; font-weight: 600; }
  
  .nav-right { display: flex; align-items: center; gap: 20px; }
  .cart-icon { cursor: pointer; position: relative; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
  .cart-count { background: #000; color: #fff; border-radius: 50%; padding: 2px 6px; font-size: 10px; margin-left: 5px; }

  .hero { height: 100vh; background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 0 10%; color: #fff; }
  .hero h1 { font-size: 80px; margin: 0; }
  
  .container { max-width: 1200px; margin: 80px auto; padding: 0 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  
  .product-card { text-align: left; }
  .image-wrapper { width: 100%; height: 380px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; }
  
  .buy-btn { border: 1px solid #000; background: none; padding: 10px 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; cursor: pointer; transition: 0.3s; margin-top: 10px; }
  .buy-btn:hover { background: #000; color: #fff; }

  /* Cart Sidebar */
  #cart-sidebar { position: fixed; right: -400px; top: 0; width: 350px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.1); z-index: 100; transition: 0.4s; padding: 40px; box-sizing: border-box; }
  #cart-sidebar.open { right: 0; }
  .close-cart { cursor: pointer; float: right; font-size: 20px; }
</style>
`;

app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  let productsHtml = result.rows.map(p => `
    <div class="product-card">
      <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
      <div>${p.title_en}</div>
      <div style="color:#888">$${p.price}</div>
      <button class="buy-btn" onclick="addToCart('${p.title_en}', ${p.price})">Add to Cart</button>
    </div>
  `).join('');

  res.send(`
    ${style}
    <nav>
      <a href="/" class="logo">KYRGYZ MODERN</a>
      <div class="nav-right">
        <div class="cart-icon" onclick="toggleCart()">Cart <span class="cart-count" id="count">0</span></div>
        <a href="/admin" style="text-decoration:none; color:#888; font-size:11px;">ADMIN</a>
      </div>
    </nav>

    <div class="hero">
      <h1>Tradition,<br>Reimagined.</h1>
      <a href="#collection" style="color:#fff; text-transform:uppercase; font-size:12px; letter-spacing:2px; margin-top:30px;">Explore Collection</a>
    </div>

    <div class="container" id="collection">
      <h2 style="font-size:32px; margin-bottom:40px; text-align:center;">Featured Items</h2>
      <div class="grid">${productsHtml}</div>
    </div>

    <div id="cart-sidebar">
      <span class="close-cart" onclick="toggleCart()">×</span>
      <h2>Your Cart</h2>
      <div id="cart-items"></div>
      <hr>
      <div id="cart-total" style="font-weight:600; margin-bottom:20px;">Total: $0</div>
      <button class="buy-btn" style="width:100%" onclick="alert('Stripe coming soon!')">Checkout</button>
    </div>

    <script>
      let cart = [];
      function addToCart(name, price) {
        cart.push({name, price});
        updateCart();
      }
      function toggleCart() {
        document.getElementById('cart-sidebar').classList.toggle('open');
      }
      function updateCart() {
        document.getElementById('count').innerText = cart.length;
        const itemsDiv = document.getElementById('cart-items');
        itemsDiv.innerHTML = cart.map(i => \`<p>\${i.name} - \$\${i.price}</p>\`).join('');
        const total = cart.reduce((sum, i) => sum + i.price, 0);
        document.getElementById('cart-total').innerText = 'Total: $' + total;
      }
    </script>
  `);
});

// Админка остается прежней...
app.get('/admin', (req, res) => {
  res.send(`
    ${style}
    <div style="max-width:500px; margin:100px auto; padding:40px; border:1px solid #eee;">
      <h2>Add New Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <input name="title_en" placeholder="Title" required style="width:100%; padding:10px; margin-bottom:20px;">
        <input name="price" type="number" placeholder="Price" required style="width:100%; padding:10px; margin-bottom:20px;">
        <input name="image" type="file" required style="margin-bottom:20px;">
        <button type="submit" class="buy-btn" style="width:100%">Save</button>
      </form>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const { title_en, price } = req.body;
  const imagePath = req.file ? '/uploads/' + req.file.filename : '';
  await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imagePath]);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Store with Cart ready!'));
