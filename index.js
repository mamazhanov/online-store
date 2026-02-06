const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title_en TEXT,
      title_ru TEXT,
      price DECIMAL,
      image_url TEXT
    )
  `);
}
initDB();

// СТИЛИ CSS (Минимализм и Этно-премиум)
const style = `
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; color: #333; background: #fff; }
  nav { padding: 20px 5%; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
  .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
  .admin-link { text-decoration: none; color: #888; font-size: 14px; }
  .hero { padding: 100px 5%; text-align: center; background: #f9f9f9; }
  .hero h1 { font-size: 48px; margin-bottom: 10px; font-weight: 300; }
  .container { padding: 50px 5%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 40px; }
  .product-card { text-align: center; transition: 0.3s; }
  .product-card:hover { opacity: 0.8; }
  .product-img { width: 100%; height: 350px; object-fit: cover; background: #eee; margin-bottom: 15px; }
  .product-title { font-size: 18px; margin: 10px 0; font-weight: 400; text-transform: uppercase; }
  .product-price { font-size: 16px; color: #666; margin-bottom: 15px; }
  .buy-btn { background: #000; color: #fff; padding: 12px 25px; text-decoration: none; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
  .admin-form { max-width: 500px; margin: 50px auto; padding: 30px; border: 1px solid #eee; }
  input { width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #ddd; box-sizing: border-box; }
</style>
`;

// ГЛАВНАЯ СТРАНИЦА
app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM products');
  let productsHtml = result.rows.map(p => `
    <div class="product-card">
      <img src="${p.image_url}" class="product-img">
      <div class="product-title">${p.title_en}</div>
      <div class="product-price">$${p.price}</div>
      <a href="#" class="buy-btn">Add to Cart</a>
    </div>
  `).join('');

  res.send(`
    ${style}
    <nav>
      <div class="logo">Kyrgyz Modern</div>
      <a href="/admin" class="admin-link">ADMIN PANEL</a>
    </nav>
    <div class="hero">
      <h1>Handcrafted Elegance</h1>
      <p>Authentic products from the heart of Kyrgyzstan</p>
    </div>
    <div class="container">
      <div class="grid">${productsHtml || '<p style="text-align:center; width:100%;">Collection is being updated...</p>'}</div>
    </div>
  `);
});

// АДМИНКА
app.get('/admin', (req, res) => {
  res.send(`
    ${style}
    <div class="admin-form">
      <h2>Add New Product</h2>
      <form action="/admin/add" method="POST">
        <input name="title_en" placeholder="Product Title (English)" required>
        <input name="price" placeholder="Price (USD)" type="number" required>
        <input name="image_url" placeholder="Image Link (URL)" required>
        <button type="submit" class="buy-btn" style="width:100%; cursor:pointer;">Save to Catalog</button>
      </form>
      <br><center><a href="/" class="admin-link">← Back to Shop</a></center>
    </div>
  `);
});

app.post('/admin/add', async (req, res) => {
  const { title_en, price, image_url } = req.body;
  await pool.query('INSERT INTO products (title_en, price, image_url) VALUES ($1, $2, $3)', [title_en, price, image_url]);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('E-commerce site updated!'));
