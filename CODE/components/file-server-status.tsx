"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react"
import { vaultDB } from "@/lib/database"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FileServerStatus {
  isAvailable: boolean
  serverFiles: number
  localFiles: number
  syncedFiles: number
  pendingFiles: number
  errorFiles: number
}

export function FileServerStatus() {
  const [status, setStatus] = useState<FileServerStatus>({
    isAvailable: false,
    serverFiles: 0,
    localFiles: 0,
    syncedFiles: 0,
    pendingFiles: 0,
    errorFiles: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check server status and file counts
  const checkStatus = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 FileServerStatus: Starting status check...')
      
      // Check server availability with timeout
      const serverAvailable = await Promise.race([
        vaultDB.isServerAvailable(),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('⏰ FileServerStatus: Health check timeout after 5 seconds')
            resolve(false)
          }, 5000)
        })
      ])
      
      console.log(`🏥 FileServerStatus: Server available: ${serverAvailable}`)
      
      const [serverFiles, localFiles] = await Promise.all([
        serverAvailable ? vaultDB.getServerFiles().catch((error) => {
          console.error('❌ FileServerStatus: Failed to get server files:', error)
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
      
      console.log('📊 FileServerStatus: Status update:', newStatus)
      setStatus(newStatus)
    } catch (error) {
      console.error('❌ FileServerStatus: Failed to check status:', error)
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

  // Initial status check only - no periodic refresh
  useEffect(() => {
    console.log('🚀 FileServerStatus: Initial status check')
    checkStatus()
  }, [])

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (status.isAvailable) return <Wifi className="w-4 h-4 text-green-500" />
    return <WifiOff className="w-4 h-4 text-red-500" />
  }

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant="outline" className="text-xs">Checking...</Badge>
    if (status.isAvailable) {
      if (status.errorFiles > 0) {
        return <Badge variant="destructive" className="text-xs">Errors</Badge>
      }
      if (status.pendingFiles > 0) {
        return <Badge variant="secondary" className="text-xs">Syncing</Badge>
      }
      return <Badge variant="default" className="bg-green-500 text-xs">Synced</Badge>
    }
    return <Badge variant="destructive" className="text-xs">Offline</Badge>
  }

  const getTooltipContent = () => {
    if (isLoading) return "Checking server status..."
    if (!status.isAvailable) return "File server is offline. Files stored locally only."
    
    return (
      <div className="space-y-1 text-xs">
        <div>Server: {status.isAvailable ? 'Online' : 'Offline'}</div>
        <div>Local Files: {status.localFiles}</div>
        <div>Server Files: {status.serverFiles}</div>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          Synced: {status.syncedFiles}
        </div>
        {status.pendingFiles > 0 && (
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-yellow-500" />
            Pending: {status.pendingFiles}
          </div>
        )}
        {status.errorFiles > 0 && (
          <div className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-500" />
            Errors: {status.errorFiles}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 gap-1"
            onClick={checkStatus}
            disabled={isLoading}
          >
            {getStatusIcon()}
            {getStatusBadge()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}