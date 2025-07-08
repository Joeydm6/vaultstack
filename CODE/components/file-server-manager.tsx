"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Cloud, 
  CloudOff, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Server,
  HardDrive,
  Wifi,
  WifiOff
} from "lucide-react"
import { vaultDB } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface FileServerStatus {
  isAvailable: boolean
  serverFiles: number
  localFiles: number
  syncedFiles: number
  pendingFiles: number
  errorFiles: number
}

export function FileServerManager() {
  const [status, setStatus] = useState<FileServerStatus>({
    isAvailable: false,
    serverFiles: 0,
    localFiles: 0,
    syncedFiles: 0,
    pendingFiles: 0,
    errorFiles: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  // Check server status and file counts
  const checkStatus = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 FileServerManager: Starting status check...')
      
      // Check server availability with timeout
      const serverAvailable = await Promise.race([
        vaultDB.isServerAvailable(),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('⏰ FileServerManager: Health check timeout after 15 seconds')
            resolve(false)
          }, 15000)
        })
      ])
      
      console.log(`🏥 FileServerManager: Server available: ${serverAvailable}`)
      
      const [serverFiles, localFiles] = await Promise.all([
        serverAvailable ? vaultDB.getServerFiles().catch((error) => {
          console.error('❌ FileServerManager: Failed to get server files:', error)
          return []
        }) : Promise.resolve([]),
        vaultDB.getAllItems()
      ])

      // Count files by sync status
      const syncedFiles = localFiles.filter(item => 
        item.fileData?.some(file => file.storageType === 'server' || file.storageType === 'hybrid')
      ).length
      
      const pendingFiles = localFiles.filter(item => 
        item.fileData?.some(file => file.storageType === 'local')
      ).length
      
      const errorFiles = localFiles.filter(item => 
        item.syncStatus === 'error'
      ).length

      const newStatus = {
        isAvailable: serverAvailable,
        serverFiles: Array.isArray(serverFiles) ? serverFiles.length : 0,
        localFiles: localFiles.length,
        syncedFiles,
        pendingFiles,
        errorFiles
      }
      
      console.log('📊 FileServerManager: Status update:', newStatus)
      setStatus(newStatus)
    } catch (error) {
      console.error('❌ FileServerManager: Failed to check status:', error)
      setStatus({
        isAvailable: false,
        serverFiles: 0,
        localFiles: 0,
        syncedFiles: 0,
        pendingFiles: 0,
        errorFiles: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Sync all files to server
  const syncAllFiles = async () => {
    if (!status.isAvailable) {
      toast({
        title: "Server Unavailable",
        description: "File server is not available for sync",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSyncing(true)
      setSyncProgress(0)
      
      const result = await vaultDB.syncAllFilesToServer()
      
      setSyncProgress(100)
      
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${result.success} files. ${result.failed} failed.`,
        variant: result.failed > 0 ? "destructive" : "default"
      })
      
      // Refresh status
      await checkStatus()
      
    } catch (error) {
      console.error('Sync failed:', error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync files to server",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(false)
      setSyncProgress(0)
    }
  }

  // Sync vault items from server
  const syncFromServer = async () => {
    if (!status.isAvailable) {
      toast({
        title: "Server Unavailable",
        description: "File server is not available for sync",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSyncing(true)
      setSyncProgress(0)
      
      const result = await vaultDB.autoSyncVaultItems()
      
      setSyncProgress(100)
      
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully ${result.action} ${result.count || 0} vault items from server`,
          variant: "default"
        })
        
        // Refresh status without page reload
        await checkStatus()
      } else {
        toast({
          title: "Sync Failed",
          description: result.error || "Failed to sync vault items",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Vault sync failed:', error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync vault items from server",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(false)
      setSyncProgress(0)
    }
  }

  // Initial status check only - no periodic refresh
  useEffect(() => {
    checkStatus()
  }, [])

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (status.isAvailable) return <Wifi className="w-4 h-4 text-green-500" />
    return <WifiOff className="w-4 h-4 text-red-500" />
  }

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant="outline">Checking...</Badge>
    if (status.isAvailable) return <Badge variant="default" className="bg-green-500">Online</Badge>
    return <Badge variant="destructive">Offline</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          File Server
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Server Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Server Files: {status.serverFiles}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Local Files: {status.localFiles}</span>
          </div>
        </div>

        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sync Status</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={checkStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Synced: {status.syncedFiles}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              <span>Pending: {status.pendingFiles}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-500" />
              <span>Errors: {status.errorFiles}</span>
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Syncing files...</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={syncAllFiles}
            disabled={!status.isAvailable || isSyncing || status.pendingFiles === 0}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Sync Files
            {status.pendingFiles > 0 && (
              <Badge variant="secondary" className="ml-2">
                {status.pendingFiles}
              </Badge>
            )}
          </Button>
          <Button 
            onClick={syncFromServer}
            disabled={!status.isAvailable || isSyncing}
            className="flex-1"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Sync Vault
          </Button>
        </div>

        {/* Status Messages */}
        {!status.isAvailable && (
          <Alert>
            <CloudOff className="w-4 h-4" />
            <AlertDescription>
              File server is not available. Files will be stored locally only.
            </AlertDescription>
          </Alert>
        )}

        {status.errorFiles > 0 && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              {status.errorFiles} files failed to sync. Check your connection and try again.
            </AlertDescription>
          </Alert>
        )}

        {status.isAvailable && status.pendingFiles === 0 && status.localFiles > 0 && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              All files are synced with the server.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}