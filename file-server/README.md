# VaultStack File Server

🔒 **Centrale bestandsopslag voor VaultStack met end-to-end encryptie**

## 🎯 Overzicht

De VaultStack File Server biedt centrale, versleutelde bestandsopslag voor je VaultStack applicatie. Bestanden worden versleuteld opgeslagen op je eigen computer en zijn toegankelijk vanaf alle apparaten via je master password.

## ✨ Features

- **🔐 End-to-end encryptie** - AES-256-CBC met PBKDF2 key derivation
- **🏠 Eigen controle** - Bestanden blijven op jouw computer
- **🌐 Multi-device toegang** - Toegankelijk vanaf alle apparaten
- **🛡️ Veiligheid** - Rate limiting, CORS, Helmet security
- **📱 Real-time sync** - Automatische synchronisatie tussen apparaten
- **💾 Hybrid storage** - Lokale cache + centrale opslag

## 🚀 Quick Start

### 1. Installatie
```bash
cd file-server
npm install
```

### 2. Start de server
```bash
npm start
```

De server draait nu op `http://localhost:3004`

### 3. VaultStack configureren
VaultStack detecteert automatisch de file server en toont de sync status in de sidebar.

## 🔧 Configuratie

### Environment Variables (.env)
```env
PORT=3004
NODE_ENV=development
MAX_FILE_SIZE=104857600  # 100MB
RATE_LIMIT_WINDOW_MS=900000  # 15 minuten
RATE_LIMIT_MAX_REQUESTS=100
STORAGE_DIR=./vault-storage
ENCRYPTION_ITERATIONS=10000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,https://vault.toolstack.nl
```

### Productie Setup
Voor productie gebruik op `vault.toolstack.nl`:

1. **Update CORS origins** in `.env`:
   ```env
   CORS_ORIGINS=https://vault.toolstack.nl
   NODE_ENV=production
   ```

2. **SSL/HTTPS** configureren voor veilige verbindingen

3. **Firewall** - Alleen poort 3004 openen voor VaultStack

## 🌐 Online Toegankelijk Maken

### Optie 1: Ngrok (Eenvoudig)
```bash
# Installeer ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3004
```

### Optie 2: Cloudflare Tunnel (Aanbevolen)
```bash
# Installeer cloudflared
# Download van https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Start tunnel
cloudflared tunnel --url http://localhost:3004
```

### Optie 3: Router Port Forwarding
1. Open poort 3004 in je router
2. Forward naar je computer's IP
3. Gebruik je externe IP + poort 3004

## 📁 Bestandsstructuur

```
file-server/
├── server.js              # Hoofdserver
├── package.json           # Dependencies
├── .env                   # Configuratie
├── vault-storage/         # Versleutelde bestanden
│   ├── files/            # Bestandsdata (.enc)
│   └── metadata/         # Bestandsmetadata (.meta)
└── README.md             # Deze documentatie
```

## 🔐 Beveiliging

### Encryptie Laag
1. **Transport** - HTTPS tussen client en server
2. **Storage** - AES-256-CBC encryptie op disk
3. **Authentication** - Master password verificatie

### Security Headers
- **Helmet** - Security headers
- **CORS** - Alleen toegestane origins
- **Rate Limiting** - 100 requests per 15 minuten
- **File Size Limits** - Max 100MB per bestand

## 📊 API Endpoints

### Health Check
```http
GET /api/health
```

### File Operations
```http
POST /api/files/upload
GET /api/files/:fileId
GET /api/files
DELETE /api/files/:fileId
GET /api/files/:fileId/metadata
```

Alle endpoints vereisen `x-master-password` header.

## 🔄 Sync Workflow

1. **Upload** - Bestanden worden versleuteld en opgeslagen
2. **Metadata** - Bestandsinfo wordt apart opgeslagen
3. **Sync Status** - VaultStack toont sync status per bestand
4. **Download** - Bestanden worden gedownload en ontsleuteld
5. **Cache** - Lokale cache voor snelle toegang

## 🛠️ Development

### Development Mode
```bash
npm run dev  # Met nodemon voor auto-restart
```

### Logging
Server logs bevatten:
- File upload/download activiteit
- Encryptie/decryptie operaties
- Error handling
- Security events

### Testing
```bash
# Test server health
curl http://localhost:3004/api/health

# Test met VaultStack
# Upload een bestand via VaultStack interface
```

## 🚨 Troubleshooting

### Server start niet
- Check of poort 3004 vrij is
- Controleer .env configuratie
- Kijk naar console errors

### VaultStack kan niet verbinden
- Controleer CORS origins in .env
- Verify server draait op juiste poort
- Check firewall instellingen

### Upload/Download fails
- Controleer master password
- Verify file size limits
- Check storage directory permissions

## 📈 Monitoring

### Log Files
Server logs naar console, gebruik PM2 of vergelijkbaar voor productie logging.

### Storage Usage
```bash
# Check storage directory size
du -sh vault-storage/
```

### Performance
- Monitor memory usage tijdens grote uploads
- Check disk space voor storage directory
- Monitor network bandwidth

## 🔄 Backup Strategy

### Automatische Backup
```bash
# Backup vault-storage directory
cp -r vault-storage/ backup-$(date +%Y%m%d)/
```

### Cloud Backup
Overweeg periodieke backup naar cloud storage (versleuteld).

## 🎯 Roadmap

- [ ] **Real-time sync** - WebSocket verbindingen
- [ ] **Conflict resolution** - Bij gelijktijdige edits
- [ ] **File versioning** - Geschiedenis van wijzigingen
- [ ] **Compression** - Automatische bestandscompressie
- [ ] **Deduplication** - Duplicaat detectie
- [ ] **Admin dashboard** - Web interface voor beheer

---

**🔒 VaultStack File Server - Jouw bestanden, jouw controle, overal toegankelijk!**