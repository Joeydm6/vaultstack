"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { db } from '@/lib/database'

interface DatabaseContextType {
  isInitialized: boolean
  error: string | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  error: null
})

export function useDatabase() {
  return useContext(DatabaseContext)
}

interface DatabaseProviderProps {
  children: ReactNode
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Test database connection
        await db.open()
        console.log('Database initialized successfully')
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize database:', err)
        setError('Failed to initialize database')
      }
    }

    initializeDatabase()
  }, [])

  return (
    <DatabaseContext.Provider value={{ isInitialized, error }}>
      {children}
    </DatabaseContext.Provider>
  )
} 