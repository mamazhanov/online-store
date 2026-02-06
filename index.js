const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Настройка загрузки фото
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
  h1, h2, h3 { font-family: 'Cormorant Garamond', serif; font-weight: 400; }

  nav { padding: 25px 5%; display: flex; justify-content: space-between; align-items: center; background: #fff; position: absolute; width: 90%; z-index: 10; }
  .logo { font-size: 22px; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; color: #000; font-weight: 600; }
  .nav-links a { text-decoration: none; color: #444; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-left: 20px; }

  /* Hero Section по референсу */
  .hero { 
    height: 100vh; 
    background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url('https://images.unsplash.com/photo-1569330132151-69767228308d?q=80&w=2000'); 
    background-size: cover; background-position: center;
    display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
    padding: 0 10%; color: #fff;
  }
  .hero h1 { font-size: 80px; margin: 0; line-height: 0.9; }
  .hero p { font-size: 18px; margin: 20px 0 40px; }
  .shop-now { background: #fff; color: #000; padding: 15px 40px; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }

  /* Категории */
  .categories { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px 5%; }
  .cat-card { height: 400px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; text-decoration: none; position: relative; }
  .cat-card::after { content: ''; position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.2); }
  .cat-card span { position: relative; z-index: 2; color: #fff; font-size: 40px; font-family: 'Cormorant Garamond', serif; }

  /* Сетка товаров */
  .featured-title { text-align: center; margin: 80px 0 40px; font-size: 36px; color: #555; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 5% 100px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 40px; }
  .product-card { text-align: left; }
  .image-wrapper { width: 100%; height: 350px; background: #f7f7f7; overflow: hidden; margin-bottom: 15px; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: 0.5s; }
  .product-card:hover .product-img { transform: scale(1.05); }
  .product-title { font-size: 14px; margin-bottom: 5px; color: #333; }
  .product-price { font-size: 14px; color: #888; }

  /* Админка */
  .admin-form { max-width: 500px; margin: 100px auto; padding: 40px; border: 1px solid #eee; font-family: sans-serif; }
  input { width: 100%; padding: 12px; margin: 10px 0 25px; border: 1px solid #ddd; }
</style>
`;

app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  let productsHtml = result.rows.map(p => `
    <div class="product-card">
      <div class="image-wrapper"><img src="${p.image_path}" class="product-img"></div>
      <div class="product-title">${p.title_en}</div>
      <div class="product-price">$${p.price}</div>
    </div>
  `).join('');

  res.send(`
    ${style}
    <nav>
      <a href="/" class="logo">KYRGYZ MODERN</a>
      <div class="nav-links"><a href="/admin">ADMIN</a></div>
    </nav>
    <div class="hero">
      <h1>Tradition,<br>Reimagined.</h1>
      <p>Heritage craft for the modern home</p>
      <a href="#collection" class="shop-now">Shop Now</a>
    </div>
    <div class="categories">
      <a href="#" class="cat-card" style="background-image: url('https://images.unsplash.com/photo-1605902711622-cf243b1217b5?q=80&w=1000')"><span>Clothing</span></a>
      <a href="#" class="cat-card" style="background-image: url('https://images.unsplash.com/photo-1618108571493-68f449e7b288?q=80&w=1000')"><span>Tableware</span></a>
    </div>
    <h2 class="featured-title" id="collection">Featured Collection</h2>
    <div class="container"><div class="grid">${productsHtml}</div></div>
  `);
});

app.get('/admin', (req, res) => {
  res.send(`
    ${style}
    <div class="admin-form">
      <h2>Add New Product</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <label>Title</label><input name="title_en" required>
        <label>Price ($)</label><input name="price" type="number" required>
        <label>Image File</label><input name="image" type="file" accept="image/*" required>
        <button type="submit" class="shop-now" style="width:100%; border:none; cursor:pointer;">Save Product</button>
      </form>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const { title_en, price } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
  await pool.query('INSERT INTO products (title_en, price, image_path) VALUES ($1, $2, $3)', [title_en, price, imagePath]);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Final Design Ready!'));
