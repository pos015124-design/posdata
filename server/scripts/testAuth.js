const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dukani_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAuth() {
  try {
    console.log('🔍 Testing authentication...');

    const user = await User.findOne({ email: 'test@dukani.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      hasPassword: !!user.password
    });

    // Test password
    const testPassword = 'TestPassword123!';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    console.log('🔐 Password test result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

    if (!isMatch) {
      console.log('🔧 Creating new password hash...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await User.updateOne(
        { email: 'test@dukani.com' },
        { password: newHash }
      );
      console.log('✅ Password updated successfully');
    }

  } catch (error) {
    console.error('❌ Error testing auth:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAuth();
