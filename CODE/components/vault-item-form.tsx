"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit, FileText, Link, Lock, CreditCard, StickyNote, Star } from "lucide-react"
import { VaultItem, FileData } from "@/lib/database"

interface VaultItemFormProps {
  item?: VaultItem
  onSave: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  trigger?: React.ReactNode
  mode?: 'add' | 'edit'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const categoryOptions = [
  { value: 'passwords', label: 'Passwords', icon: Lock },
  { value: 'notes', label: 'Notes', icon: StickyNote },
  { value: 'links', label: 'Links', icon: Link },
  { value: 'files', label: 'Files', icon: FileText },
]

export function VaultItemForm({ item, onSave, trigger, mode = 'add', open: externalOpen, onOpenChange: externalOnOpenChange }: VaultItemFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'passwords' as VaultItem['category'],
    description: '',
    filepath: '',
    fileData: [] as FileData[],
    // Password fields
    platform: '',
    username: '',
    password: '',
    url: '',
    // Link fields
    linkUrl: '',
    links: '',
    isFavorite: false
  })

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        name: item.name,
        category: item.category,
        description: item.description || '',
        filepath: item.filepath || '',
        fileData: Array.isArray(item.fileData) ? item.fileData : item.fileData ? [item.fileData] : [],
        platform: item.platform || '',
        username: item.username || '',
        password: item.password || '',
        url: item.url || '',
        linkUrl: item.linkUrl || '',
        links: item.links || '',
        isFavorite: !!item.isFavorite
      })
    }
  }, [item, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      await onSave(formData)
      setOpen(false)
      setFormData({ 
        name: '', 
        category: 'passwords', 
        description: '', 
        filepath: '', 
        fileData: [],
        platform: '',
        username: '',
        password: '',
        url: '',
        linkUrl: '',
        links: '',
        isFavorite: false
      })
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles: FileData[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const arrayBuffer = await file.arrayBuffer();
          newFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: arrayBuffer
          });
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
      setFormData(prev => ({
        ...prev,
        fileData: [...(prev.fileData || []), ...newFiles]
      }));
    }
  }

  const defaultTrigger = mode === 'add' ? (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add Item
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Edit className="w-4 h-4 mr-2" />
      Edit
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent 
        className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: VaultItem['category']) => 
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {option.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
                required
              />
            </div>
            <button
              type="button"
              aria-label={formData.isFavorite ? 'Unmark as favorite' : 'Mark as favorite'}
              className="self-start sm:self-end p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900"
              onClick={e => {
                e.stopPropagation();
                setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }))
              }}
              tabIndex={0}
            >
              <Star
                className={formData.isFavorite ? 'w-6 h-6 text-yellow-500 fill-yellow-400' : 'w-6 h-6 text-muted-foreground'}
                fill={formData.isFavorite ? 'currentColor' : 'none'}
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Password Fields */}
          {formData.category === 'passwords' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Input
                  id="platform"
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                  placeholder="e.g., Gmail, GitHub, Netflix"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Website URL (optional)</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </>
          )}

          {/* Link Fields */}
          {formData.category === 'links' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="links">Links</Label>
                <Textarea
                  id="links"
                  value={formData.links}
                  onChange={(e) => setFormData(prev => ({ ...prev, links: e.target.value }))}
                  placeholder="Voer meerdere links in, elk op een nieuwe regel:\nhttps://example1.com\nhttps://example2.com\nhttps://example3.com"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Voer elke link op een nieuwe regel in voor de beste weergave
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Notes Fields */}
          {formData.category === 'notes' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Content</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter your note content..."
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Upload File(s) (optional)</Label>
                <Input
                  id="file"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                {formData.fileData && formData.fileData.length > 0 && (
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    {formData.fileData.map((f, idx) => (
                      <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 bg-muted/30 rounded">
                        <span className="flex-1 truncate text-xs sm:text-sm">{f.name}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setFormData(prev => ({ ...prev, fileData: prev.fileData.filter((_, i) => i !== idx) }))} className="self-start sm:self-auto text-xs">Remove</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* File Fields */}
          {formData.category === 'files' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Attachments</Label>
                <Input
                  id="file"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                {formData.fileData && formData.fileData.length > 0 && (
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    {formData.fileData.map((f, idx) => (
                      <li key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 bg-muted/30 rounded">
                        <span className="flex-1 truncate text-xs sm:text-sm">{f.name}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setFormData(prev => ({ ...prev, fileData: prev.fileData.filter((_, i) => i !== idx) }))} className="self-start sm:self-auto text-xs">Remove</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()} className="w-full sm:w-auto">
              {loading ? 'Saving...' : mode === 'add' ? 'Add Item' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}