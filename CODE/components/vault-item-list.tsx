"use client"

import { useRef, useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText,
  Link,
  Lock,
  CreditCard,
  StickyNote,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Trash2,
  Edit,
  Calendar,
  Eye,
  ChevronDown,
  Star,
  GripVertical,
  Paperclip,
} from "lucide-react"
import { VaultItem } from "@/lib/database"
import { VaultItemForm } from "./vault-item-form"
import { FileViewer } from "./file-viewer"
import { formatDistanceToNow } from "date-fns"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface VaultItemListProps {
  items: VaultItem[]
  loading: boolean
  error: string | null
  searchQuery: string
  selectedCategory: VaultItem["category"] | "all"
  viewMode: "grid" | "list"
  onSearchChange: (query: string) => void
  onCategoryChange: (category: VaultItem["category"] | "all") => void
  onSort: (
    sortBy: "name" | "createdAt" | "updatedAt" | "category",
    direction: "asc" | "desc",
  ) => void
  onDelete: (id: number) => Promise<void>
  onUpdate: (
    id: number,
    updates: Partial<Omit<VaultItem, "id" | "createdAt">>,
  ) => Promise<void>
  onReorder?: (items: VaultItem[]) => Promise<void>
}

const categoryIcons = {
  passwords: Lock,
  notes: StickyNote,
  links: Link,
  files: FileText,
  cards: CreditCard,
}

const categoryColors = {
  passwords: "bg-[#e53935] text-white",
  notes: "bg-[#1e88e5] text-white",
  links: "bg-[#43a047] text-white",
  files: "bg-purple-600 text-white",
  cards: "bg-orange-600 text-white",
}

const categoryIconBg = categoryColors // zelfde kleuren

/* ------------------------------------------------------------- */

