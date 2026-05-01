/**
 * Upload Routes — persistent image storage via Cloudinary.
 *
 * When CLOUDINARY_* env vars are set (production on Render):
 *   - Images are uploaded directly to Cloudinary using a memory buffer.
 *   - The returned imageUrl is a full https://res.cloudinary.com/... URL.
 *   - Files are never written to local disk, so Render restarts don't
 *     lose images.
 *
 * When Cloudinary is NOT configured (local dev):
 *   - Falls back to multer disk storage (original behaviour).
 *   - Returns a relative /uploads/products/... URL.
 */

const express = require('express');
const router = express.Router();
const { requireUser } = require('./middleware/auth');
const cloudinary = require('../config/cloudinary');

/* ── helpers ─────────────────────────────────────────────────────── */

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param {Buffer} buffer  - File buffer from multer memoryStorage
 * @param {string} originalName - Original filename (used for public_id hint)
 */
function uploadToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const publicId = `products/product-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'dukani/products',
        public_id: publicId,
        overwrite: false,
        resource_type: 'image',
        transformation: [
          // Resize to max 1200px wide, keep aspect ratio, auto quality
          { width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

/* ── multer setup ─────────────────────────────────────────────────── */

function getMulter() {
  const multer = require('multer');
  const path   = require('path');

  const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  };

  const limits = { fileSize: 5 * 1024 * 1024 }; // 5 MB

  if (cloudinary) {
    // Memory storage — buffer is passed directly to Cloudinary
    return multer({ storage: multer.memoryStorage(), limits, fileFilter });
  } else {
    // Disk storage fallback for local dev
    return require('../config/upload');
  }
}

/* ── POST /api/uploads/product-image ─────────────────────────────── */
router.post('/product-image', requireUser, async (req, res) => {
  try {
    const upload = getMulter();

    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, err => (err ? reject(err) : resolve()));
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    let imageUrl;

    if (cloudinary) {
      // Upload buffer to Cloudinary
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    } else {
      // Local disk fallback
      imageUrl = `/uploads/products/${req.file.filename}`;
    }

    res.json({
      success: true,
      imageUrl,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('[Upload] product-image error:', error.message);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

/* ── POST /api/uploads/product-images (bulk) ─────────────────────── */
router.post('/product-images', requireUser, async (req, res) => {
  try {
    const upload = getMulter();

    await new Promise((resolve, reject) => {
      upload.array('images', 5)(req, res, err => (err ? reject(err) : resolve()));
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    let imageUrls;

    if (cloudinary) {
      const urls = await Promise.all(
        req.files.map(f => uploadToCloudinary(f.buffer, f.originalname))
      );
      imageUrls = urls.map((url, i) => ({
        url,
        originalName: req.files[i].originalname
      }));
    } else {
      imageUrls = req.files.map(file => ({
        url: `/uploads/products/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname
      }));
    }

    res.json({ success: true, images: imageUrls });
  } catch (error) {
    console.error('[Upload] product-images error:', error.message);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

/* ── DELETE /api/uploads/product-image/:filename ─────────────────── */
router.delete('/product-image/:filename', requireUser, async (req, res) => {
  try {
    const { filename } = req.params;

    if (cloudinary) {
      // filename here is the Cloudinary public_id or the last segment of the URL
      // We stored the full URL, so deletion is best-effort
      try {
        // Extract public_id from URL if it looks like a Cloudinary URL
        const publicIdMatch = filename.match(/dukani\/products\/(.+)$/);
        if (publicIdMatch) {
          await cloudinary.uploader.destroy(`dukani/products/${publicIdMatch[1]}`);
        }
      } catch {
        // Non-critical — Cloudinary cleanup is best-effort
      }
      return res.json({ success: true, message: 'Image removed' });
    }

    // Local disk fallback
    const fs   = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'uploads', 'products', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'Image deleted' });
    }
    res.status(404).json({ error: 'Image not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
