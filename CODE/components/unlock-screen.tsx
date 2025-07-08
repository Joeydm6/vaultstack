"use client"

import { useState } from "react"
import { Eye, EyeOff, Shield, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthService } from "@/lib/auth"

interface UnlockScreenProps {
  onUnlock: (password: string) => Promise<void>
}

export function UnlockScreen({ onUnlock }: UnlockScreenProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError("Master wachtwoord is verplicht")
      return
    }
    setIsLoading(true)
    setError("")
    
    try {
      await onUnlock(password)
    } catch (error) {
      console.error('Unlock error:', error)
      setError("Ongeldig master wachtwoord of verbindingsfout")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VaultStack</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Voer je master wachtwoord in om je versleutelde kluis te ontgrendelen
          </p>
        </div>

        {/* Login card */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              Master Wachtwoord
            </CardTitle>
            <CardDescription className="text-slate-400">Toegang tot je beveiligde gegevens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Wachtwoord
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Voer je master wachtwoord in"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-12 h-12 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}</span>
                  </Button>
                </div>
              </div>
              {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!password || isLoading}
                type="submit"
              >
                {isLoading ? "Ontgrendelen..." : "Ontgrendel Kluis"}
              </Button>
            </form>
            {/* Security info */}
            <div className="pt-4 border-t border-slate-700/50">
              <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <p className="text-xs text-slate-400 font-medium">Belangrijk:</p>
                </div>
                <p className="text-xs text-slate-300">Zonder je master wachtwoord zijn je gegevens niet toegankelijk. Bewaar het op een veilige plaats.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">Beveiligd met end-to-end encryptie • Offline-first</p>
        </div>
      </div>
    </div>
  )
}

export default UnlockScreen;
