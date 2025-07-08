const express = require('express');
const multer = require('multer');
const crypto = require('crypto-js');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'https://vault.toolstack.nl'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-master-password']
}));

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Storage directories
const STORAGE_DIR = path.join(__dirname, 'vault-storage');
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

// Authentication middleware with enhanced validation
const authenticateUser = (req, res, next) => {
  try {
    const masterPassword = req.headers['x-master-password'];
    
    if (!masterPassword) {
      console.warn('Authentication failed: No master password provided');
      return res.status(401).json({ 
        error: 'Master password required',
        code: 'NO_MASTER_PASSWORD'
      });
    }
    
    if (typeof masterPassword !== 'string' || masterPassword.length < 1) {
      console.warn('Authentication failed: Invalid master password format');
      return res.status(401).json({ 
        error: 'Invalid master password format',
        code: 'INVALID_PASSWORD_FORMAT'
      });
    }
    
    // Store master password for this request
    req.masterPassword = masterPassword;
    console.log('Authentication successful for request:', req.method, req.path);
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types but log them
    console.log(`Uploading file: ${file.originalname}, type: ${file.mimetype}`);
    cb(null, true);
  }
});

// API Routes

// Health check with CORS preflight support
app.options('/api/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

app.get('/api/health', (req, res) => {
  try {
    // Perform basic health checks
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      storage: {
        files: fs.existsSync(FILES_DIR),
        metadata: fs.existsSync(METADATA_DIR),
        vaultItems: fs.existsSync(VAULT_ITEMS_DIR)
      },
      version: '1.0.0'
    };
    
    console.log('Health check requested - Status: OK');
    res.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Retry helper function
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Upload file with enhanced error handling
app.post('/api/files/upload', authenticateUser, upload.single('file'), async (req, res) => {
  let fileId = null;
  let filePath = null;
  let metadataPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file provided',
        code: 'NO_FILE'
      });
    }
    
    fileId = uuidv4();
    const { originalname, mimetype, size, buffer } = req.file;
    const { description, category } = req.body;
    
    // Validate file size
    if (size > 100 * 1024 * 1024) {
      return res.status(413).json({ 
        error: 'File too large (max 100MB)',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    console.log(`Starting upload: ${originalname} (${(size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Convert buffer to base64 for encryption
    const fileDataBase64 = buffer.toString('base64');
    
    // Encrypt file data with retry
    const encryptedFile = await retryOperation(() => 
      FileEncryption.encrypt(fileDataBase64, req.masterPassword)
    );
    
    // Create metadata
    const metadata = {
      id: fileId,
      name: originalname,
      type: mimetype,
      size: size,
      description: description || '',
      category: category || 'files',
      uploadedAt: new Date().toISOString(),
      encrypted: true,
      checksum: crypto.SHA256(fileDataBase64).toString()
    };
    
    // Encrypt metadata with retry
    const encryptedMetadata = await retryOperation(() => 
      FileEncryption.encrypt(JSON.stringify(metadata), req.masterPassword)
    );
    
    // Save encrypted file with retry
    filePath = path.join(FILES_DIR, `${fileId}.enc`);
    await retryOperation(() => fs.writeJson(filePath, encryptedFile));
    
    // Save encrypted metadata with retry
    metadataPath = path.join(METADATA_DIR, `${fileId}.meta`);
    await retryOperation(() => fs.writeJson(metadataPath, encryptedMetadata));
    
    console.log(`✅ File uploaded successfully: ${originalname} (${fileId})`);
    
    res.json({
      success: true,
      fileId: fileId,
      name: originalname,
      size: size,
      type: mimetype,
      uploadedAt: metadata.uploadedAt
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Cleanup on failure
    if (fileId) {
      try {
        if (filePath && await fs.pathExists(filePath)) {
          await fs.remove(filePath);
          console.log('Cleaned up failed file upload');
        }
        if (metadataPath && await fs.pathExists(metadataPath)) {
          await fs.remove(metadataPath);
          console.log('Cleaned up failed metadata upload');
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      code: 'UPLOAD_ERROR',
      details: error.message
    });
  }
});

// Get file with enhanced error handling
app.get('/api/files/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Validate fileId format
    if (!fileId || typeof fileId !== 'string' || fileId.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid file ID',
        code: 'INVALID_FILE_ID'
      });
    }
    
    console.log(`📥 Download requested: ${fileId}`);
    
    // Load encrypted file
    const filePath = path.join(FILES_DIR, `${fileId}.enc`);
    const metadataPath = path.join(METADATA_DIR, `${fileId}.meta`);
    
    const [fileExists, metadataExists] = await Promise.all([
      fs.pathExists(filePath),
      fs.pathExists(metadataPath)
    ]);
    
    if (!fileExists || !metadataExists) {
      console.warn(`File not found: ${fileId} (file: ${fileExists}, metadata: ${metadataExists})`);
      return res.status(404).json({ 
        error: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }
    
    // Load and decrypt metadata with retry
    const encryptedMetadata = await retryOperation(() => fs.readJson(metadataPath));
    const metadataJson = await retryOperation(() => 
      FileEncryption.decrypt(encryptedMetadata, req.masterPassword)
    );
    const metadata = JSON.parse(metadataJson);
    
    // Load and decrypt file with retry
    const encryptedFile = await retryOperation(() => fs.readJson(filePath));
    const fileDataBase64 = await retryOperation(() => 
      FileEncryption.decrypt(encryptedFile, req.masterPassword)
    );
    const fileBuffer = Buffer.from(fileDataBase64, 'base64');
    
    // Verify file integrity if checksum exists
    if (metadata.checksum) {
      const currentChecksum = crypto.SHA256(fileDataBase64).toString();
      if (currentChecksum !== metadata.checksum) {
        console.error(`File integrity check failed for ${fileId}`);
        return res.status(500).json({ 
          error: 'File integrity check failed',
          code: 'INTEGRITY_ERROR'
        });
      }
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': metadata.type,
      'Content-Length': fileBuffer.length,
      'Content-Disposition': `attachment; filename="${metadata.name}"`,
      'X-File-ID': fileId,
      'X-Upload-Date': metadata.uploadedAt
    });
    
    console.log(`✅ File downloaded successfully: ${metadata.name} (${fileId})`);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('❌ Download error:', error);
    
    if (error.message.includes('decrypt')) {
      res.status(401).json({ 
        error: 'Decryption failed - invalid master password',
        code: 'DECRYPTION_ERROR'
      });
    } else {
      res.status(500).json({ 
        error: 'Download failed',
        code: 'DOWNLOAD_ERROR',
        details: error.message
      });
    }
  }
});

// List files with enhanced error handling
app.get('/api/files', authenticateUser, async (req, res) => {
  try {
    console.log('📋 File list requested');
    
    const metadataFiles = await retryOperation(() => fs.readdir(METADATA_DIR));
    const files = [];
    const errors = [];
    
    // Process files in parallel with controlled concurrency
    const processFile = async (metaFile) => {
      if (!metaFile.endsWith('.meta')) {
        return null;
      }
      
      try {
        const metadataPath = path.join(METADATA_DIR, metaFile);
        const encryptedMetadata = await retryOperation(() => fs.readJson(metadataPath));
        const metadataJson = await retryOperation(() => 
          FileEncryption.decrypt(encryptedMetadata, req.masterPassword)
        );
        const metadata = JSON.parse(metadataJson);
        
        // Verify corresponding file exists
        const filePath = path.join(FILES_DIR, `${metadata.id}.enc`);
        const fileExists = await fs.pathExists(filePath);
        
        return {
          id: metadata.id,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          description: metadata.description,
          category: metadata.category,
          uploadedAt: metadata.uploadedAt,
          hasFile: fileExists,
          checksum: metadata.checksum
        };
      } catch (error) {
        console.warn(`Could not process metadata for ${metaFile}:`, error.message);
        errors.push({
          file: metaFile,
          error: error.message
        });
        return null;
      }
    };
    
    // Process files with limited concurrency
    const batchSize = 10;
    for (let i = 0; i < metadataFiles.length; i += batchSize) {
      const batch = metadataFiles.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(processFile));
      files.push(...results.filter(result => result !== null));
    }
    
    // Sort files by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    console.log(`✅ File list retrieved: ${files.length} files, ${errors.length} errors`);
    
    res.json({ 
      files,
      totalCount: files.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ List files error:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      code: 'LIST_ERROR',
      details: error.message
    });
  }
});

// Delete file
app.delete('/api/files/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const filePath = path.join(FILES_DIR, `${fileId}.enc`);
    const metadataPath = path.join(METADATA_DIR, `${fileId}.meta`);
    
    // Remove files if they exist
    await Promise.all([
      fs.pathExists(filePath).then(exists => exists && fs.remove(filePath)),
      fs.pathExists(metadataPath).then(exists => exists && fs.remove(metadataPath))
    ]);
    
    console.log(`File deleted: ${fileId}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Get file metadata only
app.get('/api/files/:fileId/metadata', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const metadataPath = path.join(METADATA_DIR, `${fileId}.meta`);
    
    if (!await fs.pathExists(metadataPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const encryptedMetadata = await fs.readJson(metadataPath);
    const metadataJson = FileEncryption.decrypt(encryptedMetadata, req.masterPassword);
    const metadata = JSON.parse(metadataJson);
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

// Vault Items API endpoints

// Save vault items with enhanced error handling
app.post('/api/vault-items', authenticateUser, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'Items array required',
        code: 'INVALID_ITEMS'
      });
    }
    
    console.log(`💾 Saving vault items: ${items.length} items`);
    
    // Validate items structure
    const invalidItems = items.filter(item => !item.id || typeof item.id !== 'string');
    if (invalidItems.length > 0) {
      return res.status(400).json({ 
        error: 'All items must have valid ID',
        code: 'INVALID_ITEM_STRUCTURE',
        invalidCount: invalidItems.length
      });
    }
    
    // Create backup of existing items before saving
    const vaultItemsPath = path.join(VAULT_ITEMS_DIR, 'vault-items.enc');
    const backupPath = path.join(VAULT_ITEMS_DIR, `vault-items-backup-${Date.now()}.enc`);
    
    if (await fs.pathExists(vaultItemsPath)) {
      await retryOperation(() => fs.copy(vaultItemsPath, backupPath));
      console.log('Created backup of existing vault items');
    }
    
    try {
      // Encrypt vault items with retry
      const encryptedItems = await retryOperation(() => 
        FileEncryption.encrypt(JSON.stringify(items), req.masterPassword)
      );
      
      // Save encrypted vault items with retry
      await retryOperation(() => fs.writeJson(vaultItemsPath, encryptedItems));
      
      // Verify the save by reading back
      const verification = await retryOperation(() => fs.readJson(vaultItemsPath));
      const verifiedItems = JSON.parse(FileEncryption.decrypt(verification, req.masterPassword));
      
      if (verifiedItems.length !== items.length) {
        throw new Error('Verification failed: item count mismatch');
      }
      
      console.log(`✅ Vault items saved successfully: ${items.length} items`);
      
      // Clean up old backups (keep only last 5)
      try {
        const backupFiles = (await fs.readdir(VAULT_ITEMS_DIR))
          .filter(file => file.startsWith('vault-items-backup-'))
          .sort()
          .reverse();
        
        if (backupFiles.length > 5) {
          for (const oldBackup of backupFiles.slice(5)) {
            await fs.remove(path.join(VAULT_ITEMS_DIR, oldBackup));
          }
        }
      } catch (cleanupError) {
        console.warn('Backup cleanup failed:', cleanupError.message);
      }
      
      res.json({
        success: true,
        itemCount: items.length,
        savedAt: new Date().toISOString(),
        verified: true
      });
      
    } catch (saveError) {
      // Restore from backup if save failed
      if (await fs.pathExists(backupPath)) {
        try {
          await fs.copy(backupPath, vaultItemsPath);
          console.log('Restored from backup after save failure');
        } catch (restoreError) {
          console.error('Failed to restore from backup:', restoreError);
        }
      }
      throw saveError;
    }
    
  } catch (error) {
    console.error('❌ Save vault items error:', error);
    res.status(500).json({ 
      error: 'Failed to save vault items',
      code: 'SAVE_ERROR',
      details: error.message
    });
  }
});

// Get vault items with enhanced error handling
app.get('/api/vault-items', authenticateUser, async (req, res) => {
  try {
    console.log('📋 Vault items requested');
    
    const vaultItemsPath = path.join(VAULT_ITEMS_DIR, 'vault-items.enc');
    
    if (!await fs.pathExists(vaultItemsPath)) {
      console.log('No vault items file found, returning empty array');
      return res.json({ 
        items: [],
        totalCount: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Load and decrypt vault items with retry
    const encryptedItems = await retryOperation(() => fs.readJson(vaultItemsPath));
    const itemsJson = await retryOperation(() => 
      FileEncryption.decrypt(encryptedItems, req.masterPassword)
    );
    const items = JSON.parse(itemsJson);
    
    // Validate items structure
    const validItems = items.filter(item => item && typeof item === 'object' && item.id);
    const invalidCount = items.length - validItems.length;
    
    if (invalidCount > 0) {
      console.warn(`Found ${invalidCount} invalid items, filtering them out`);
    }
    
    console.log(`✅ Vault items retrieved: ${validItems.length} items`);
    
    res.json({ 
      items: validItems,
      totalCount: validItems.length,
      invalidCount: invalidCount > 0 ? invalidCount : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Get vault items error:', error);
    
    if (error.message.includes('decrypt')) {
      res.status(401).json({ 
        error: 'Decryption failed - invalid master password',
        code: 'DECRYPTION_ERROR'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get vault items',
        code: 'GET_ERROR',
        details: error.message
      });
    }
  }
});

// Update single vault item
app.put('/api/vault-items/:itemId', authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { item } = req.body;
    
    if (!item) {
      return res.status(400).json({ error: 'Item data required' });
    }
    
    const vaultItemsPath = path.join(VAULT_ITEMS_DIR, 'vault-items.enc');
    let items = [];
    
    // Load existing items if file exists
    if (await fs.pathExists(vaultItemsPath)) {
      const encryptedItems = await fs.readJson(vaultItemsPath);
      const itemsJson = FileEncryption.decrypt(encryptedItems, req.masterPassword);
      items = JSON.parse(itemsJson);
    }
    
    // Find and update the item
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      items[itemIndex] = { ...items[itemIndex], ...item, id: itemId };
    } else {
      items.push({ ...item, id: itemId });
    }
    
    // Encrypt and save updated items
    const encryptedItems = FileEncryption.encrypt(JSON.stringify(items), req.masterPassword);
    await fs.writeJson(vaultItemsPath, encryptedItems);
    
    console.log(`Vault item updated: ${itemId}`);
    
    res.json({
      success: true,
      itemId: itemId,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Update vault item error:', error);
    res.status(500).json({ error: 'Failed to update vault item' });
  }
});

// Delete vault item
app.delete('/api/vault-items/:itemId', authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const vaultItemsPath = path.join(VAULT_ITEMS_DIR, 'vault-items.enc');
    
    if (!await fs.pathExists(vaultItemsPath)) {
      return res.status(404).json({ error: 'No vault items found' });
    }
    
    // Load existing items
    const encryptedItems = await fs.readJson(vaultItemsPath);
    const itemsJson = FileEncryption.decrypt(encryptedItems, req.masterPassword);
    let items = JSON.parse(itemsJson);
    
    // Remove the item
    const initialLength = items.length;
    items = items.filter(i => i.id !== itemId);
    
    if (items.length === initialLength) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Encrypt and save updated items
    const encryptedUpdatedItems = FileEncryption.encrypt(JSON.stringify(items), req.masterPassword);
    await fs.writeJson(vaultItemsPath, encryptedUpdatedItems);
    
    console.log(`Vault item deleted: ${itemId}`);
    
    res.json({
      success: true,
      itemId: itemId,
      deletedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Delete vault item error:', error);
    res.status(500).json({ error: 'Failed to delete vault item' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔒 VaultStack File Server running on port ${PORT}`);
  console.log(`📁 Storage directory: ${STORAGE_DIR}`);
  console.log(`🌐 CORS enabled for VaultStack origins`);
  console.log(`🛡️  Security: Helmet + Rate limiting enabled`);
  console.log(`🔐 Encryption: AES-256-CBC with PBKDF2 key derivation`);
});

module.exports = app;