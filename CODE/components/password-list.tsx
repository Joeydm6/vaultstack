"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Copy, ExternalLink, MoreVertical, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Password {
  id: string
  name: string
  username: string
  password: string
  url?: string
  category: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

interface PasswordListProps {
  passwords: Password[]
}

export function PasswordList({ passwords }: PasswordListProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())

  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(id)) {
      newVisible.delete(id)
    } else {
      newVisible.add(id)
    }
    setVisiblePasswords(newVisible)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // In real app: show toast notification
      console.log(`${type} gekopieerd naar klembord`)
    } catch (err) {
      console.error("Kopiëren mislukt:", err)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  }

  if (passwords.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-lg font-semibold mb-2">Geen wachtwoorden gevonden</h3>
        <p className="text-muted-foreground">Voeg je eerste wachtwoord toe om te beginnen</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {passwords.map((password) => (
        <Card key={password.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{password.name}</h3>
                  <Badge variant="outline">{password.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{password.username}</p>
                {password.description && <p className="text-sm text-muted-foreground mt-1">{password.description}</p>}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Bewerken
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Verwijderen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Username */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-20">Gebruiker:</span>
                <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">{password.username}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(password.username, "Gebruikersnaam")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* Password */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-20">Wachtwoord:</span>
                <code className="flex-1 text-sm bg-muted px-2 py-1 rounded font-mono">
                  {visiblePasswords.has(password.id) ? password.password : "•".repeat(password.password.length)}
                </code>
                <Button variant="ghost" size="icon" onClick={() => togglePasswordVisibility(password.id)}>
                  {visiblePasswords.has(password.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(password.password, "Wachtwoord")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {/* URL */}
              {password.url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-20">Website:</span>
                  <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">{password.url}</code>
                  <Button variant="ghost" size="icon" onClick={() => window.open(password.url, "_blank")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Aangemaakt: {formatDate(password.createdAt)}</span>
                <span>Gewijzigd: {formatDate(password.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
