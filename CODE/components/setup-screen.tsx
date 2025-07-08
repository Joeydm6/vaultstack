"use client"

import { useState } from "react"
import { Eye, EyeOff, Shield, Lock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface SetupScreenProps {
  onSetupComplete: (password: string) => Promise<void>
}

export function SetupScreen({ onSetupComplete }: SetupScreenProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): number => {
    let score = 0
    if (pwd.length >= 8) score += 25
    if (pwd.length >= 12) score += 25
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 25
    if (/\d/.test(pwd)) score += 15
    if (/[^\w\s]/.test(pwd)) score += 10
    return Math.min(score, 100)
  }

  const passwordStrength = calculatePasswordStrength(password)
  const getStrengthColor = (strength: number) => {
    if (strength < 30) return "bg-red-500"
    if (strength < 60) return "bg-yellow-500"
    if (strength < 80) return "bg-blue-500"
    return "bg-green-500"
  }

  const getStrengthText = (strength: number) => {
    if (strength < 30) return "Zwak"
    if (strength < 60) return "Matig"
    if (strength < 80) return "Sterk"
    return "Zeer sterk"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validations
    if (!password.trim()) {
      setError("Master wachtwoord is verplicht")
      return
    }

    if (password.length < 8) {
      setError("Master wachtwoord moet minimaal 8 karakters lang zijn")
      return
    }

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen")
      return
    }

    if (passwordStrength < 50) {
      setError("Kies een sterker wachtwoord voor betere beveiliging")
      return
    }

    setIsLoading(true)
    
    try {
      await onSetupComplete(password)
    } catch (error) {
      console.error('Setup error:', error)
      setError('Er is een fout opgetreden tijdens het instellen')
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
          <h1 className="text-3xl font-bold text-white mb-2">VaultStack Setup</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Welkom! Stel je master wachtwoord in om je versleutelde kluis te beveiligen
          </p>
        </div>

        {/* Setup card */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" />
              Master Wachtwoord Instellen
            </CardTitle>
            <CardDescription className="text-slate-400">
              Dit wachtwoord wordt gebruikt om al je gegevens te versleutelen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Master Wachtwoord
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kies een sterk master wachtwoord"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-12 h-12 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Wachtwoord sterkte:</span>
                      <span className={`font-medium ${
                        passwordStrength < 30 ? 'text-red-400' :
                        passwordStrength < 60 ? 'text-yellow-400' :
                        passwordStrength < 80 ? 'text-blue-400' : 'text-green-400'
                      }`}>
                        {getStrengthText(passwordStrength)}
                      </span>
                    </div>
                    <Progress 
                      value={passwordStrength} 
                      className="h-2 bg-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Confirm password field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300 text-sm font-medium">
                  Bevestig Master Wachtwoord
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Herhaal je master wachtwoord"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 pr-12 h-12 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-700/50"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password match indicator */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-xs">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Wachtwoorden komen overeen</span>
                      </>
                    ) : (
                      <span className="text-red-400">Wachtwoorden komen niet overeen</span>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={!password || !confirmPassword || isLoading || password !== confirmPassword}
                type="submit"
              >
                {isLoading ? "Kluis instellen..." : "Kluis Beveiligen"}
              </Button>
            </form>

            {/* Security info */}
            <div className="pt-4 border-t border-slate-700/50">
              <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                <p className="text-xs text-slate-400 mb-2 font-medium">🔒 Beveiligingsinformatie:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Je master wachtwoord wordt gebruikt voor encryptie</li>
                  <li>• Zonder dit wachtwoord zijn je gegevens niet toegankelijk</li>
                  <li>• Bewaar dit wachtwoord op een veilige plaats</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">End-to-end encryptie • Lokale opslag • Privacy first</p>
        </div>
      </div>
    </div>
  )
}

export default SetupScreen