"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Eye, Image as ImageIcon, File } from "lucide-react"
import { VaultItem } from "@/lib/database"

interface FileViewerProps {
  item: VaultItem
  trigger?: React.ReactNode
}

export function FileViewer({ item, trigger }: FileViewerProps) {
  const [open, setOpen] = useState(false)

  if (!item.fileData && !item.filepath) {
    return null
  }

  // If we only have filepath but no fileData, show a message
  if (!item.fileData && item.filepath) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View File
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                File: {item.filepath}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This file was added before the file viewer was implemented. 
                Only the filename is stored. Add a new file to see the full preview.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const { fileData } = item
  if (!fileData || fileData.length === 0) return null
  // Voor nu: toon alleen het eerste bestand
  const file = fileData[0];
  if (!file) return null;
  const isImage = file.type.startsWith('image/')
  const isText = file.type.startsWith('text/') || file.type.includes('pdf')
  const isPDF = file.type === 'application/pdf'

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const downloadFile = () => {
    const blob = new Blob([file.data], { type: file.type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderFileContent = () => {
    if (isImage) {
      const blob = new Blob([file.data], { type: file.type })
      const url = URL.createObjectURL(blob)
      return (
        <div className="flex justify-center">
          <img 
            src={url} 
            alt={file.name}
            className="max-w-full max-h-64 sm:max-h-96 object-contain rounded-lg"
            onLoad={() => URL.revokeObjectURL(url)}
          />
        </div>
      )
    }

    if (isText && !isPDF) {
      const text = new TextDecoder().decode(file.data)
      return (
        <div className="bg-muted p-2 sm:p-4 rounded-lg max-h-64 sm:max-h-96 overflow-auto">
          <pre className="text-xs sm:text-sm whitespace-pre-wrap">{text}</pre>
        </div>
      )
    }

    if (isPDF) {
      const blob = new Blob([file.data], { type: file.type })
      const url = URL.createObjectURL(blob)
      return (
        <div className="flex justify-center">
          <iframe
            src={url}
            className="w-full h-64 sm:h-96 border rounded-lg"
            title={file.name}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
        <div className="text-center">
          <File className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preview not available for this file type
          </p>
        </div>
      </div>
    )
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="w-4 h-4 mr-2" />
      View File
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            {file.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">File Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm font-medium">Type:</span>
                <Badge variant="outline" className="self-start sm:self-auto">{file.type}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm font-medium">Size:</span>
                <span className="text-sm">{formatFileSize(file.size)}</span>
              </div>
            </CardContent>
          </Card>

          {/* File Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFileContent()}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={downloadFile}>
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}