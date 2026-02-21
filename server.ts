import express from 'express';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import multer from 'multer';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filename = req.body.filename || `${Date.now()}-${req.file.originalname}`;
      
      // Upload to Vercel Blob
      // Note: BLOB_READ_WRITE_TOKEN must be set in environment variables
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
      });

      res.json(blob);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
