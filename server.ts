import express from 'express';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const supabaseUrl = 'https://thqocawdihcsvtkluddy.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocW9jYXdkaWhjc3Z0a2x1ZGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMwODMsImV4cCI6MjA4NjMxOTA4M30.qecVHx2IaW8dOdzHNS3K7d-2hBwvh7EMI9pOP4crMjQ';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Configure Multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/login', async (req, res) => {
    console.log('Login attempt for:', req.body?.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, restaurant_id, is_active, email, phone, password')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) {
        console.log('Login failed for:', username);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (data.is_active === false) {
        console.log('Account deactivated for:', username);
        return res.status(403).json({ error: 'Account deactivated' });
      }

      // Map to camelCase to match frontend User interface
      const userResponse = {
        id: data.id,
        username: data.username,
        role: data.role,
        restaurantId: data.restaurant_id,
        isActive: data.is_active,
        email: data.email,
        phone: data.phone
      };
      
      console.log('Login successful for:', username);
      res.json(userResponse);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
