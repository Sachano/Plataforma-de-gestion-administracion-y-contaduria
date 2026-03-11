require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/debts', require('./routes/debts'));
app.use('/api/exchange-rates', require('./routes/exchange-rates'));

app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido a la API de Donde Jenny' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
