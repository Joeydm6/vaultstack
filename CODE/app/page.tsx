"use client"

import { useState, useEffect } from "react"
import { UnlockScreen } from "@/components/unlock-screen"
import { SetupScreen } from "@/components/setup-screen"
import { VaultDashboard } from "@/components/vault-dashboard"
import { ThemeProvider } from "@/components/theme-provider"
import { DatabaseProvider } from "@/components/database-provider"
import { GlobalFileViewer } from "@/components/global-file-viewer"
import { AuthService } from "@/lib/auth"
import { vaultDB } from "@/lib/database"

export default function VaultStackApp() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [masterPassword, setMasterPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication state on app load
  useEffect(() => {
    const checkAuthState = () => {
      // Check if master password is set up
      if (!AuthService.hasMasterPassword()) {
        setNeedsSetup(true)
        setIsLoading(false)
        return
      }

      // Check if already authenticated and restore master password
      if (AuthService.isAuthenticated()) {
        // Try to restore master password from session
        const restored = AuthService.restoreMasterPasswordFromSession()
        if (restored) {
          setIsUnlocked(true)
          console.log('🔐 Session restored successfully')
        } else {
          // If restoration fails, force re-login for security
          console.warn('⚠️ Failed to restore session, requiring re-login')
          AuthService.logout()
        }
      }
      
      setIsLoading(false)
    }

    checkAuthState()
  }, [])

  // Handle F5 refresh to sync data from server
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'F5' && isUnlocked) {
        event.preventDefault()
        console.log('🔄 F5 pressed: Syncing from server...')
        try {
          const syncResult = await vaultDB.autoSyncVaultItems()
          if (syncResult.success) {
            console.log(`F5 sync: ${syncResult.action} ${syncResult.count || 0} items`)
            // Force a page reload to refresh UI
            window.location.reload()
          }
        } catch (error) {
          console.warn('F5 sync failed:', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isUnlocked])

  const handleSetup = async (password: string) => {
    // Set up master password for the first time
    if (AuthService.setMasterPassword(password)) {
      setMasterPassword(password)
      setNeedsSetup(false)
      setIsUnlocked(true)
      // Set master password in database for encryption
      vaultDB.setMasterPassword(password)
      
      // Try to sync with server after setup
      try {
        const syncResult = await vaultDB.autoSyncVaultItems()
        if (syncResult.success && syncResult.action === 'loaded') {
          console.log(`Setup: Loaded ${syncResult.count} items from server`)
        }
      } catch (error) {
        console.warn('Setup sync error:', error)
        // Don't fail setup if sync fails
      }
    }
  }

  const handleUnlock = async (password: string) => {
    // Verify and login with master password (now async with auto-sync)
    try {
      const loginSuccess = await AuthService.login(password)
      if (loginSuccess) {
        setMasterPassword(password)
        setIsUnlocked(true)
        // Master password is already set in database by AuthService.login()
      }
    } catch (error) {
      console.error('Login error in main app:', error)
    }
  }

  const handleLogout = () => {
    AuthService.logout()
    vaultDB.clearMasterPassword()
    setIsUnlocked(false)
    setMasterPassword("")
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>VaultStack wordt geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <DatabaseProvider>
        {needsSetup ? (
          <SetupScreen onSetupComplete={handleSetup} />
        ) : isUnlocked ? (
          <VaultDashboard onLogout={handleLogout} />
        ) : (
          <UnlockScreen onUnlock={handleUnlock} />
        )}
        <GlobalFileViewer />
      </DatabaseProvider>
    </ThemeProvider>
  )
}
