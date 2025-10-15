'use client'

import { useState, useEffect } from 'react'
import { Coffee, Plus, Minus, Save, CheckCircle, AlertCircle, XCircle, MinusCircle } from 'lucide-react'
import { Sidebar } from '../sidebar'
import './log.css'

interface Ingredient {
  item_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  status?: 'healthy' | 'medium' | 'low' | 'out';
}

interface Recipe {
  id: number;
  name: string;
  ingredients: Ingredient[];
}

interface InventoryItem {
  id: number
  name: string
  category: string
  current_quantity: number
  min_threshold: number
  max_threshold: number
  unit: string
}

interface ManualUsageItem {
  item_id: number
  quantity: number
  available_stock: number
}

export default function LogUsage() {
  const [activeView, setActiveView] = useState<'recipes' | 'manual'>('recipes')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [activeTab, setActiveTab] = useState('log-usage')
  const [manualItems, setManualItems] = useState<ManualUsageItem[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingRecipeLog, setPendingRecipeLog] = useState<{ recipeId: number, quantity: number } | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (activeView === 'recipes') {
      fetchRecipes()
    } else {
      fetchInventoryItems()
    }
  }, [activeView])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const API_BASE_URL = 'https://beantrack-esht.onrender.com';
  
  const formatNumber = (value: number) => (value % 1 === 0 ? Math.floor(value) : value)

  const fetchRecipes = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/recipes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRecipes(data)
        const initialQuantities: { [key: number]: number } = {}
        data.forEach((r: Recipe) => (initialQuantities[r.id] = 0))
        setQuantities(initialQuantities)
      } else {
        setError('Failed to load recipes')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const fetchInventoryItems = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/inventory', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out Equipment category
        const filtered = data.filter((item: InventoryItem) => item.category !== 'Equipment')
        setInventoryItems(filtered)
      } else {
        setError('Failed to load inventory')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const getItemStatus = (
    current: number,
    min: number,
    max: number
  ): 'healthy' | 'medium' | 'low' | 'out' => {
    if (current === 0) return 'out';
    if (current <= min) return 'low';
    if (current <= min + (max - min) * 0.5) return 'medium';
    return 'healthy';
  };

  const getStatusBadge = (status: 'healthy' | 'medium' | 'low' | 'out') => {
    const badges = {
      healthy: { color: '#16a34a', label: 'Healthy', icon: CheckCircle },
      medium: { color: '#e1bc42', label: 'Medium', icon: MinusCircle },
      low: { color: '#eb912c', label: 'Low Stock', icon: AlertCircle },
      out: { color: '#dc2626', label: 'Out of Stock', icon: XCircle }
    }
    
    const badge = badges[status] || badges.healthy
    const Icon = badge.icon
    
    return (
      <span className="log-status-badge" style={{ color: badge.color, backgroundColor: `${badge.color}15` }}>
        <Icon size={14} />
        {badge.label}
      </span>
    )
  }

  const checkRecipeStock = (recipe: Recipe, servings: number) => {
    for (const ing of recipe.ingredients) {
      const requiredQuantity = ing.quantity * servings
      if (ing.current_stock < requiredQuantity) {
        return false
      }
    }
    return true
  }

  const handleQuantityChange = (recipeId: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [recipeId]: Math.max(0, (prev[recipeId] || 0) + delta)
    }))
  }

  const handleQuantityInputChange = (recipeId: number, value: string) => {
    if (value === '') {
      setQuantities(prev => ({ ...prev, [recipeId]: 0 }))
    } else {
      const numValue = parseInt(value)
      if (!isNaN(numValue) && numValue >= 0) {
        setQuantities(prev => ({ ...prev, [recipeId]: numValue }))
      }
    }
  }

  const initiateLogUsage = (recipeId: number) => {
    const quantity = quantities[recipeId]
    if (quantity <= 0) return

    const recipe = recipes.find(r => r.id === recipeId)
    if (!recipe) return

    if (!checkRecipeStock(recipe, quantity)) {
      setError('Insufficient stock for this recipe')
      return
    }

    setPendingRecipeLog({ recipeId, quantity })
    setShowConfirmModal(true)
  }

  const confirmLogUsage = async () => {
    if (!pendingRecipeLog) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/inventory/log-recipe-usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          recipe_id: pendingRecipeLog.recipeId, 
          servings: pendingRecipeLog.quantity 
        })
      })

      if (response.ok) {
        setQuantities(prev => ({ ...prev, [pendingRecipeLog.recipeId]: 0 }))
        fetchRecipes()
        setSuccessMessage('Recipe usage successfully logged!')
        setShowSuccessModal(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to log usage')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setShowConfirmModal(false)
      setPendingRecipeLog(null)
    }
  }

  const addManualItem = () => {
    setManualItems(prev => [...prev, { item_id: 0, quantity: 0, available_stock: 0 }])
  }

  const removeManualItem = (index: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateManualItem = (index: number, field: string, value: any) => {
    setManualItems(prev => {
      const newItems = [...prev]
      if (field === 'item_id') {
        const item = inventoryItems.find(i => i.id === parseInt(value))
        newItems[index] = {
          ...newItems[index],
          item_id: parseInt(value),
          available_stock: item?.current_quantity || 0
        }
      } else {
        newItems[index] = { ...newItems[index], [field]: parseFloat(value) || 0 }
      }
      return newItems
    })
  }

  const handleLogManualUsage = async () => {
    const validItems = manualItems.filter(item => item.item_id > 0 && item.quantity > 0)
    if (validItems.length === 0) return

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('${API_BASE_URL}/api/inventory/log-manual-usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: validItems })
      })

      if (response.ok) {
        setManualItems([])
        fetchInventoryItems()
        setSuccessMessage('Manual usage successfully logged!')
        setShowSuccessModal(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to log usage')
      }
    } catch {
      setError('Unable to connect to server')
    }
  }

  const closeModal = () => setShowSuccessModal(false)
  const closeConfirmModal = () => {
    setShowConfirmModal(false)
    setPendingRecipeLog(null)
  }

  const getAvailableItems = (currentIndex: number) => {
    const selectedIds = manualItems
      .map((item, idx) => idx !== currentIndex ? item.item_id : 0)
      .filter(id => id > 0)
    return inventoryItems.filter(item => !selectedIds.includes(item.id))
  }

  if (loading) return <div className="loading-message">Loading...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="log-usage-content">
        <div className="log-usage-header">
          <div>
            <h1 className="log-usage-title">Log Usage</h1>
            <p className="log-usage-subtitle">
              Track ingredient usage from recipes or manual entries
            </p>
          </div>
        </div>

        <div className="view-tabs">
          <button
            onClick={() => setActiveView('recipes')}
            className={`tab-button ${activeView === 'recipes' ? 'active' : ''}`}
          >
            <Coffee size={20} /> Recipes
          </button>
          <button
            onClick={() => setActiveView('manual')}
            className={`tab-button ${activeView === 'manual' ? 'active' : ''}`}
          >
            <Plus size={20} /> Manual Entry
          </button>
        </div>

        {error && (
          <div className="log-error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Recipes */}
        {activeView === 'recipes' && (
          <>
            <h2 className="section-title">Recipe Usage</h2>
            <div className="recipe-grid">
              {recipes.map(recipe => {
                const hasStock = checkRecipeStock(recipe, quantities[recipe.id] || 1)
                return (
                  <div key={recipe.id} className="recipe-card">
                    <div className="recipe-header">
                      <h3 className="recipe-title">{recipe.name}</h3>
                    </div>

                    <div className="ingredients-section">
                      <p className="ingredients-label">Ingredients per serving:</p>
                      <div className="ingredients-list">
                        {recipe.ingredients.map((ing, idx) => {
                          const item = inventoryItems.find(i => i.name === ing.item_name)
                          const status = ing.status || getItemStatus(ing.current_stock, ing.minimum_stock, ing.maximum_stock)

                          return (
                            <div key={idx} className="ingredient-item">
                              <div className="ingredient-info">
                                <span className="ingredient-name">{ing.item_name}:</span>
                                <span className="ingredient-quantity">
                                  {formatNumber(ing.quantity)}{ing.unit}
                                </span>
                              </div>
                              {getStatusBadge(status)}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="quantity-controls">
                      <button
                        onClick={() => handleQuantityChange(recipe.id, -1)}
                        className="quantity-button"
                        disabled={quantities[recipe.id] <= 0}
                      >
                        <Minus size={20} />
                      </button>
                      <input
                        type="text"
                        value={quantities[recipe.id] === 0 ? '' : quantities[recipe.id]}
                        onChange={e => handleQuantityInputChange(recipe.id, e.target.value)}
                        onBlur={e => {
                          if (e.target.value === '') {
                            setQuantities(prev => ({ ...prev, [recipe.id]: 0 }))
                          }
                        }}
                        placeholder="0"
                        className="quantity-input"
                      />
                      <button
                        onClick={() => handleQuantityChange(recipe.id, 1)}
                        className="quantity-button"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <button
                      onClick={() => initiateLogUsage(recipe.id)}
                      className={`log-button ${!hasStock || quantities[recipe.id] <= 0 ? 'log-button-disabled' : ''}`}
                      disabled={quantities[recipe.id] <= 0 || !hasStock}
                    >
                      {!hasStock && quantities[recipe.id] > 0 ? 'Insufficient Stock' : 'Log Usage'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Manual Entry */}
        {activeView === 'manual' && (
          <>
            <div className="manual-header">
              <h2 className="section-title">Manual Usage Entry</h2>
            </div>

            {manualItems.length === 0 ? (
              <div className="empty-state">
                <Plus size={48} className="empty-icon" />
                <p className="empty-title">No items added</p>
                <p className="empty-subtitle">Add items to log manual usage</p>
                <button onClick={addManualItem} className="empty-button">
                  <Plus size={20} /> Add First Item
                </button>
              </div>
            ) : (
              <div className="manual-entry-container">
                <div className="usage-items-card">
                  <h3 className="usage-items-title">Usage Items</h3>
                  <p className="usage-items-subtitle">
                    Select items and quantities to deduct from inventory
                  </p>

                  <div className="table-container">
                    <table className="usage-table">
                      <thead>
                        <tr>
                          <th style={{ width: '35%' }}>Item</th>
                          <th style={{ width: '25%' }}>Available Stock</th>
                          <th style={{ width: '25%' }}>Quantity to Use</th>
                          <th style={{ width: '15%' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {manualItems.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.item_id}
                                onChange={e => updateManualItem(index, 'item_id', e.target.value)}
                                className="table-select"
                              >
                                <option value="0">Select item...</option>
                                {getAvailableItems(index).map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="stock-value-container">
                                <span className="stock-value">{formatNumber(item.available_stock)}</span>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={e => updateManualItem(index, 'quantity', e.target.value)}
                                className="table-input"
                                min="0"
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <button
                                onClick={() => removeManualItem(index)}
                                className="remove-button"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="action-buttons">
                    <button
                      onClick={handleLogManualUsage}
                      className="log-all-button"
                      disabled={manualItems.filter(i => i.item_id > 0 && i.quantity > 0).length === 0}
                    >
                      <Save size={20} /> Log All Usage
                    </button>
                    <button onClick={addManualItem} className="add-another-button">
                      <Plus size={20} /> Add Another Item
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirm Modal */}
        {showConfirmModal && pendingRecipeLog && (
          <div className="log-modal-overlay" onClick={closeConfirmModal}>
            <div className="log-modal-content" onClick={e => e.stopPropagation()}>
              <AlertCircle size={64} color="#775932" className="log-modal-icon" />
              <h2 className="log-modal-title">Confirm Usage</h2>
              <p className="log-modal-message">
                Are you sure you want to log {pendingRecipeLog.quantity} serving(s) of{' '}
                {recipes.find(r => r.id === pendingRecipeLog.recipeId)?.name}?
              </p>
              <div className="log-modal-buttons">
                <button className="log-modal-button-cancel" onClick={closeConfirmModal}>
                  Cancel
                </button>
                <button className="log-modal-button-confirm" onClick={confirmLogUsage}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="log-modal-overlay" onClick={closeModal}>
            <div className="log-modal-content" onClick={e => e.stopPropagation()}>
              <CheckCircle size={64} color="#16a34a" className="log-modal-icon" />
              <h2 className="log-modal-title">Success!</h2>
              <p className="log-modal-message">{successMessage}</p>
              <button className="log-modal-button" onClick={closeModal}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
