const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    console.error('Error: MONGO_URI and MONGODB_DB must be defined in the environment.');
    process.exit(1);
  }

  if (process.env.MONGODB_DB == "ShopData-Prod") {
    console.error('Error: can not connect with prod db');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
      autoCreate: false,
    });
    console.log('MongoDB Connected...');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
