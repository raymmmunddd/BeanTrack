// add-item.tsx

'use client'

import { useState, useEffect } from 'react'
import { Package, UtensilsCrossed, Plus, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Sidebar } from '../sidebar'
import './add.css'

interface Category {
  id: number
  name: string
}

interface Unit {
  id: number
  name: string
}

interface InventoryItem {
  id: number
  name: string
  item_name: string
  unit: string
}

interface RecipeIngredient {
  item_id: number
  quantity_required: number
  item_name?: string
  unit?: string
}

interface ErrorState {
  show: boolean
  message: string
  type: 'duplicate' | 'validation' | 'stock' | 'server' | ''
}

interface SuccessModalState {
  show: boolean
  title: string
  message: string
}

export default function AddItemsRecipes() {
  const [activeTab, setActiveTab] = useState('add-item')
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Error states
  const [itemError, setItemError] = useState<ErrorState>({ show: false, message: '', type: '' })
  const [recipeError, setRecipeError] = useState<ErrorState>({ show: false, message: '', type: '' })

  // Success modal state
  const [successModal, setSuccessModal] = useState<SuccessModalState>({ 
    show: false, 
    title: '', 
    message: '' 
  })

  // Item form state
  const [itemForm, setItemForm] = useState({
    item_name: '',
    category_id: '',
    unit_id: '',
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    description: ''
  })

  // Recipe form state
  const [recipeForm, setRecipeForm] = useState({
    recipe_name: '',
    ingredients: [] as RecipeIngredient[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('cafestock_token')
      
      const [categoriesRes, unitsRes, itemsRes] = await Promise.all([
        fetch('http://localhost:3001/api/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/units', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (categoriesRes.ok && unitsRes.ok && itemsRes.ok) {
        const categoriesData = await categoriesRes.json()
        const unitsData = await unitsRes.json()
        const itemsData = await itemsRes.json()
        
        setCategories(categoriesData)
        setUnits(unitsData)
        setInventoryItems(itemsData)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const validateItemName = (name: string): boolean => {
    // Only allow letters, spaces, and basic punctuation
    const validPattern = /^[a-zA-Z\s\-']+$/
    return validPattern.test(name)
  }

  const validateRecipeName = (name: string): boolean => {
    // Only allow letters and spaces for recipe names
    const validPattern = /^[a-zA-Z\s]+$/
    return validPattern.test(name)
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setItemError({ show: false, message: '', type: '' })

    // Validate item name
    if (!validateItemName(itemForm.item_name)) {
      setItemError({
        show: true,
        message: 'Item name can only contain letters, spaces, hyphens, and apostrophes',
        type: 'validation'
      })
      return
    }

    // Validate stock thresholds
    if (itemForm.minimum_stock > itemForm.maximum_stock) {
      setItemError({
        show: true,
        message: 'Minimum stock cannot exceed maximum stock',
        type: 'stock'
      })
      return
    }

    if (itemForm.current_stock < 0 || itemForm.minimum_stock < 0 || itemForm.maximum_stock < 0) {
      setItemError({
        show: true,
        message: 'Stock values cannot be negative',
        type: 'validation'
      })
      return
    }
    
    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemForm)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessModal({
          show: true,
          title: 'Item Added Successfully!',
          message: `"${itemForm.item_name}" has been added to your inventory.`
        })
        
        setItemForm({
          item_name: '',
          category_id: '',
          unit_id: '',
          current_stock: 0,
          minimum_stock: 0,
          maximum_stock: 0,
          description: ''
        })
        fetchData()
      } else {
        // Handle specific error types
        if (data.error.includes('already exists') || data.error.includes('duplicate')) {
          setItemError({
            show: true,
            message: `An item named "${itemForm.item_name}" already exists in your inventory`,
            type: 'duplicate'
          })
        } else if (data.error.includes('Minimum stock') || data.error.includes('Maximum stock')) {
          setItemError({
            show: true,
            message: data.error,
            type: 'stock'
          })
        } else {
          setItemError({
            show: true,
            message: data.error || 'Failed to add item',
            type: 'server'
          })
        }
      }
    } catch (err) {
      setItemError({
        show: true,
        message: 'Unable to connect to server. Please try again.',
        type: 'server'
      })
    }
  }

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecipeError({ show: false, message: '', type: '' })

    // Validate recipe name
    if (!validateRecipeName(recipeForm.recipe_name)) {
      setRecipeError({
        show: true,
        message: 'Recipe name can only contain letters and spaces',
        type: 'validation'
      })
      return
    }
    
    if (recipeForm.ingredients.length === 0) {
      setRecipeError({
        show: true,
        message: 'Please add at least one ingredient to the recipe',
        type: 'validation'
      })
      return
    }

    // Validate all ingredients have positive quantities
    const invalidIngredient = recipeForm.ingredients.find(ing => 
      !ing.item_id || ing.quantity_required <= 0
    )

    if (invalidIngredient) {
      setRecipeError({
        show: true,
        message: 'All ingredients must have a valid item and positive quantity',
        type: 'validation'
      })
      return
    }

    try {
      const token = localStorage.getItem('cafestock_token')
      const response = await fetch('http://localhost:3001/api/recipes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipeForm)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessModal({
          show: true,
          title: 'Recipe Added Successfully!',
          message: `"${recipeForm.recipe_name}" has been created with ${recipeForm.ingredients.length} ingredient(s).`
        })
        
        setRecipeForm({
          recipe_name: '',
          ingredients: []
        })
      } else {
        // Handle specific error types
        if (data.error.includes('already exists') || data.error.includes('duplicate')) {
          setRecipeError({
            show: true,
            message: `A recipe named "${recipeForm.recipe_name}" already exists`,
            type: 'duplicate'
          })
        } else {
          setRecipeError({
            show: true,
            message: data.error || 'Failed to add recipe',
            type: 'server'
          })
        }
      }
    } catch (err) {
      setRecipeError({
        show: true,
        message: 'Unable to connect to server. Please try again.',
        type: 'server'
      })
    }
  }

  const addIngredient = () => {
    setRecipeForm({
      ...recipeForm,
      ingredients: [...recipeForm.ingredients, { item_id: 0, quantity_required: 0 }]
    })
  }

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngredients = [...recipeForm.ingredients]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    
    if (field === 'item_id') {
      const item = inventoryItems.find(i => i.id === Number(value))
      if (item) {
        newIngredients[index].item_name = item.item_name || item.name
        newIngredients[index].unit = item.unit
      }
    }
    
    setRecipeForm({ ...recipeForm, ingredients: newIngredients })
  }

  const removeIngredient = (index: number) => {
    setRecipeForm({
      ...recipeForm,
      ingredients: recipeForm.ingredients.filter((_, i) => i !== index)
    })
  }

  const ErrorAlert = ({ error, onClose }: { error: ErrorState, onClose: () => void }) => {
    if (!error.show) return null

    const getErrorIcon = () => {
      switch (error.type) {
        case 'duplicate':
          return <AlertCircle size={20} />
        case 'validation':
          return <AlertCircle size={20} />
        case 'stock':
          return <AlertCircle size={20} />
        default:
          return <AlertCircle size={20} />
      }
    }

    const getErrorColor = () => {
      switch (error.type) {
        case 'duplicate':
          return '#f59e0b' // amber
        case 'validation':
          return '#ef4444' // red
        case 'stock':
          return '#f59e0b' // amber
        default:
          return '#dc2626' // dark red
      }
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: '#fef2f2',
        border: `1px solid ${getErrorColor()}`,
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ color: getErrorColor(), flexShrink: 0, marginTop: '2px' }}>
          {getErrorIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            color: '#7f1d1d',
            fontWeight: 500 
          }}>
            {error.message}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: getErrorColor(),
            cursor: 'pointer',
            padding: '0',
            flexShrink: 0
          }}
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  const SuccessModal = ({ modal, onClose }: { modal: SuccessModalState, onClose: () => void }) => {
    if (!modal.show) return null

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          padding: '2rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle size={32} color="#16a34a" />
            </div>
            
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#170d03',
                marginBottom: '0.5rem'
              }}>
                {modal.title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                margin: 0
              }}>
                {modal.message}
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem 2rem',
                backgroundColor: '#775932',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                width: '100%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5d4426'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#775932'}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading-message">Loading...</div>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="add-content">
        <div className="add-header">
          <h1 className="add-title">Add New Items & Recipes</h1>
          <p className="add-subtitle">Create new inventory items or recipes for your cafe</p>
        </div>

        <div className="add-grid">
          {/* Add Item Section */}
          <div className="add-section">
            <div className="section-header">
              <div className="section-icon-wrapper">
                <Package size={24} />
              </div>
              <div>
                <h2 className="section-title">Add New Item</h2>
                <p className="section-subtitle">Add a new item to your cafe inventory</p>
              </div>
            </div>

            <ErrorAlert 
              error={itemError} 
              onClose={() => setItemError({ show: false, message: '', type: '' })} 
            />

            <form onSubmit={handleAddItem} className="add-form">
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Espresso Beans"
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({...itemForm, item_name: e.target.value})}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({...itemForm, category_id: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select
                    value={itemForm.unit_id}
                    onChange={(e) => setItemForm({...itemForm, unit_id: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">Select unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Stock *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={itemForm.current_stock === 0 ? '' : itemForm.current_stock}
                  onChange={(e) => setItemForm({...itemForm, current_stock: Number(e.target.value)})}
                  className="form-input"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Minimum Stock *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={itemForm.minimum_stock === 0 ? '' : itemForm.minimum_stock}
                    onChange={(e) => setItemForm({...itemForm, minimum_stock: Number(e.target.value)})}
                    className="form-input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Maximum Stock *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={itemForm.maximum_stock === 0 ? '' : itemForm.maximum_stock}
                    onChange={(e) => setItemForm({...itemForm, maximum_stock: Number(e.target.value)})}
                    className="form-input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="Optional description of the item..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <button type="submit" className="submit-button">
                <Package size={18} />
                Add Item
              </button>
            </form>
          </div>

          {/* Add Recipe Section */}
          <div className="add-section">
            <div className="section-header">
              <div className="section-icon-wrapper">
                <UtensilsCrossed size={24} />
              </div>
              <div>
                <h2 className="section-title">Add New Recipe</h2>
                <p className="section-subtitle">Create a recipe with required ingredients</p>
              </div>
            </div>

            <ErrorAlert 
              error={recipeError} 
              onClose={() => setRecipeError({ show: false, message: '', type: '' })} 
            />

            <form onSubmit={handleAddRecipe} className="add-form">
              <div className="form-group">
                <label className="form-label">Recipe Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Cappuccino"
                    value={recipeForm.recipe_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only letters and spaces
                      if (/^[A-Za-z\s]*$/.test(value)) {
                        setRecipeForm({ ...recipeForm, recipe_name: value });
                      }
                    }}
                    className="form-input"
                    required
                  />
              </div>

              <div className="ingredients-section">
                <div className="ingredients-header">
                  <label className="form-label">Ingredients *</label>
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="add-ingredient-button"
                  >
                    <Plus size={16} />
                    Add Ingredient
                  </button>
                </div>

                {recipeForm.ingredients.length === 0 && (
                  <div className="empty-ingredients">
                    <p>No ingredients added yet. Click "Add Ingredient" to start.</p>
                  </div>
                )}

                {recipeForm.ingredients.map((ingredient, index) => (
                  <div key={index} className="ingredient-row">
                    <div className="ingredient-select">
                      <select
                        value={ingredient.item_id}
                        onChange={(e) => updateIngredient(index, 'item_id', e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Select item</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name || item.item_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ingredient-quantity">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={ingredient.quantity_required === 0 ? '' : ingredient.quantity_required}
                        onChange={(e) => updateIngredient(index, 'quantity_required', Number(e.target.value))}
                        className="form-input"
                        min="0"
                        step="0.01"
                        required
                      />
                      {ingredient.unit && (
                        <span className="quantity-unit">{ingredient.unit}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="remove-ingredient-button"
                      title="Remove ingredient"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="submit" className="submit-button">
                <UtensilsCrossed size={18} />
                Add Recipe
              </button>
            </form>
          </div>
        </div>
      </div>

      <SuccessModal 
        modal={successModal} 
        onClose={() => setSuccessModal({ show: false, title: '', message: '' })} 
      />
    </div>
  )
}