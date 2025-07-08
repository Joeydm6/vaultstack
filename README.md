# VaultStack - Secure Password & File Manager

VaultStack is a secure, encrypted password and file manager with a modern web interface and central file server.

## Features

- 🔐 **Encrypted Password Management** - Store passwords securely with AES encryption
- 📁 **Encrypted File Storage** - Upload and store files with end-to-end encryption
- 🌐 **Web Interface** - Modern, responsive UI built with Next.js and Tailwind CSS
- 🔒 **Master Password Protection** - Single master password protects all data
- 🌙 **Dark/Light Theme** - Toggle between themes
- 📱 **Mobile Responsive** - Works on all devices

## Architecture

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js file server with encryption
- **Database**: Dexie (IndexedDB) for local storage
- **Encryption**: AES-256 with PBKDF2 key derivation
- **Deployment**: Vercel with serverless functions

## Deployment to Vercel

### Prerequisites

1. GitHub account
2. Vercel account (free tier available)
3. Node.js 18+ installed locally

### Steps

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/vaultstack.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Next.js and configure deployment
   - Click "Deploy"

3. **Configure Custom Domain (Optional)**
   - In Vercel dashboard, go to your project
   - Navigate to "Settings" > "Domains"
   - Add your custom domain (e.g., `vault.toolstack.nl`)
   - Update DNS settings as instructed by Vercel

### Environment Variables

No environment variables are required for basic deployment. All encryption happens client-side with the master password.

### File Structure

```
VaultStack/
├── CODE/                    # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── lib/               # Utilities and APIs
│   ├── api/               # Serverless API routes
│   └── package.json
├── file-server/           # Original Express server (for reference)
├── vercel.json           # Vercel configuration
└── README.md
```

## Local Development

1. **Install Dependencies**
   ```bash
   cd CODE
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api/files/*

## Security Features

- **Client-side Encryption**: All data is encrypted before leaving your device
- **Zero-knowledge Architecture**: Server never sees unencrypted data
- **Master Password**: Single password protects all vault data
- **PBKDF2 Key Derivation**: 10,000 iterations for key strengthening
- **AES-256 Encryption**: Industry-standard encryption algorithm

## Usage

1. **First Time Setup**
   - Visit your deployed application
   - Create a master password
   - Start adding passwords and files

2. **Adding Passwords**
   - Click "Add Password"
   - Fill in website, username, password
   - Data is automatically encrypted and stored

3. **Uploading Files**
   - Click "Upload File"
   - Select file (up to 100MB)
   - File is encrypted and stored securely

4. **Accessing Data**
   - Enter master password to unlock vault
   - View, edit, or download your encrypted data

## Troubleshooting

### Deployment Issues

- Ensure all dependencies are listed in `package.json`
- Check Vercel build logs for errors
- Verify API routes are in correct `/api` directory structure

### File Upload Issues

- Check file size (max 100MB)
- Ensure stable internet connection
- Verify master password is correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue on GitHub.