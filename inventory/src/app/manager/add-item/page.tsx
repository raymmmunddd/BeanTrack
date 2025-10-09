// additem.tsx

'use client'

import { useState, useEffect } from 'react'
import { Package, UtensilsCrossed, Plus, X, Trash2 } from 'lucide-react'
import { Sidebar } from '../sidebar'
import './add-items-recipes.css'

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
  item_name: string
  unit: string
}

interface RecipeIngredient {
  item_id: number
  quantity_required: number
  item_name?: string
  unit?: string
}

export default function AddItemsRecipes() {
  const [activeTab, setActiveTab] = useState('add-item')
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

      if (response.ok) {
        alert('Item added successfully!')
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
        const data = await response.json()
        alert(data.error || 'Failed to add item')
      }
    } catch (err) {
      alert('Unable to add item')
    }
  }

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (recipeForm.ingredients.length === 0) {
      alert('Please add at least one ingredient')
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

      if (response.ok) {
        alert('Recipe added successfully!')
        setRecipeForm({
          recipe_name: '',
          ingredients: []
        })
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to add recipe')
      }
    } catch (err) {
      alert('Unable to add recipe')
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
        newIngredients[index].item_name = item.item_name
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
                  value={itemForm.current_stock}
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
                    value={itemForm.minimum_stock}
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
                    value={itemForm.maximum_stock}
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

            <form onSubmit={handleAddRecipe} className="add-form">
              <div className="form-group">
                <label className="form-label">Recipe Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Cappuccino"
                  value={recipeForm.recipe_name}
                  onChange={(e) => setRecipeForm({...recipeForm, recipe_name: e.target.value})}
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
                            {item.item_name} ({item.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="ingredient-quantity">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={ingredient.quantity_required}
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
    </div>
  )
}