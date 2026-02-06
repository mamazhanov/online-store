const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <div style="text-align:center; padding:50px; font-family: sans-serif;">
      <h1>🇰🇬 Kyrgyz Modern Store</h1>
      <p style="color: green; font-size: 20px;">✅ Сервер успешно запущен!</p>
      <p>База данных подключена. Мы готовы загружать витрину.</p>
    </div>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Сайт работает на порту ' + PORT));
