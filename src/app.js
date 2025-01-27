require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Import the CORS middleware
const shopRoutes = require('./shops/shop.routes');
const orderRoutes = require('./orders/order.routes');
const chatRoutes = require('./chats/chat.routes');

const connectDB = require('./config/db.config');

const app = express();
connectDB();

// Allow CORS for localhost:3001
app.use(
  cors({
    origin: 'http://localhost:3000', // Specify the allowed origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
    credentials: true, // Allow cookies or other credentials
  })
);

app.use(express.json());
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chats', chatRoutes);

module.exports = app;
