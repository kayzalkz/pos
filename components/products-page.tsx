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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
  image_url?: string | null
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
    min_stock_level: "10",
    max_stock_level: "0",
    unit: "pcs",
    barcode: "",
    is_active: true,
    image_url: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchProducts(), fetchCategories(), fetchBrands(), fetchAttributes()])
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *, 
        categories(name), 
        brands(name), 
        product_attributes(value, attributes(name, type))
      `)
      .order("name")
    
    if (error) {
        console.error("Error fetching products:", error)
        setProducts([])
    } else {
        setProducts(data || [])
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name")
    if (error) console.error("Error fetching categories:", error)
    else setCategories(data || [])
  }

  const fetchBrands = async () => {
    const { data, error } = await supabase.from("brands").select("id, name").eq("is_active", true).order("name")
    if (error) console.error("Error fetching brands:", error)
    else setBrands(data || [])
  }

  const fetchAttributes = async () => {
    const { data, error } = await supabase
        .from("attributes")
        .select("id, name, type, values")
        .eq("is_active", true)
        .order("name")

    if (error) {
        console.error("Error fetching attributes:", error)
        setAttributes([])
    } else {
        const processedData = (data || []).map((attr) => ({
            ...attr,
            values: Array.isArray(attr.values) ? attr.values : [],
        }))
        setAttributes(processedData)
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
      if (imageFile) {
        const filePath = `public/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('products').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
        newImageUrl = urlData.publicUrl;
      }

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
        min_stock_level: Number.parseInt(formData.min_stock_level) || 10,
        max_stock_level: Number.parseInt(formData.max_stock_level) || 0,
        unit: formData.unit,
        barcode: formData.barcode.trim() || null,
        is_active: formData.is_active,
        image_url: newImageUrl,
        updated_at: new Date().toISOString(),
      }

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

      const attributeInserts = Object.entries(selectedAttributes)
        .filter(([_, value]) => value && value.trim() !== "")
        .map(([attributeId, value]) => ({
          product_id: productId,
          attribute_id: attributeId,
          value: value.trim(),
        }))

      if (attributeInserts.length > 0) {
        await supabase.from("product_attributes").insert(attributeInserts)
      }

      setIsDialogOpen(false)
      await fetchProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error saving product. Please check the console and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
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
      min_stock_level: (product.min_stock_level || 10).toString(),
      max_stock_level: (product.max_stock_level || 0).toString(),
      unit: product.unit || "pcs",
      barcode: product.barcode || "",
      is_active: product.is_active ?? true,
      image_url: product.image_url || ""
    })

    setImagePreview(product.image_url || null);

    const existingAttributes: Record<string, string> = {}
    if (product.product_attributes) {
      product.product_attributes.forEach((pa) => {
        const attr = attributes.find((a) => a.name === pa.attributes.name)
        if (attr) { existingAttributes[attr.id] = pa.value }
      })
    }
    setSelectedAttributes(existingAttributes)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await supabase.from("product_attributes").delete().eq("product_id", id)
        await supabase.from("sale_items").delete().eq("product_id", id) // This might fail if restricted
        const { error } = await supabase.from("products").delete().eq("id", id)
        if (error) throw error
        await fetchProducts()
      } catch (error) {
        console.error("Error deleting product:", error)
        alert("Could not delete product. It may be linked to existing sales records.")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "", sku: "", description: "", category_id: "", brand_id: "",
      price: "", cost: "", stock_quantity: "",
      min_stock_level: "10",
      max_stock_level: "0",
      unit: "pcs",
      barcode: "",
      is_active: true,
      image_url: ""
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
    setSelectedAttributes((prev) => ({ ...prev, [attributeId]: value }))
  }

  const formatPrice = (price: number | null | undefined): string => (price || 0).toFixed(2)
  const formatNumber = (num: number | null | undefined): number => num || 0
  
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
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-semibold text-gray-800">Products Management</h1>
        <Button onClick={handleAddProduct} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <img src={product.image_url || 'https://placehold.co/100'} alt={product.name} className="w-20 h-20 rounded-md object-cover border"/>
                    <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    </div>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm flex-grow">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">{formatPrice(product.selling_price)} MMK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock:</span>
                  <span
                    className={`font-medium ${formatNumber(product.stock_quantity) <= formatNumber(product.min_stock_level) ? "text-red-600" : "text-green-600"}`}
                  >
                    {formatNumber(product.stock_quantity)} {product.unit}
                  </span>
                </div>
                {product.categories && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="text-gray-800">{product.categories.name}</span>
                  </div>
                )}
                {product.brands && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="text-gray-800">{product.brands.name}</span>
                  </div>
                )}
              </CardContent>
              <div className="p-4 pt-0 mt-auto flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(product)} className="flex-1">
                    <Edit className="w-3 h-3 mr-2" />
                    Edit
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No products found matching your search."
                  : "No products exist. Add your first product to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <Label className="mb-2 block">Product Image</Label>
                  <div 
                    className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-emerald-500 relative"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*"/>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                setImageFile(null);
                                setImagePreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        ><X className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="mx-auto h-10 w-10" />
                        <p className="mt-2 text-sm">Click to upload</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                        <Label htmlFor="sku">SKU *</Label>
                        <Input id="sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                    </div>
                    <div>
                        <Label htmlFor="category">Category</Label>
                        <select id="category" value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full p-2 border rounded-md bg-white">
                            <option value="">Select Category</option>
                            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="brand">Brand</Label>
                        <select id="brand" value={formData.brand_id} onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })} className="w-full p-2 border rounded-md bg-white">
                            <option value="">Select Brand</option>
                            {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="price">Selling Price *</Label>
                        <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                    </div>
                    <div>
                        <Label htmlFor="cost">Cost Price</Label>
                        <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="stock">Stock Quantity</Label>
                        <Input id="stock" type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="unit">Unit</Label>
                        <select id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full p-2 border rounded-md bg-white">
                            <option value="pcs">Pieces</option>
                            <option value="kg">Kilograms</option>
                            <option value="box">Box</option>
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="min_stock">Min Stock Level</Label>
                        <Input id="min_stock" type="number" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="max_stock">Max Stock Level</Label>
                        <Input id="max_stock" type="number" value={formData.max_stock_level} onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input id="barcode" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                    </div>
                    <div className="flex items-center space-x-2 md:col-span-2">
                        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                        <Label htmlFor="is_active">Product is Active</Label>
                    </div>
                </div>
              </div>

              {attributes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Product Attributes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attributes.map((attribute) => (
                      <div key={attribute.id}>
                        <Label>{attribute.name}</Label>
                        {attribute.type === "select" && Array.isArray(attribute.values) && attribute.values.length > 0 ? (
                          <select value={selectedAttributes[attribute.id] || ""} onChange={(e) => handleAttributeChange(attribute.id, e.target.value)} className="w-full p-2 border rounded-md bg-white">
                            <option value="">Select {attribute.name}</option>
                            {attribute.values.map((value) => (<option key={value} value={value}>{value}</option>))}
                          </select>
                        ) : (
                          <Input type={attribute.type === "number" ? "number" : "text"} value={selectedAttributes[attribute.id] || ""} onChange={(e) => handleAttributeChange(attribute.id, e.target.value)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <>{editingProduct ? "Update" : "Create"} Product</>}
                </Button>
              </div>
            </form>
          </DialogContent>
      </Dialog>
    </div>
  )
}
