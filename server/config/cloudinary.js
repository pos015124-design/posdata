/**
 * Cloudinary configuration for persistent image storage.
 *
 * Required environment variables (set in Render dashboard):
 *   CLOUDINARY_CLOUD_NAME  — your cloud name from cloudinary.com/console
 *   CLOUDINARY_API_KEY     — API key
 *   CLOUDINARY_API_SECRET  — API secret
 *
 * If these are not set the module returns null and uploadRoutes falls
 * back to local disk storage (development only).
 */

const cloudinary = require('cloudinary').v2;

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

const isConfigured =
  Boolean(CLOUDINARY_CLOUD_NAME) &&
  Boolean(CLOUDINARY_API_KEY) &&
  Boolean(CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key:    CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure:     true
  });
  console.log('[Cloudinary] ✅ Configured — images will be stored in the cloud');
} else {
  console.warn(
    '[Cloudinary] ⚠️  Not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET missing). ' +
    'Images will be stored on local disk — they will be lost on server restart. ' +
    'Set the three env vars in your Render dashboard to enable persistent storage.'
  );
}

module.exports = isConfigured ? cloudinary : null;
