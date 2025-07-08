"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Download, Image as ImageIcon, File, Copy, ExternalLink, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react"
import { VaultItem, FileData, vaultDB } from "@/lib/database"

export function GlobalFileViewer() {
  const [open, setOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<VaultItem | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState<Set<number>>(new Set())
  const [serverFiles, setServerFiles] = useState<Map<string, FileData>>(new Map())

  useEffect(() => {
    const handleOpenFileViewer = (event: CustomEvent) => {
      setCurrentItem(event.detail.item)
      setOpen(true)
    }

    window.addEventListener('openFileViewer', handleOpenFileViewer as EventListener)
    
    return () => {
      window.removeEventListener('openFileViewer', handleOpenFileViewer as EventListener)
    }
  }, [])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setLoadingFiles(new Set())
      setServerFiles(new Map())
      setShowPassword(false)
    }
  }, [open])

  if (!currentItem) return null

  const { filepath, description, category, platform, username, password, url, linkUrl, links } = currentItem
  const fileData: FileData[] = Array.isArray(currentItem.fileData) ? currentItem.fileData : currentItem.fileData ? [currentItem.fileData] : [];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const loadFileFromServer = async (file: FileData, fileIndex: number) => {
    if (!file.serverId || serverFiles.has(file.serverId)) return
    
    console.log('Loading file from server:', file.name, 'serverId:', file.serverId)
    setLoadingFiles(prev => new Set(prev).add(fileIndex))
    
    try {
      const serverFile = await vaultDB.downloadFileFromServer(file.serverId, file.name)
      console.log('File loaded from server:', serverFile.name, 'Size:', serverFile.data?.byteLength, 'bytes')
      setServerFiles(prev => new Map(prev).set(file.serverId!, serverFile))
    } catch (error) {
      console.error('Failed to load file from server:', error)
    } finally {
      setLoadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(fileIndex)
        return newSet
      })
    }
  }

  const downloadFile = (file: FileData) => {
    if (!file) {
      console.error('No file provided for download')
      return
    }
    
    if (!file.data) {
      console.error('No file data available for download:', {
        name: file.name,
        hasData: !!file.data,
        serverId: file.serverId
      })
      return
    }
    
    try {
      // Convert data to proper format for download
      let blobData: ArrayBuffer;
      if (file.data instanceof ArrayBuffer) {
        blobData = file.data;
      } else if (file.data instanceof Uint8Array) {
        blobData = file.data.buffer.slice(
          file.data.byteOffset,
          file.data.byteOffset + file.data.byteLength
        );
      } else if (typeof file.data === 'object' && file.data !== null) {
        // Handle IndexedDB serialized ArrayBuffer
        const dataObj = file.data as any;
        if (dataObj.byteLength !== undefined && typeof dataObj.byteLength === 'number') {
          const uint8Array = new Uint8Array(Object.values(dataObj));
          blobData = uint8Array.buffer;
        } else {
          console.error('Cannot download file with invalid data object:', file.data);
          return;
        }
      } else {
        console.error('Cannot download file with unsupported data type:', typeof file.data);
        return;
      }
      
      console.log('Downloading file:', file.name, 'Size:', blobData.byteLength, 'bytes')
       const blob = new Blob([blobData], { type: file.type })
       const url = URL.createObjectURL(blob)
       const a = document.createElement('a')
       a.href = url
       a.download = file.name
       document.body.appendChild(a)
       a.click()
       document.body.removeChild(a)
       URL.revokeObjectURL(url)
     } catch (error) {
       console.error('Error downloading file:', error)
     }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openLink = (url: string) => {
    window.open(url, '_blank')
  }

  const renderContent = () => {
    // Password content
    if (category === 'passwords') {
      return (
        <div className="space-y-4">
          {platform && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Platform</h3>
              <span className="text-sm">{platform}</span>
            </div>
          )}
          {username && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Username</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{username}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(username)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {password && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Password</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{showPassword ? password : password.replace(/./g, '•')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(password)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {url && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Website</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 break-all">{url}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openLink(url)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(url)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Link content
    if (category === 'links') {
      // Parse links from the new links field or fallback to old linkUrl
      const allLinks = links ? links.split('\n').filter(link => link.trim()) : (linkUrl ? [linkUrl] : [])
      
      return (
        <div className="space-y-4">
          {allLinks.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Links</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(allLinks.join('\n'))}
                  title="Copy alle links"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </div>
              <div className="space-y-3">
                {allLinks.map((link, index) => {
                  const trimmedLink = link.trim()
                  if (!trimmedLink) return null
                  
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-background rounded border">
                      <span className="text-sm text-blue-600 break-all flex-1">{trimmedLink}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLink(trimmedLink)}
                        title="Open link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {description && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm">{description}</p>
            </div>
          )}
        </div>
      )
    }

    // File content
    if (fileData && fileData.length > 0) {
      return (
        <div className="space-y-6">
          {fileData.map((file, idx) => {
            // Always prioritize server data for files with serverId, force reload if not cached
            let actualFile = file;
            if (file.serverId) {
              if (serverFiles.has(file.serverId)) {
                actualFile = serverFiles.get(file.serverId)!;
              } else {
                // Force load from server for all server files
                actualFile = file;
              }
            }
            
            console.log('File render info:', {
              fileName: file.name,
              hasServerId: !!file.serverId,
              hasLocalData: !!file.data,
              hasServerFile: file.serverId ? serverFiles.has(file.serverId) : false,
              actualFileHasData: !!actualFile?.data,
              actualFileSize: actualFile?.data?.byteLength
            })
            
            const isImage = actualFile?.type?.startsWith('image/');
            const isPDF = actualFile?.type === 'application/pdf';
            const isText = actualFile?.type?.startsWith('text/') && !isPDF;
            const blob = actualFile?.data ? (() => {
              try {
                // Convert data to proper format for Blob
                let blobData: ArrayBuffer;
                if (actualFile.data instanceof ArrayBuffer) {
                  blobData = actualFile.data;
                } else if (actualFile.data instanceof Uint8Array) {
                  blobData = actualFile.data.buffer.slice(
                    actualFile.data.byteOffset,
                    actualFile.data.byteOffset + actualFile.data.byteLength
                  );
                } else if (typeof actualFile.data === 'object' && actualFile.data !== null) {
                  // Handle IndexedDB serialized ArrayBuffer
                  const dataObj = actualFile.data as any;
                  if (dataObj.byteLength !== undefined && typeof dataObj.byteLength === 'number') {
                    const uint8Array = new Uint8Array(Object.values(dataObj));
                    blobData = uint8Array.buffer;
                  } else {
                    console.error('Cannot create blob from data object:', actualFile.data);
                    return null;
                  }
                } else {
                  console.error('Cannot create blob from data type:', typeof actualFile.data);
                  return null;
                }
                return new Blob([blobData], { type: actualFile.type });
              } catch (error) {
                console.error('Error creating blob:', error);
                return null;
              }
            })() : null;
            const url = blob ? URL.createObjectURL(blob) : '';
            const isLoading = loadingFiles.has(idx);
            // Always load from server if file has serverId and not already cached
            const needsServerLoad = file.serverId && !serverFiles.has(file.serverId);
            
            // Auto-load from server if needed
            if (needsServerLoad && !isLoading) {
              loadFileFromServer(file, idx);
            }
            
            return (
              <div key={idx} className="bg-muted p-2 sm:p-4 rounded-lg relative">
                <div className="flex items-center gap-2 mb-2">
                  {isImage ? <ImageIcon className="w-5 h-5" /> : isPDF ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                  <span className="font-medium">{file.name}</span>
                  {file.serverId && (
                    <Badge variant="secondary" className="text-xs">Server</Badge>
                  )}
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Bestand laden van server...</span>
                  </div>
                ) : blob ? (
                  <>
                    <div className="absolute top-2 right-2 flex gap-1">
                      {file.serverId && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            // Clear cached server file and force reload
                            setServerFiles(prev => {
                              const newMap = new Map(prev);
                              newMap.delete(file.serverId!);
                              return newMap;
                            });
                            loadFileFromServer(file, idx);
                          }}
                          title="Reload from server"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => downloadFile(actualFile)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    {isImage && url && (
                      <div className="flex justify-center">
                        <img src={url} alt={file.name} className="max-w-full max-h-64 sm:max-h-96 object-contain rounded-lg" onLoad={() => URL.revokeObjectURL(url)} />
                      </div>
                    )}
                    {isPDF && url && (
                      <div className="flex justify-center">
                        <iframe src={url} className="w-full h-64 sm:h-96 border rounded-lg" title={file.name} />
                      </div>
                    )}
                    {isText && actualFile.data && (
                      <div className="bg-background p-2 rounded mt-2 max-h-64 sm:max-h-96 overflow-auto">
                        <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words max-w-full">
                          {(() => {
                            try {
                              // Ensure data is ArrayBuffer or convert it
                              let arrayBuffer: ArrayBuffer;
                              if (actualFile.data instanceof ArrayBuffer) {
                                arrayBuffer = actualFile.data;
                              } else if (actualFile.data instanceof Uint8Array) {
                                arrayBuffer = actualFile.data.buffer.slice(
                                  actualFile.data.byteOffset,
                                  actualFile.data.byteOffset + actualFile.data.byteLength
                                );
                              } else if (typeof actualFile.data === 'object' && actualFile.data !== null) {
                                // Handle IndexedDB serialized ArrayBuffer (converted to plain object)
                                // Try to convert object back to ArrayBuffer
                                const dataObj = actualFile.data as any;
                                if (dataObj.byteLength !== undefined && typeof dataObj.byteLength === 'number') {
                                  // This looks like a serialized ArrayBuffer
                                  const uint8Array = new Uint8Array(Object.values(dataObj));
                                  arrayBuffer = uint8Array.buffer;
                                } else {
                                  console.error('Unexpected data object structure:', actualFile.data);
                                  return 'Error: Cannot convert data object to ArrayBuffer';
                                }
                              } else {
                                console.error('Unexpected data type:', typeof actualFile.data, actualFile.data);
                                return 'Error: Unsupported data format';
                              }
                              return new TextDecoder().decode(arrayBuffer);
                            } catch (error) {
                              console.error('Failed to decode text file:', error);
                              return 'Error: Failed to decode file content';
                            }
                          })()
                        }
                        </pre>
                      </div>
                    )}
                  </>
                ) : needsServerLoad ? (
                  <div className="flex items-center justify-center py-8">
                    <Button 
                      variant="outline" 
                      onClick={() => loadFileFromServer(file, idx)}
                      disabled={isLoading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Bestand laden van server
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <span className="text-sm">Bestand niet beschikbaar</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // If we only have filepath, show file info
    if (filepath) {
      return (
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            File: {filepath}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This file was added before the file viewer was implemented. 
            Only the filename is stored.
          </p>
        </div>
      )
    }

    // Notes and other content
    if (description) {
      return (
        <div className="bg-muted p-2 sm:p-4 rounded-lg overflow-x-auto">
          <p className="text-xs sm:text-sm whitespace-pre-wrap break-all max-w-full">{description}</p>
        </div>
      )
    }

    return (
      <div className="text-center text-muted-foreground">
        No content to display
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fileData && fileData.length > 0 && fileData[0] ? (
              <>
                {fileData[0].type?.startsWith('image/') ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                {fileData[0].name}
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                {currentItem.name}
              </>
            )}
            <Badge variant="outline">{currentItem.category || '-'}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Content Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{category === 'notes' || category === 'links' || category === 'passwords' ? 'Content' : 'Preview'}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>

          {/* Actions */}
          {/* Download File knop verwijderd */}
        </div>
      </DialogContent>
    </Dialog>
  )
}