export function VaultItemList({
  items,
  loading,
  error,
  searchQuery,
  selectedCategory,
  viewMode,
  onSearchChange,
  onCategoryChange,
  onSort,
  onDelete,
  onUpdate,
  onReorder,
}: VaultItemListProps) {
  /* ----- local state ----- */
  const [sortBy, setSortBy] = useState<
    "name" | "createdAt" | "updatedAt" | "category"
  >("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [suppressOpenOnClick, setSuppressOpenOnClick] = useState(false)
  const [isDragEnabled, setIsDragEnabled] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null)
  const suppressTimeout = useRef<NodeJS.Timeout | null>(null)



  /* ----- dnd-kit sensors ----- */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  /* ----- handlers ----- */
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id === over?.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over?.id)
    const newItems = arrayMove(items, oldIndex, newIndex).map(
      (it, idx): VaultItem => ({ ...it, orderIndex: idx }),
    )
    onReorder?.(newItems)
  }

  const handleSort = (
    newSortBy: "name" | "createdAt" | "updatedAt" | "category",
  ) => {
    const dir = sortBy === newSortBy && sortDirection === "asc" ? "desc" : "asc"
    setSortBy(newSortBy)
    setSortDirection(dir)
    onSort(newSortBy, dir)
  }

  const handleUpdate = (
    id: number,
    updates: Partial<Omit<VaultItem, "id" | "createdAt">>,
  ) => onUpdate(id, updates)

  /* ---------------- SortableItem ---------------- */
  function SortableItem({ item }: { item: VaultItem }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: item.id!, disabled: !isDragEnabled })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const Icon = categoryIcons[item.category]
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    /* -------- JSX -------- */
    return (
      <div ref={setNodeRef} style={style} className={viewMode === "list" ? "mb-4" : ""}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Card
              className={`hover:shadow-md transition-shadow cursor-pointer group ${
                item.isFavorite ? "border border-yellow-400/60" : ""
              } ${isDragging ? "shadow-lg" : ""} ${
                viewMode === "grid" ? "h-full flex flex-col" : ""
              }`}
              onClick={(e) => {
                e.preventDefault()
                if (document.querySelector(".dialog[data-state='open']")) return
                if (suppressOpenOnClick) return
                window.dispatchEvent(
                  new CustomEvent("openFileViewer", { detail: { item } }),
                )
              }}
            >
              {/* --- card inner --- */}
              <div className="p-3 sm:p-4">
                <div
                  className={`flex ${
                    viewMode === "grid" ? "flex-col items-center" : "items-start"
                  } gap-2 sm:gap-3 flex-1 relative`}
                >
                  {/* drag handle */}
              {isDragEnabled && (
                <div
                  {...attributes}
                  {...listeners}
                  className="p-1 sm:p-2 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              {/* icon */}
              <div
                className={`p-2 rounded-lg ${
                  categoryIconBg[item.category]
                } ${viewMode === "grid" ? "mb-2 sm:mb-3" : ""}`}
              >
                <Icon className={viewMode === "grid" ? "w-6 h-6 sm:w-8 sm:h-8" : "w-5 h-5"} />
              </div>

                  {/* main content */}
                  <div
                    className={`flex flex-col ${
                      viewMode === "grid" ? "items-center text-center" : "justify-between"
                    } flex-1 ${
                      viewMode === "list" ? "min-h-[72px]" : ""
                    } cursor-pointer`}
                    onClick={(e) => {
                      e.preventDefault()
                      if (document.querySelector(".dialog[data-state='open']")) return
                      if (suppressOpenOnClick) return
                      window.dispatchEvent(
                        new CustomEvent("openFileViewer", { detail: { item } }),
                      )
                    }}
                  >
                    <div>
                      <CardTitle className={`${viewMode === "grid" ? "text-sm sm:text-base" : "text-lg"} group-hover:text-blue-600 transition-colors flex items-center gap-2 leading-tight`}>
                        <span className="truncate">{item.name}</span>
                        {item.isFavorite && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        )}
                      </CardTitle>
                      {item.platform && (
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
                          {item.platform}
                        </div>
                      )}
                      {item.description && (
                        <CardDescription className={`text-sm mt-2 ${viewMode === "grid" ? "line-clamp-2" : "line-clamp-3"}`}>
                          {item.description}
                        </CardDescription>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-1 sm:gap-2 mt-3 sm:mt-4 ${
                        viewMode === "grid" ? "flex-wrap justify-center" : "flex-wrap"
                      }`}
                    >
                      <Badge className={`text-xs ${categoryColors[item.category]}`}>
                        {item.category}
                      </Badge>
                      <span className="flex items-center text-[9px] sm:text-[10px] font-normal text-muted-foreground/70">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        }).replace(/[{}()]/g, "")}
                      </span>
                      {(item.fileData || item.filepath) && (
                        <span className="flex items-center text-[9px] sm:text-[10px] font-normal text-muted-foreground/70">
                          <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          <span className="hidden sm:inline">has attachment</span>
                          <span className="sm:hidden">file</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* view-/edit-/delete-buttons */}
                  <div
                    className={`flex items-center gap-2 absolute ${
                      viewMode === "grid"
                        ? "bottom-0 right-0 mb-4 mr-4"
                        : "top-0 right-0"
                    }`}
                  >


                    {/* hidden buttons -> voor contextmenu */}
                    <Button
                      id={`edit-btn-${item.id}`}
                      className="hidden"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSuppressOpenOnClick(true)
                        if (suppressTimeout.current)
                          clearTimeout(suppressTimeout.current)
                        suppressTimeout.current = setTimeout(
                          () => setSuppressOpenOnClick(false),
                          500,
                        )
                        setEditDialogOpen(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>


                  </div>
                </div>
              </div>
            </Card>
          </ContextMenuTrigger>

          {/* context menu */}
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("openFileViewer", { detail: { item } }),
                )
              }
            >
              Bekijken
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setEditDialogOpen(true)}>
              Bewerken
            </ContextMenuItem>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setSuppressOpenOnClick(true)
                if (suppressTimeout.current)
                  clearTimeout(suppressTimeout.current)
                suppressTimeout.current = setTimeout(
                  () => setSuppressOpenOnClick(false),
                  1000,
                )
                setItemToDelete(item)
                setDeleteDialogOpen(true)
              }}
            >
              Verwijderen
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* edit dialog using VaultItemForm */}
        <VaultItemForm
          item={item}
          mode="edit"
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={async (updatedItem) => {
            if (item.id) {
              await handleUpdate(item.id, updatedItem)
              setEditDialogOpen(false)
            }
          }}
          trigger={
            <Button
              variant="outline"
              size="sm"
              style={{ display: 'none' }}
            >
              <Edit className="w-4 h-4" />
            </Button>
          }
        />


      </div>
    )
  }
  /* ---------- einde SortableItem ---------- */

  /* ---------- loader / error ---------- */
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  /* ---------- SEARCH / FILTER BAR ---------- */
  const controlBar = (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant={isDragEnabled ? "secondary" : "outline"}
          onClick={() => setIsDragEnabled((v) => !v)}
          className="shrink-0 flex items-center gap-2 px-3 w-full sm:w-auto"
          title={isDragEnabled ? "Schakel herordenen uit" : "Schakel herordenen in"}
        >
          <GripVertical
            className={`h-4 w-4 ${
              isDragEnabled ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <span className="text-sm">Herordenen</span>
        </Button>

        {/* category filter */}
        <Select
          value={selectedCategory}
          onValueChange={(val: VaultItem["category"] | "all") => onCategoryChange(val)}
        >
          <SelectTrigger className="w-full sm:w-48 text-sm justify-start">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="passwords">Passwords</SelectItem>
            <SelectItem value="notes">Notes</SelectItem>
            <SelectItem value="links">Links</SelectItem>
            <SelectItem value="files">Files</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
          </SelectContent>
        </Select>

        {/* sort */}
        <Select
          value={sortBy}
          onValueChange={(val: "name" | "createdAt" | "updatedAt" | "category") =>
            handleSort(val)
          }
        >
          <SelectTrigger className="w-full sm:w-48 text-sm justify-start">
            {sortDirection === "asc" ? (
              <SortAsc className="w-3 h-3 mr-2" />
            ) : (
              <SortDesc className="w-3 h-3 mr-2" />
            )}
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
            <SelectItem value="category">Category</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  /* ---------- LIST MARKUP (geen ternaries in JSX) ---------- */
  let listMarkup: React.ReactNode

  if (items.length === 0) {
    listMarkup = (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {searchQuery || selectedCategory !== "all"
              ? "No items found matching your criteria."
              : "No items yet. Add your first item to get started!"}
          </p>
        </CardContent>
      </Card>
    )
  } else if (isDragEnabled) {
    listMarkup = (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleReorder}
      >
        <SortableContext
          items={items
            .map((i) => i.id)
            .filter((id): id is number => id !== undefined)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={`transition-all duration-300 ${
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
            }`}
          >
            {items.map((it) => (
              <SortableItem key={it.id} item={it} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    )
  } else {
    listMarkup = (
      <div
        className={`transition-all duration-300 ${
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-4"
        }`}
      >
        {items.map((it) => (
          <SortableItem key={it.id} item={it} />
        ))}
      </div>
    )
  }

  /* ---------- MAIN RETURN ---------- */
  return (
    <div className="space-y-6">
      {controlBar}
      {listMarkup}
      
      {/* Global delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false)
              setItemToDelete(null)
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                if (itemToDelete?.id) {
                  setDeleteDialogOpen(false)
                  setSuppressOpenOnClick(true)
                  if (suppressTimeout.current)
                    clearTimeout(suppressTimeout.current)
                  suppressTimeout.current = setTimeout(
                    () => setSuppressOpenOnClick(false),
                    1000,
                  )
                  // Direct delete zonder timeout voor instant UI update
                  await onDelete(itemToDelete.id!);
                  setItemToDelete(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
