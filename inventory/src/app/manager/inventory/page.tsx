'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Grid3x3, List, AlertCircle, CheckCircle, Package, Edit2, Trash2, X, MinusCircle, XCircle, Plus, Save, Coffee } from 'lucide-react'
import { Sidebar } from '../sidebar';
import './inventory.css'

interface InventoryItem {
  id: number
  name: string
  category: string
  current_quantity: number
  unit: string
  min_threshold: number
  max_threshold: number
  status: 'healthy' | 'medium' | 'low' | 'out'
  category_id?: number
  unit_id?: number
  description?: string
}

interface Category {
  id: number
  name: string
}

interface Unit {
  id: number
  name: string
}

interface Ingredient {
  item_id: number
  item_name: string
  quantity: number
  unit: string
  current_stock: number
  minimum_stock: number
  maximum_stock: number
  status?: 'healthy' | 'medium' | 'low' | 'out'
}

interface Recipe {
  id: number
  name: string
  ingredients: Ingredient[]
}

export default function CafeInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('inventory')
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [validationError, setValidationError] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showEditRecipeModal, setShowEditRecipeModal] = useState(false)
  const [showDeleteRecipeModal, setShowDeleteRecipeModal] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [recipeValidationError, setRecipeValidationError] = useState('')
  const [inventoryView, setInventoryView] = useState<'items' | 'recipes'>('items')

  const API_BASE_URL = 'https://beantrack-esht.onrender.com';

  useEffect(() => {
    fetchInventory()
    fetchCategories()
    fetchUnits()
    fetchRecipes()
  }, [])

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data)
      } else {
        setError('Failed to load inventory')
      }
    } catch (err) {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/units', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUnits(data)
      }
    } catch (err) {
      console.error('Error fetching units:', err)
    }
  }

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/recipes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecipes(data)
      }
    } catch (err) {
      console.error('Error fetching recipes:', err)
    }
  }

  const formatNumber = (value: number) => {
    return value % 1 === 0 ? Math.floor(value) : value
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredRecipes = recipes.filter(recipe => {
    return recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const categoryList = ['All', ...Array.from(new Set(items.map(item => item.category)))]

  const getStatusBadge = (item: InventoryItem | Ingredient) => {
    const status = 'status' in item ? item.status : undefined
    const badges = {
      healthy: { color: '#16a34a', label: 'Healthy', icon: CheckCircle },
      medium: { color: '#e1bc42', label: 'Medium', icon: MinusCircle },
      low: { color: '#eb912c', label: 'Low Stock', icon: AlertCircle },
      out: { color: '#dc2626', label: 'Out of Stock', icon: XCircle }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.healthy;
    const Icon = badge.icon;
    
    return (
      <span className="status-badge" style={{ color: badge.color, backgroundColor: `${badge.color}15` }}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  }

  const getProgressPercentage = (item: InventoryItem) => {
    return Math.min((item.current_quantity / item.max_threshold) * 100, 100)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setValidationError('')
    setShowEditModal(true)
  }

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`${API_BASE_URL}/api/inventory/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setShowDeleteModal(false)
        setItemToDelete(null)
        fetchInventory()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete item')
      }
    } catch (err) {
      alert('Unable to delete item')
    }
  }

  const validateEdit = () => {
    if (!editingItem) return false

    if (!editingItem.name.trim()) {
      setValidationError('Item name cannot be empty')
      return false
    }

    const duplicateName = items.find(
      item => item.id !== editingItem.id && 
      item.name.toLowerCase() === editingItem.name.trim().toLowerCase()
    )
    if (duplicateName) {
      setValidationError('An item with this name already exists')
      return false
    }

    if (!editingItem.category_id) {
      setValidationError('Please select a category')
      return false
    }

    if (!editingItem.unit_id) {
      setValidationError('Please select a unit')
      return false
    }

    if (editingItem.min_threshold > editingItem.max_threshold) {
      setValidationError('Minimum stock cannot exceed maximum stock')
      return false
    }

    if (editingItem.max_threshold < editingItem.min_threshold) {
      setValidationError('Maximum stock must be greater than minimum stock')
      return false
    }

    if (editingItem.current_quantity < 0 || editingItem.min_threshold < 0 || editingItem.max_threshold < 0) {
      setValidationError('Stock values cannot be negative')
      return false
    }

    setValidationError('')
    return true
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    if (!validateEdit()) {
      return
    }

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`${API_BASE_URL}/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_name: editingItem.name.trim(),
          category_id: editingItem.category_id,
          unit_id: editingItem.unit_id,
          current_stock: editingItem.current_quantity,
          minimum_stock: editingItem.min_threshold,
          maximum_stock: editingItem.max_threshold,
          description: editingItem.description
        })
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingItem(null)
        setValidationError('')
        fetchInventory()
      } else {
        const data = await response.json()
        setValidationError(data.error || 'Failed to update item')
      }
    } catch (err) {
      setValidationError('Unable to update item')
    }
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setRecipeValidationError('')
    setShowEditRecipeModal(true)
  }

  const handleDeleteRecipeClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe)
    setShowDeleteRecipeModal(true)
  }

  const handleDeleteRecipeConfirm = async () => {
    if (!recipeToDelete) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setShowDeleteRecipeModal(false)
        setRecipeToDelete(null)
        setSuccessMessage('Recipe deleted successfully!')
        setShowSuccessModal(true)
        fetchRecipes()
      } else {
        const data = await response.json()
        setRecipeValidationError(data.error || 'Failed to delete recipe')
      }
    } catch (err) {
      setRecipeValidationError('Unable to delete recipe')
    }
  }

  const validateRecipeEdit = () => {
    if (!editingRecipe) return false

    if (!editingRecipe.name.trim()) {
      setRecipeValidationError('Recipe name cannot be empty')
      return false
    }

    if (editingRecipe.ingredients.length === 0) {
      setRecipeValidationError('Recipe must have at least one ingredient')
      return false
    }

    for (const ing of editingRecipe.ingredients) {
      if (!ing.item_id || ing.quantity <= 0) {
        setRecipeValidationError('All ingredients must have valid items and quantities')
        return false
      }
    }

    setRecipeValidationError('')
    return true
  }

  const handleSaveRecipeEdit = async () => {
    if (!editingRecipe) return

    if (!validateRecipeEdit()) {
      return
    }

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch(`${API_BASE_URL}/api/recipes/${editingRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe_name: editingRecipe.name.trim(),
          ingredients: editingRecipe.ingredients.map(ing => ({
            item_id: ing.item_id,
            quantity_required: ing.quantity
          }))
        })
      })

      if (response.ok) {
        setShowEditRecipeModal(false)
        setEditingRecipe(null)
        setRecipeValidationError('')
        setSuccessMessage('Recipe updated successfully!')
        setShowSuccessModal(true)
        fetchRecipes()
      } else {
        const data = await response.json()
        setRecipeValidationError(data.error || 'Failed to update recipe')
      }
    } catch (err) {
      setRecipeValidationError('Unable to update recipe')
    }
  }

  const addIngredientToRecipe = () => {
    if (!editingRecipe) return
    setEditingRecipe({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, {
        item_id: 0,
        item_name: '',
        quantity: 0,
        unit: '',
        current_stock: 0,
        minimum_stock: 0,
        maximum_stock: 0
      }]
    })
  }

  const removeIngredientFromRecipe = (index: number) => {
    if (!editingRecipe) return
    setEditingRecipe({
      ...editingRecipe,
      ingredients: editingRecipe.ingredients.filter((_, i) => i !== index)
    })
  }

  const updateRecipeIngredient = (index: number, field: string, value: any) => {
    if (!editingRecipe) return
    const newIngredients = [...editingRecipe.ingredients]
    if (field === 'item_id') {
      const item = items.find(i => i.id === parseInt(value))
      if (item) {
        newIngredients[index] = {
          ...newIngredients[index],
          item_id: parseInt(value),
          item_name: item.name,
          unit: item.unit
        }
      }
    } else if (field === 'quantity') {
      newIngredients[index] = {
        ...newIngredients[index],
        quantity: parseFloat(value) || 0
      }
    }
    setEditingRecipe({
      ...editingRecipe,
      ingredients: newIngredients
    })
  }

  const getAvailableItemsForRecipe = (currentIndex: number) => {
    if (!editingRecipe) return items
    const selectedIds = editingRecipe.ingredients
      .map((ing, idx) => idx !== currentIndex ? ing.item_id : 0)
      .filter(id => id > 0)
    return items.filter(item => !selectedIds.includes(item.id))
  }

  if (loading) {
    return (
      <div className="loading-message">
        Loading inventory...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />  

      <div className="inventory-content" style={{ flex: 1 }}>
        <div className="inventory-header">
          <div>
            <h1 className="inventory-title">Inventory</h1>
            <p className="inventory-subtitle">
              Manage your cafe's stock levels and track usage
            </p>
          </div>

          <div className="status-legend">
            {getStatusBadge({ status: 'healthy' } as InventoryItem)}
            {getStatusBadge({ status: 'medium' } as InventoryItem)}
            {getStatusBadge({ status: 'low' } as InventoryItem)}
            {getStatusBadge({ status: 'out' } as InventoryItem)}
          </div>
        </div>

        <div className="search-filters-container">
          <div className="view-toggle">
            <button
              onClick={() => setInventoryView('items')}
              className={`view-button ${inventoryView === 'items' ? 'active' : ''}`}
            >
              Items ({items.length})
            </button>
            <button
              onClick={() => setInventoryView('recipes')}
              className={`view-button ${inventoryView === 'recipes' ? 'active' : ''}`}
            >
              Recipes ({recipes.length})
            </button>
          </div>

              <div className="search-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search inventory items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

          {inventoryView === 'items' && (
            <>
              <div className="filter-container">
                <Filter size={20} style={{ color: '#6b7280' }} />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  {categoryList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="view-toggle">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                >
                  <Grid3x3 size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                >
                  <List size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {inventoryView === 'items' && (
          <>
            <div className="item-count">
              <span><Package size={16} /></span>
              <span>Showing {filteredItems.length} of {items.length} items</span>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {viewMode === 'grid' && (
              <div className="grid-view">
                {filteredItems.map(item => (
                  <div key={item.id} className="inventory-card">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">{item.name}</h3>
                        <p className="card-category">{item.category}</p>
                      </div>
                      {getStatusBadge(item)}
                    </div>

                    <div className="card-quantity">
                      <div className="quantity-value">{formatNumber(item.current_quantity)}</div>
                      <div className="quantity-unit">{item.unit}</div>
                    </div>

                    <div className="progress-bar-container">
                      <div 
                        className={`progress-bar progress-bar-${item.status}`}
                        style={{ width: `${getProgressPercentage(item)}%` }}
                      />
                    </div>

                    <div className="threshold-info">
                      <span>Min: {formatNumber(item.min_threshold)}</span>
                      <span>Max: {formatNumber(item.max_threshold)}</span>
                    </div>

                    <div className="card-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(item)
                        }}
                        className="action-button edit-button"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(item)
                        }}
                        className="action-button delete-button"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="list-view">
                <div className="list-header">
                  <div>Item</div>
                  <div>Category</div>
                  <div>Stock</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>

                {filteredItems.map(item => (
                  <div key={item.id} className="list-row">
                    <div>
                      <div className="list-item-name">{item.name}</div>
                      <div className="list-item-unit">{item.unit}</div>
                    </div>

                    <div>
                      <span className="list-category-badge">{item.category}</span>
                    </div>

                    <div>
                      <div className="list-stock-value">
                        {formatNumber(item.current_quantity)} {item.unit}
                      </div>
                      <div className="list-threshold">
                        Min: {formatNumber(item.min_threshold)} | Max: {formatNumber(item.max_threshold)}
                      </div>
                    </div>

                    <div>
                      {getStatusBadge(item)}
                    </div>

                    <div className="list-actions">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="action-icon-button edit-icon-button"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(item)}
                        className="action-icon-button delete-icon-button"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="empty-state">
                <p>No items found matching your search.</p>
              </div>
            )}
          </>
        )}

        {inventoryView === 'recipes' && (
          <>
            <div className="item-count">
              <span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                  <line x1="6" y1="17" x2="18" y2="17"/>
                </svg>
              </span>
              <span>Showing {filteredRecipes.length} of {recipes.length} recipes</span>
            </div>

            <div className="recipe-grid">
              {filteredRecipes.map(recipe => (
                <div key={recipe.id} className="recipe-card">
                  <div className="recipe-header">
                    <h3 className="recipe-title">{recipe.name}</h3>
                  </div>

                  <div className="ingredients-section">
                    <p className="ingredients-label">Ingredients per serving:</p>
                    <div className="ingredients-list">
                      {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="ingredient-item">
                          <div className="ingredient-info">
                            <span className="ingredient-name">{ing.item_name}:</span>
                            <span className="ingredient-quantity">
                              {formatNumber(ing.quantity)}{ing.unit}
                            </span>
                          </div>
                          {getStatusBadge(ing)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      onClick={() => handleEditRecipe(recipe)}
                      className="action-button edit-button"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteRecipeClick(recipe)}
                      className="action-button delete-button"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredRecipes.length === 0 && (
              <div className="empty-state">
                <p>No recipes found matching your search.</p>
              </div>
            )}
          </>
        )}

        {showEditModal && editingItem && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Item</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {validationError && (
                  <div className="validation-error">
                    {validationError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      value={editingItem.category_id || ''}
                      onChange={(e) => setEditingItem({...editingItem, category_id: Number(e.target.value)})}
                      className="form-input"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      value={editingItem.unit_id || ''}
                      onChange={(e) => setEditingItem({...editingItem, unit_id: Number(e.target.value)})}
                      className="form-input"
                    >
                      <option value="">Select unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Stock</label>
                  <input
                    type="number"
                    value={editingItem.current_quantity === 0 ? '' : editingItem.current_quantity}
                    onChange={(e) => setEditingItem({...editingItem, current_quantity: Number(e.target.value)})}
                    className="form-input"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Minimum Stock</label>
                    <input
                      type="number"
                      value={editingItem.min_threshold === 0 ? '' : editingItem.min_threshold}
                      onChange={(e) => setEditingItem({...editingItem, min_threshold: Number(e.target.value)})}
                      className="form-input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Maximum Stock</label>
                    <input
                      type="number"
                      value={editingItem.max_threshold === 0 ? '' : editingItem.max_threshold}
                      onChange={(e) => setEditingItem({...editingItem, max_threshold: Number(e.target.value)})}
                      className="form-input"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                    className="form-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="modal-button save-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && itemToDelete && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Delete Item</h2>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="delete-warning">
                  Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
                </p>
                <p className="delete-subtext">
                  This action cannot be undone.
                </p>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteConfirm}
                  className="modal-button delete-confirm-button"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditRecipeModal && editingRecipe && (
          <div className="modal-overlay" onClick={() => setShowEditRecipeModal(false)}>
            <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit Recipe</h2>
                <button 
                  onClick={() => setShowEditRecipeModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {recipeValidationError && (
                  <div className="validation-error">
                    {recipeValidationError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Recipe Name</label>
                  <input
                    type="text"
                    value={editingRecipe.name}
                    onChange={(e) => setEditingRecipe({...editingRecipe, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ingredients</label>
                  <div className="ingredients-edit-list">
                    {editingRecipe.ingredients.map((ing, index) => (
                      <div key={index} className="ingredient-edit-row">
                        <select
                          value={ing.item_id}
                          onChange={(e) => updateRecipeIngredient(index, 'item_id', e.target.value)}
                          className="ingredient-select"
                        >
                          <option value="0">Select ingredient...</option>
                          {getAvailableItemsForRecipe(index).map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={ing.quantity === 0 ? '' : ing.quantity}
                          onChange={(e) => updateRecipeIngredient(index, 'quantity', e.target.value)}
                          className="ingredient-quantity-input"
                          placeholder="Quantity"
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={() => removeIngredientFromRecipe(index)}
                          className="remove-ingredient-button"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addIngredientToRecipe}
                    className="add-ingredient-button"
                    type="button"
                  >
                    <Plus size={16} /> Add Ingredient
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowEditRecipeModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveRecipeEdit}
                  className="modal-button save-button"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteRecipeModal && recipeToDelete && (
          <div className="modal-overlay" onClick={() => setShowDeleteRecipeModal(false)}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Delete Recipe</h2>
                <button 
                  onClick={() => setShowDeleteRecipeModal(false)}
                  className="modal-close-button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="delete-warning">
                  Are you sure you want to delete <strong>{recipeToDelete.name}</strong>?
                </p>
                <p className="delete-subtext">
                  This action cannot be undone.
                </p>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => setShowDeleteRecipeModal(false)}
                  className="modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteRecipeConfirm}
                  className="modal-button delete-confirm-button"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
