# 🔐 VaultStack - Personal Data Vault

A secure, offline-first web application for storing and managing personal data such as passwords, notes, links, files, and bank cards. Built with Next.js, TypeScript, and IndexedDB for local storage.

## ✨ Features

- **🔒 Secure Storage**: All data is stored locally in your browser using IndexedDB
- **📱 Offline-First**: Works completely offline - no internet required
- **🎨 Modern UI**: Beautiful interface built with shadcn/ui and Tailwind CSS
- **🔍 Search & Filter**: Find items quickly with search and category filtering
- **📊 Categories**: Organize items by type (passwords, notes, links, files, cards)
- **🔄 CRUD Operations**: Create, read, update, and delete items
- **📅 Sorting**: Sort items by name, creation date, or last modified
- **🌙 Dark Mode**: Automatic dark/light mode support
- **📁 File Attachments**: Attach files to your items (filename storage)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VaultStack/UI
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Unlock the vault**
   - Use the demo password: `demo123`
   - Or enter any password to unlock (demo mode)

## 📁 Project Structure

```
UI/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main app page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── database-provider.tsx
│   ├── vault-dashboard.tsx
│   ├── vault-item-form.tsx
│   ├── vault-item-list.tsx
│   └── unlock-screen.tsx
├── hooks/                # Custom React hooks
│   └── use-vault-items.ts
├── lib/                  # Utilities and configurations
│   ├── database.ts       # IndexedDB setup and helpers
│   └── utils.ts
└── public/              # Static assets
```

## 🗄️ Database Schema

The application uses IndexedDB (via Dexie.js) with the following structure:

```typescript
interface VaultItem {
  id?: number;              // Auto-increment primary key
  name: string;             // Required: Item name/title
  category: 'passwords' | 'notes' | 'links' | 'files' | 'cards';
  description?: string;     // Optional: Item description
  filepath?: string;        // Optional: Attached file path
  createdAt: Date;          // Auto-generated timestamp
  updatedAt: Date;          // Auto-updated timestamp
}
```

## 🎯 Usage Guide

### Adding Items

1. Click the **"Add Item"** button in the top-right corner
2. Fill in the required fields:
   - **Name**: The title of your item
   - **Category**: Choose from passwords, notes, links, files, or cards
3. Optionally add:
   - **Description**: Additional details about the item
   - **File Attachment**: Upload a file (filename will be stored)
4. Click **"Add Item"** to save

### Managing Items

- **Search**: Use the search bar to find items by name or description
- **Filter**: Use the category dropdown to filter by item type
- **Sort**: Click the sort dropdown to sort by name, creation date, or last modified
- **Edit**: Click the edit button (pencil icon) on any item
- **Delete**: Click the delete button (trash icon) and confirm

### Categories

- **🔑 Passwords**: Store login credentials and passwords
- **📝 Notes**: Keep important notes and information
- **🔗 Links**: Save important URLs and links
- **📁 Files**: Attach and reference files
- **💳 Cards**: Store bank card information

## 🔧 Development

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: IndexedDB via Dexie.js
- **State Management**: React hooks and context
- **Icons**: Lucide React

### Key Dependencies

```json
{
  "next": "15.2.4",
  "react": "^19",
  "typescript": "^5",
  "tailwindcss": "^3.4.17",
  "dexie": "^3.2.4",
  "dexie-react-hooks": "^1.1.7",
  "date-fns": "4.1.0"
}
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 🔒 Security Notes

⚠️ **Important**: This is a prototype version with basic security:

- **No Encryption**: Data is stored in plain text in IndexedDB
- **No Authentication**: Uses a simple demo password system
- **Local Storage Only**: Data is stored in your browser
- **No Cloud Sync**: No data is sent to external servers

### Future Security Features

- [ ] Database encryption using WebCrypto API
- [ ] Master password hashing with Argon2
- [ ] Secure key derivation
- [ ] Biometric authentication
- [ ] Cloud synchronization with encryption

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 📱 Native App Conversion

This web app is designed to be easily converted to native apps:

### Capacitor (iOS/Android)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

### Tauri (Desktop)
```bash
npm install @tauri-apps/cli
npm run tauri dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the browser console for errors
2. Ensure IndexedDB is supported in your browser
3. Try clearing browser data if the database is corrupted
4. Open an issue on GitHub

---

**Note**: This is a prototype application. For production use, implement proper security measures including encryption and authentication. 