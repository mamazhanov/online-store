const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Создаем таблицу товаров при запуске
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

// ГЛАВНАЯ СТРАНИЦА (Витрина)
app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM products');
  let productsHtml = result.rows.map(p => `
    <div style="border:1px solid #ddd; padding:10px; margin:10px; display:inline-block; width:200px;">
      <img src="${p.image_url}" style="width:100%">
      <h3>${p.title_en}</h3>
      <p>$${p.price}</p>
    </div>
  `).join('');

  res.send(`
    <nav style="padding:20px; background:#f4f4f4;">
      <b>Kyrgyz Modern</b> | <a href="/admin">Admin Panel</a>
    </nav>
    <div style="padding:20px; text-align:center;">
      <h1>Welcome to Kyrgyz Modern</h1>
      <div id="catalog">${productsHtml || 'No products yet.'}</div>
    </div>
  `);
});

// АДМИНКА (Добавление товаров)
app.get('/admin', (req, res) => {
  res.send(`
    <div style="max-width:400px; margin:50px auto; font-family:sans-serif;">
      <h2>Add New Product</h2>
      <form action="/admin/add" method="POST">
        <input name="title_en" placeholder="Title (EN)" required style="width:100%; margin-bottom:10px;"><br>
        <input name="price" placeholder="Price (USD)" type="number" required style="width:100%; margin-bottom:10px;"><br>
        <input name="image_url" placeholder="Image URL (link)" required style="width:100%; margin-bottom:10px;"><br>
        <button type="submit" style="width:100%; background:black; color:white; padding:10px; border:none; cursor:pointer;">Save Product</button>
      </form>
      <br><a href="/">Back to Store</a>
    </div>
  `);
});

// ОБРАБОТКА ДОБАВЛЕНИЯ
app.post('/admin/add', async (req, res) => {
  const { title_en, price, image_url } = req.body;
  await pool.query('INSERT INTO products (title_en, price, image_url) VALUES ($1, $2, $3)', [title_en, price, image_url]);
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Store is ready!'));
