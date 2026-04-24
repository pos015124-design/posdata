const express = require('express');
const router = express.Router();

const { requireUser } = require('./middleware/auth');

// Upload single product image
router.post('/product-image', requireUser, async (req, res) => {
  try {
    // Dynamically import multer to avoid startup crashes
    const upload = require('../config/upload');
    
    // Use multer middleware
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Upload multiple product images
router.post('/product-images', requireUser, async (req, res) => {
  try {
    const upload = require('../config/upload');
    
    await new Promise((resolve, reject) => {
      upload.array('images', 5)(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const imageUrls = req.files.map(file => ({
      url: `/uploads/products/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname
    }));
    
    res.json({
      success: true,
      images: imageUrls
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
});

// Delete uploaded image
router.delete('/product-image/:filename', requireUser, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', 'products', req.params.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
