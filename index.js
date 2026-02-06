const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

// Настройка хранилища для файлов
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

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title_en TEXT,
      title_ru TEXT,
      price DECIMAL,
      image_path TEXT
    )
  `);
}
initDB();

const style = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
  body { font-family: 'Inter', sans-serif; margin: 0; color: #1a1a1a; background: #fff; line-height: 1.6; }
  
  /* Header */
  nav { padding: 30px 8%; display: flex; justify-content: space-between; align-items: center; background: #fff; position: sticky; top: 0; z-index: 100; }
  .logo { font-size: 20px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; text-decoration: none; color: #000; }
  .nav-links a { text-decoration: none; color: #666; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-left: 25px; transition: 0.3s; }
  .nav-links a:hover { color: #000; }
  .nav-links a.active { color: #000; border-bottom: 1px solid #000; padding-bottom: 4px; }

  /* Hero Section */
  .hero { height: 60vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: #f8f7f5; border-bottom: 1px solid #eee; }
  .hero h1 { font-size: 42px; font-weight: 300; letter-spacing: -1px; margin: 0 0 15px 0; color: #1a1a1a; }
  .hero p { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin: 0; }

  /* Product Grid */
  .container { max-width: 1400px; margin: 0 auto; padding: 80px 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 60px 40px; }
  
  .product-card { text-decoration: none; color: inherit; display: block; group; }
  .image-wrapper { width: 100%; height: 450px; overflow: hidden; background: #f2f2f2; margin-bottom: 20px; position: relative; }
  .product-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
  .product-card:hover .product-img { transform: scale(1.05); }
  
  .product-info { text-align: left; }
  .product-title { font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .product-price { font-size: 14px; color: #777; font-weight: 300; }

  /* Admin Form */
  .admin-container { max-width: 600px; margin: 100px auto; padding: 40px; }
  h2 { font-weight: 400; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 40px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
  label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; display: block; margin-bottom: 8px; }
  input { width: 100%; padding: 15px 0; border: none; border-bottom: 1px solid #ddd; margin-bottom: 30px; font-family: inherit; font-size: 14px; outline: none; transition: 0.3s; }
  input:focus { border-bottom-color: #000; }
  .btn { background: #000; color: #fff; padding: 18px; border: none; width: 100%; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; cursor: pointer; transition: 0.3s; }
  .btn:hover { background: #333; }
  
  @media (max-width: 768px) {
    .hero h1 { font-size: 32px; }
    .grid { gap: 30px; }
    .image-wrapper { height: 350px; }
  }
</style>
`;

// ГЛАВНАЯ
app.get('/', async (req, res) => {
  const lang = req.query.lang || 'en';
  const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
  
  const translations = {
    en: { heroTitle: 'Authentic Craftsmanship', heroSub: 'Kyrgyz Modern Heritage', buy: 'View Details' },
    ru: { heroTitle: 'Истинное Мастерство', heroSub: 'Наследие Kyrgyz Modern', buy: 'Подробнее' }
  };
  const t = translations[lang];

  let productsHtml = result.rows.map(p => `
    <div class="product-card">
      <div class="image-wrapper">
        <img src="${p.image_path || ''}" class="product-img">
      </div>
      <div class="product-info">
        <div class="product-title">${lang === 'ru' ? (p.title_ru || p.title_en) : p.title_en}</div>
        <div class="product-price">$${p.price}</div>
      </div>
    </div>
  `).join('');

  res.send(`
    ${style}
    <nav>
      <a href="/?lang=${lang}" class="logo">KYRGYZ MODERN</a>
      <div class="nav-links">
        <a href="/?lang=en" class="${lang === 'en' ? 'active' : ''}">EN</a>
        <a href="/?lang=ru" class="${lang === 'ru' ? 'active' : ''}">RU</a>
        <a href="/admin">ADMIN</a>
      </div>
    </nav>
    <div class="hero">
      <p>${t.heroSub}</p>
      <h1>${t.heroTitle}</h1>
    </div>
    <div class="container">
      <div class="grid">${productsHtml || '<p style="grid-column: 1/-1; text-align: center; color: #999;">The collection is coming soon.</p>'}</div>
    </div>
  `);
});

// АДМИНКА
app.get('/admin', (req, res) => {
  res.send(`
    ${style}
    <div class="admin-container">
      <h2>Add to Collection</h2>
      <form action="/admin/add" method="POST" enctype="multipart/form-data">
        <label>Product Title (English)</label>
        <input name="title_en" required>
        
        <label>Название товара (Русский)</label>
        <input name="title_ru" required>
        
        <label>Price in USD</label>
        <input name="price" type="number" required>
        
        <label>Product Image</label>
        <input name="image" type="file" accept="image/*" required style="border:none;">
        
        <button type="submit" class="btn">Confirm & Save</button>
      </form>
      <br><center><a href="/" style="color:#aaa; text-decoration:none; font-size:11px; letter-spacing:1px; text-transform:uppercase;">← Back to shop</a></center>
    </div>
  `);
});

app.post('/admin/add', upload.single('image'), async (req, res) => {
  const { title_en, title_ru, price } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  await pool.query(
    'INSERT INTO products (title_en, title_ru, price, image_path) VALUES ($1, $2, $3, $4)', 
    [title_en, title_ru, price, imagePath]
  );
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Store running with new design and file uploads!'));
