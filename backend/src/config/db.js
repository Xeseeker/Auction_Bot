import mongoose from 'mongoose';
import { config } from './env.js';

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(config.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);

    if (error?.cause?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      console.error(`Configured MONGO_URI: ${config.MONGO_URI}`);
      console.error('MongoDB is not accepting connections on that address.');
      console.error('If you are using a local MongoDB install on Windows, start the "MongoDB" service.');
      console.error('If you are using MongoDB Atlas or another host, update MONGO_URI in backend/.env.');
    }

    process.exit(1);
  }
};

export default connectDB;
