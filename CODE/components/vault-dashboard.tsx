"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { VaultItemList } from "@/components/vault-item-list"
import { VaultItemForm } from "@/components/vault-item-form"
import { FileServerStatus } from "@/components/file-server-status"

import { useVaultItems } from "@/hooks/use-vault-items"
import { Shield, Lock, Key, Link, FileText, ImageIcon, Grid3X3, Star, LayoutGrid, List } from "lucide-react"
import { VaultItem } from "@/lib/database"

interface VaultDashboardProps {
  onLogout: () => void
}

export function VaultDashboard({ onLogout }: VaultDashboardProps) {
  const {
    allItems,
    items,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addItem,
    updateItem,
    deleteItem,
    sortItems,
    clearError,
    reorderItems
  } = useVaultItems()

  const [activeCategory, setActiveCategory] = useState<"all" | "favorites" | VaultItem['category']>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    // Load preference from localStorage, default to "list" if not set
    const savedViewMode = localStorage.getItem("vaultstack-view-mode");
    return (savedViewMode === "grid" || savedViewMode === "list") ? savedViewMode : "list";
  });

  // Save view mode preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("vaultstack-view-mode", viewMode);
  }, [viewMode]);

  // Update selected category when active category changes
  useEffect(() => {
    setSelectedCategory(activeCategory)
  }, [activeCategory, setSelectedCategory])

  const categories = [
    { id: "favorites", label: "Favorieten", icon: Star, count: allItems.filter(item => item.isFavorite).length },
    { id: "all", label: "All Items", icon: Grid3X3, count: allItems.length },
    { id: "passwords", label: "Passwords", icon: Key, count: allItems.filter(item => item.category === 'passwords').length },
    { id: "links", label: "Links", icon: Link, count: allItems.filter(item => item.category === 'links').length },
    { id: "notes", label: "Notes", icon: FileText, count: allItems.filter(item => item.category === 'notes').length },
    { id: "files", label: "Files", icon: ImageIcon, count: allItems.filter(item => item.category === 'files').length },
  ]

  const handleAddItem = async (itemData: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addItem(itemData)
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 border-r bg-background transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">VaultStack</span>
          </div>
        </div>

        <nav className="p-4 space-y-4">
          <div className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveCategory(category.id as "all" | "favorites" | VaultItem['category'])
                    setSidebarOpen(false) // Close sidebar on mobile after selection
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.label}
                  {category.count > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {category.count}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="icon" onClick={onLogout} title="Uitloggen">
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <FileServerStatus />
              </div>
              <div className="border rounded-md flex overflow-hidden">
                <Button 
                  variant={viewMode === "list" ? "subtle" : "ghost"}
                  size="sm"
                  className={`rounded-none px-2 sm:px-3 ${viewMode === "list" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Lijst</span>
                </Button>
                <Button 
                  variant={viewMode === "grid" ? "subtle" : "ghost"}
                  size="sm"
                  className={`rounded-none px-2 sm:px-3 ${viewMode === "grid" ? "bg-muted" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Grid</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {activeCategory === "all" ? "All Items" : categories.find(c => c.id === activeCategory)?.label}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {allItems.length} items total
              </p>
            </div>
            <div className="flex-shrink-0">
              <VaultItemForm onSave={handleAddItem} />
            </div>
          </div>

          <VaultItemList
            items={items}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory === "favorites" ? "all" : selectedCategory}
            viewMode={viewMode}
            onSearchChange={setSearchQuery}
            onCategoryChange={setSelectedCategory}
            onSort={sortItems}
            onDelete={deleteItem}
            onUpdate={updateItem}
            onReorder={reorderItems}
          />
        </main>
      </div>
    </div>
  )
}
