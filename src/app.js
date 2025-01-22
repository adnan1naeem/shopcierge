require('dotenv').config();
const express = require('express');
const shopRoutes = require('./shops/shop.routes');
const orderRoutes = require('./orders/order.routes');
const chatRoutes = require('./chats/chat.routes');

const connectDB = require('./config/db.config');

const app = express();
connectDB();

app.use(express.json());
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chats', chatRoutes);

module.exports = app;
