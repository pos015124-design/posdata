const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        console.log('📍 Database URL:', process.env.DATABASE_URL);

        await mongoose.connect(process.env.DATABASE_URL, {
            autoIndex: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        });

        console.log('✅ MongoDB Connected successfully!');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('📋 Full error:', err);
        // Don't exit immediately, let the app continue for debugging
        throw err;
    }
};

module.exports = { connectDB };