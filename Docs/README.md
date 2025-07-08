# VaultStack - Persoonlijke Data Kluis

Een complete suite van applicaties voor het veilig opslaan en beheren van persoonlijke gegevens zoals wachtwoorden, notities, links, bestanden en bankkaarten.

## 📱 Platformen

### ✅ Android (Kotlin + Jetpack Compose)
- **Locatie**: `android/` map
- **Status**: ✅ Volledig functioneel prototype
- **Functies**: 
  - Lokale SQLite database
  - Material Design 3 UI
  - Categorieën, zoeken, sorteren
  - CRUD operaties
  - Light/dark mode

### 🖥️ Desktop (Electron + React)
- **Locatie**: `UI/` map  
- **Status**: ✅ UI prototype klaar
- **Functies**: 
  - Next.js + React + Tailwind CSS
  - shadcn/ui componenten
  - Moderne web interface
  - Klaar voor Electron integratie

## 🏗️ Architectuur

### Android App
```
android/
├── app/
│   ├── src/main/java/com/vaultstack/app/
│   │   ├── data/           # Database & Repository
│   │   ├── ui/             # ViewModel & Screens
│   │   └── MainActivity.kt # Entry point
│   ├── build.gradle.kts    # Dependencies
│   └── AndroidManifest.xml
├── build.gradle.kts        # Project config
└── README.md              # Setup instructies
```

### Desktop App
```
UI/
├── app/                   # Next.js pages
├── components/            # React componenten
├── lib/                   # Utilities
└── package.json          # Dependencies
```

## 🚀 Snelle Start

### Android App
```bash
cd android
# Open in Android Studio of gebruik command line:
./gradlew assembleDebug
```

### Desktop App
```bash
cd UI
npm install
npm run dev
```

## 📊 Datamodel

Beide platformen gebruiken hetzelfde datamodel:

```kotlin
data class VaultItem(
    val id: Int = 0,
    val name: String,           // Verplicht
    val category: String,       // Verplicht  
    val description: String?,   // Optioneel
    val filepath: String?,      // Optioneel
    val createdAt: LocalDateTime // Automatisch
)
```

### Categorieën
- `passwords` - Wachtwoorden
- `links` - Links/URLs  
- `notes` - Notities
- `files` - Bestanden
- `cards` - Bankkaarten

## 🔒 Beveiliging (Prototype Fase)

⚠️ **Belangrijk**: Dit is een functioneel prototype zonder encryptie:

- ❌ Geen database encryptie
- ❌ Geen authenticatie
- ❌ Geen cloud synchronisatie
- ✅ Alleen lokale opslag
- ✅ SQLite database

## 🎯 Doel van dit Prototype

1. **UI/UX Validatie**: Test de gebruikersinterface en workflows
2. **Data Management**: Valideer CRUD operaties en categorisatie
3. **Platform Vergelijking**: Vergelijk Android vs Desktop implementatie
4. **Basis voor Uitbreiding**: Fundering voor encryptie en sync features

## 🔮 Roadmap

### Fase 1: Prototype ✅
- [x] Android app met Room database
- [x] Desktop UI met React
- [x] Basis CRUD functionaliteit
- [x] Categorieën en zoeken

### Fase 2: Beveiliging 🚧
- [ ] Database encryptie (SQLCipher)
- [ ] Biometrische authenticatie
- [ ] Master wachtwoord beveiliging
- [ ] Secure key storage

### Fase 3: Synchronisatie 🚧
- [ ] Cloud backup (Firebase/CloudKit)
- [ ] Cross-platform sync
- [ ] Conflict resolution
- [ ] Offline support

### Fase 4: Uitbreidingen 🚧
- [ ] Bestandsupload & encryptie
- [ ] Wachtwoord generator
- [ ] Export/import functionaliteit
- [ ] Backup/restore
- [ ] Audit logging

## 🛠️ Technische Stack

### Android
- **Language**: Kotlin
- **UI**: Jetpack Compose + Material Design 3
- **Database**: Room + SQLite
- **Architecture**: MVVM + Repository
- **State**: Kotlin Flow

### Desktop
- **Framework**: Next.js + React
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript
- **Runtime**: Electron (gepland)

## 📝 Licentie

Dit project is onderdeel van de VaultStack applicatie suite.

## 🤝 Bijdragen

Feedback en suggesties zijn welkom! Dit is een prototype fase, dus alle input is waardevol voor de verdere ontwikkeling. 