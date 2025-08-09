"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertTriangle, UploadCloud, X } from "lucide-react"

// Interfaces updated to include image_url
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
  image_url?: string | null // For the product image
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
  // Existing state
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
  
  // State for image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    image_url: "",
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
          stock_quantity, min_stock_level, max_stock_level, unit, barcode, image_url,
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
    
    let newImageUrl = editingProduct?.image_url || null;

    try {
      // 1. Handle image upload if a new file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products') // The bucket name you created
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        newImageUrl = urlData.publicUrl;
      }

      // 2. Prepare product data with the new or existing image URL
      const priceValue = Number.parseFloat(formData.price) || 0
      const costValue = Number.parseFloat(formData.cost) || 0

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        price: priceValue,
        selling_price: priceValue,
        cost: costValue,
        cost_price: costValue,
        stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
        min_stock_level: Number.parseInt(formData.min_stock_level) || 0,
        max_stock_level: Number.parseInt(formData.max_stock_level) || 0,
        unit: formData.unit,
        barcode: formData.barcode.trim() || null,
        is_active: formData.is_active,
        image_url: newImageUrl, // Use the determined image URL
        updated_at: new Date().toISOString(),
      }

      // 3. Upsert product data
      let productId: string;
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id)
        if (error) throw error
        productId = editingProduct.id
        await supabase.from("product_attributes").delete().eq("product_id", productId)
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...productData, created_at: new Date().toISOString() })
          .select("id")
          .single()
        if (error) throw error
        productId = data.id
      }

      // 4. Handle attributes
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

      // 5. Reset and refetch
      setIsDialogOpen(false)
      await fetchProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product. Please check the console and try again.")
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
      image_url: product.image_url || ""
    })

    setImagePreview(product.image_url || null); // Set existing image for preview

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
        await supabase.from("product_attributes").delete().eq("product_id", id)
        await supabase.from("sale_items").delete().eq("product_id", id)
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
      name: "", sku: "", description: "", category_id: "", brand_id: "",
      price: "", cost: "", stock_quantity: "", min_stock_level: "",
      max_stock_level: "", unit: "pcs", barcode: "", is_active: true, image_url: ""
    })
    setSelectedAttributes({})
    setImageFile(null);
    setImagePreview(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAttributeChange = (attributeId: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeId]: value,
    }))
  }

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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="text-sm font-medium mb-2 block">Product Image</label>
                  <div 
                    className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-emerald-500 relative"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                    />
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Product preview" className="w-full h-full object-cover rounded-lg" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                setImageFile(null);
                                setImagePreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="mx-auto h-10 w-10" />
                        <p className="mt-2 text-sm">Click to upload</p>
                        <p className="text-xs">PNG, JPG, WEBP</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium">Product Name *</label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-sm font-medium">SKU *</label>
                        <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Category</label>
                        <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full p-2 border rounded-md">
                            <option value="">Select Category</option>
                            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Brand</label>
                        <select value={formData.brand_id} onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })} className="w-full p-2 border rounded-md">
                            <option value="">Select Brand</option>
                            {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium">Price *</label>
                        <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Cost</label>
                        <Input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Stock Quantity</label>
                        <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Unit</label>
                        <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full p-2 border rounded-md">
                            <option value="pcs">Pieces</option> <option value="kg">Kilograms</option> <option value="box">Box</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                    </div>
                </div>
              </div>

              {attributes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Product Attributes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attributes.map((attribute) => (
                      <div key={attribute.id}>
                        <label className="text-sm font-medium">{attribute.name}</label>
                        {attribute.type === "select" && Array.isArray(attribute.values) && attribute.values.length > 0 ? (
                          <select
                            value={selectedAttributes[attribute.id] || ""}
                            onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select {attribute.name}</option>
                            {attribute.values.map((value) => (
                              <option key={value} value={value}>{value}</option>
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

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>{editingProduct ? "Update" : "Create"} Product</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
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
