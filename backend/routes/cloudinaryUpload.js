// backend/routes/cloudinaryUpload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: __dirname + '/../.env' });

// Multer ayarları (bellekte tut)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('Received upload request');
    if (!req.file) {
      console.log('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const streamifier = require('streamifier');
    // upload_stream'i Promise'e sarıyoruz
    const uploadFromBuffer = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          resource_type: 'auto',
          folder: 'chatapp_uploads',
        }, (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(stream);
      });
    };
    const result = await uploadFromBuffer(req.file.buffer);
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
