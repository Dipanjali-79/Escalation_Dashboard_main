const serverless = require('serverless-http');
const mongoose = require('mongoose');

// Cache connection across warm invocations
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const uri = process.env.MONGO_URL || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('No MongoDB URI found in environment variables');
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    bufferCommands: false,
  });

  cachedDb = conn;
  return cachedDb;
}

const app = require('../server');

module.exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for the event loop to empty
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();
  } catch (err) {
    console.error('DB connection error in handler:', err.message);
  }

  const handler = serverless(app);
  return handler(event, context);
};
