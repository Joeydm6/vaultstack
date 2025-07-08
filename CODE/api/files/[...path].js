// Vercel serverless function for file operations
const express = require('express');
const multer = require('multer');
const crypto = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

// Create express app for this serverless function
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-master-password');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage directories (using /tmp for Vercel)
const STORAGE_DIR = '/tmp/vault-storage';
const FILES_DIR = path.join(STORAGE_DIR, 'files');
const METADATA_DIR = path.join(STORAGE_DIR, 'metadata');
const VAULT_ITEMS_DIR = path.join(STORAGE_DIR, 'vault-items');

// Ensure storage directories exist
fs.ensureDirSync(FILES_DIR);
fs.ensureDirSync(METADATA_DIR);
fs.ensureDirSync(VAULT_ITEMS_DIR);

// Encryption helpers
class FileEncryption {
  static encrypt(data, masterPassword) {
    const salt = crypto.lib.WordArray.random(256/8);
    const key = crypto.PBKDF2(masterPassword, salt, {
      keySize: 256/32,
      iterations: 10000
    });
    const iv = crypto.lib.WordArray.random(128/8);
    const encrypted = crypto.AES.encrypt(data, key, {
      iv: iv,
      padding: crypto.pad.Pkcs7,
      mode: crypto.mode.CBC
    });
    
    return {
      encrypted: encrypted.toString(),
      salt: salt.toString(),
      iv: iv.toString()
    };
  }
  
  static decrypt(encryptedData, masterPassword) {
    const { encrypted, salt, iv } = encryptedData;
    const key = crypto.PBKDF2(masterPassword, crypto.enc.Hex.parse(salt), {
      keySize: 256/32,
      iterations: 10000
    });
    
    const decrypted = crypto.AES.decrypt(encrypted, key, {
      iv: crypto.enc.Hex.parse(iv),
      padding: crypto.pad.Pkcs7,
      mode: crypto.mode.CBC
    });
    
    return decrypted.toString(crypto.enc.Utf8);
  }
}

// Authentication middleware
const authenticateUser = (req, res, next) => {
  try {
    const masterPassword = req.headers['x-master-password'];
    
    if (!masterPassword) {
      return res.status(401).json({ 
        error: 'Master password required',
        code: 'NO_MASTER_PASSWORD'
      });
    }
    
    req.masterPassword = masterPassword;
    next();
  } catch (error) {
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Upload file
app.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file provided',
        code: 'NO_FILE'
      });
    }
    
    const fileId = uuidv4();
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    
    // Encrypt file content
    const encryptedFile = FileEncryption.encrypt(
      fileBuffer.toString('base64'),
      req.masterPassword
    );
    
    // Save encrypted file
    const filePath = path.join(FILES_DIR, `${fileId}.enc`);
    await fs.writeFile(filePath, JSON.stringify(encryptedFile));
    
    // Create and save metadata
    const metadata = {
      id: fileId,
      originalName,
      mimeType,
      size: fileSize,
      uploadDate: new Date().toISOString(),
      encrypted: true
    };
    
    const encryptedMetadata = FileEncryption.encrypt(
      JSON.stringify(metadata),
      req.masterPassword
    );
    
    const metadataPath = path.join(METADATA_DIR, `${fileId}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(encryptedMetadata));
    
    res.json({
      success: true,
      fileId,
      originalName,
      size: fileSize
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      code: 'UPLOAD_ERROR'
    });
  }
});

// Download file
app.get('/download/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Read metadata
    const metadataPath = path.join(METADATA_DIR, `${fileId}.json`);
    if (!await fs.pathExists(metadataPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const encryptedMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    const metadata = JSON.parse(FileEncryption.decrypt(encryptedMetadata, req.masterPassword));
    
    // Read encrypted file
    const filePath = path.join(FILES_DIR, `${fileId}.enc`);
    const encryptedFile = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const decryptedContent = FileEncryption.decrypt(encryptedFile, req.masterPassword);
    
    // Convert back to buffer
    const fileBuffer = Buffer.from(decryptedContent, 'base64');
    
    res.set({
      'Content-Type': metadata.mimeType,
      'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
      'Content-Length': fileBuffer.length
    });
    
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      code: 'DOWNLOAD_ERROR'
    });
  }
});

// List files
app.get('/list', authenticateUser, async (req, res) => {
  try {
    const metadataFiles = await fs.readdir(METADATA_DIR);
    const files = [];
    
    for (const file of metadataFiles) {
      if (file.endsWith('.json')) {
        try {
          const metadataPath = path.join(METADATA_DIR, file);
          const encryptedMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          const metadata = JSON.parse(FileEncryption.decrypt(encryptedMetadata, req.masterPassword));
          files.push(metadata);
        } catch (error) {
          console.warn(`Failed to decrypt metadata for ${file}:`, error.message);
        }
      }
    }
    
    res.json({ files });
    
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      error: 'Failed to list files',
      code: 'LIST_ERROR'
    });
  }
});

// Delete file
app.delete('/delete/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const filePath = path.join(FILES_DIR, `${fileId}.enc`);
    const metadataPath = path.join(METADATA_DIR, `${fileId}.json`);
    
    await Promise.all([
      fs.remove(filePath).catch(() => {}),
      fs.remove(metadataPath).catch(() => {})
    ]);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Delete failed',
      code: 'DELETE_ERROR'
    });
  }
});

// Export for Vercel
module.exports = app;