"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertTriangle } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  category_id: string | null
  brand_id: string | null
  price: number
  selling_price: number
  cost: number
  cost_price: number | null
  stock_quantity: number
  min_stock_level: number
  max_stock_level: number
  unit: string
  barcode: string | null
  is_active: boolean
  created_at: string
  categories?: { name: string } | null
  brands?: { name: string } | null
  product_attributes?: Array<{
    attributes: { name: string; type: string }
    value: string
  }> | null
}

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

interface Attribute {
  id: string
  name: string
  type: string
  values: string[] | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    brand_id: "",
    price: "",
    cost: "",
    stock_quantity: "",
    min_stock_level: "",
    max_stock_level: "",
    unit: "pcs",
    barcode: "",
    is_active: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchProducts(), fetchCategories(), fetchBrands(), fetchAttributes()])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, sku, description, category_id, brand_id, price, selling_price, cost, cost_price,
          stock_quantity, min_stock_level, max_stock_level, unit, barcode,
          is_active, created_at,
          categories(name),
          brands(name),
          product_attributes(
            value,
            attributes(name, type)
          )
        `)
        .order("name")

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    }
  }

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase.from("brands").select("id, name").eq("is_active", true).order("name")

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error("Error fetching brands:", error)
      setBrands([])
    }
  }

  const fetchAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from("attributes")
        .select("id, name, type, values")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      const processedData = (data || []).map((attr) => ({
        ...attr,
        values: Array.isArray(attr.values) ? attr.values : [],
      }))
      setAttributes(processedData)
    } catch (error) {
      console.error("Error fetching attributes:", error)
      setAttributes([])
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const priceValue = Number.parseFloat(formData.price) || 0
      const costValue = Number.parseFloat(formData.cost) || 0

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        price: priceValue,
        selling_price: priceValue, // Set selling_price to the same value as price
        cost: costValue,
        cost_price: costValue, // Set cost_price to the same value as cost
        stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
        min_stock_level: Number.parseInt(formData.min_stock_level) || 0,
        max_stock_level: Number.parseInt(formData.max_stock_level) || 0,
        unit: formData.unit,
        barcode: formData.barcode.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      let productId: string

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id)

        if (error) throw error
        productId = editingProduct.id

        // Delete existing attributes
        await supabase.from("product_attributes").delete().eq("product_id", productId)
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            ...productData,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        if (error) throw error
        productId = data.id
      }

      // Insert selected attributes
      const attributeInserts = Object.entries(selectedAttributes)
        .filter(([_, value]) => value && value.trim() !== "")
        .map(([attributeId, value]) => ({
          product_id: productId,
          attribute_id: attributeId,
          value: value.trim(),
        }))

      if (attributeInserts.length > 0) {
        const { error } = await supabase.from("product_attributes").insert(attributeInserts)

        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingProduct(null)
      resetForm()
      await fetchProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      category_id: product.category_id || "",
      brand_id: product.brand_id || "",
      price: (product.price || product.selling_price || 0).toString(),
      cost: (product.cost || product.cost_price || 0).toString(),
      stock_quantity: (product.stock_quantity || 0).toString(),
      min_stock_level: (product.min_stock_level || 0).toString(),
      max_stock_level: (product.max_stock_level || 0).toString(),
      unit: product.unit || "pcs",
      barcode: product.barcode || "",
      is_active: product.is_active ?? true,
    })

    // Load existing attributes
    const existingAttributes: Record<string, string> = {}
    if (product.product_attributes) {
      product.product_attributes.forEach((pa) => {
        const attr = attributes.find((a) => a.name === pa.attributes.name)
        if (attr) {
          existingAttributes[attr.id] = pa.value
        }
      })
    }
    setSelectedAttributes(existingAttributes)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (
      confirm("Are you sure you want to delete this product? This will also remove it from any existing sales records.")
    ) {
      try {
        // First, delete related records that might prevent deletion
        await supabase.from("product_attributes").delete().eq("product_id", id)
        await supabase.from("sale_items").delete().eq("product_id", id)

        // Then delete the product
        const { error } = await supabase.from("products").delete().eq("id", id)

        if (error) throw error
        await fetchProducts()
      } catch (error) {
        console.error("Error deleting product:", error)
        alert("Error deleting product. This product may be referenced in sales records.")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      category_id: "",
      brand_id: "",
      price: "",
      cost: "",
      stock_quantity: "",
      min_stock_level: "",
      max_stock_level: "",
      unit: "pcs",
      barcode: "",
      is_active: true,
    })
    setSelectedAttributes({})
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingProduct(null)
      resetForm()
    }
  }

  const handleAddProduct = () => {
    resetForm()
    setEditingProduct(null)
    setIsDialogOpen(true)
  }

  const handleAttributeChange = (attributeId: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeId]: value,
    }))
  }

  // Helper function to safely format numbers
  const formatPrice = (price: number | null | undefined): string => {
    return (price || 0).toFixed(2)
  }

  const formatNumber = (num: number | null | undefined): number => {
    return num || 0
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Products Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={handleAddProduct} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU *</label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Brand</label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Price *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cost</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Stock Quantity</label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="lbs">Pounds</option>
                    <option value="liters">Liters</option>
                    <option value="meters">Meters</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Min Stock Level</label>
                  <Input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Stock Level</label>
                  <Input
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Barcode</label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Enter barcode"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              {/* Dynamic Attributes */}
              {attributes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Product Attributes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attributes.map((attribute) => (
                      <div key={attribute.id}>
                        <label className="text-sm font-medium">{attribute.name}</label>
                        {attribute.type === "select" &&
                        Array.isArray(attribute.values) &&
                        attribute.values.length > 0 ? (
                          <select
                            value={selectedAttributes[attribute.id] || ""}
                            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select {attribute.name}</option>
                            {attribute.values.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={attribute.type === "number" ? "number" : "text"}
                            value={selectedAttributes[attribute.id] || ""}
                            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                            placeholder={`Enter ${attribute.name.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingProduct ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editingProduct ? "Update" : "Create"} Product</>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {formatNumber(product.stock_quantity) <= formatNumber(product.min_stock_level) && (
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    )}
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600">SKU: {product.sku}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-medium">${formatPrice(product.price || product.selling_price)}</span>
                  </div>
                  {(product.cost > 0 || product.cost_price) && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cost:</span>
                      <span className="text-sm">${formatPrice(product.cost || product.cost_price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span
                      className={`font-medium ${
                        formatNumber(product.stock_quantity) <= formatNumber(product.min_stock_level)
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatNumber(product.stock_quantity)} {product.unit}
                    </span>
                  </div>
                  {product.categories && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm">{product.categories.name}</span>
                    </div>
                  )}
                  {product.brands && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Brand:</span>
                      <span className="text-sm">{product.brands.name}</span>
                    </div>
                  )}
                  {product.barcode && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Barcode:</span>
                      <span className="text-sm font-mono">{product.barcode}</span>
                    </div>
                  )}

                  {/* Display Attributes */}
                  {product.product_attributes && product.product_attributes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">Attributes:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.product_attributes.map((pa, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {pa.attributes.name}: {pa.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.description && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">{product.description}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(product)} className="flex-1">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No products found matching your search."
                  : "No products found. Add your first product to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
