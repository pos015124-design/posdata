const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { requireUser } = require('../middleware/validation');

// Upload single product image
router.post('/product-image', requireUser, upload.single('image'), (req, res) => {
  try {
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
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple product images
router.post('/product-images', requireUser, upload.array('images', 5), (req, res) => {
  try {
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
    res.status(500).json({ error: error.message });
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
