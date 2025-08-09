"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Search, Warehouse, AlertTriangle } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  stock_quantity: number
  min_stock_level: number
  categories?: { name: string }
  brands?: { name: string }
}

interface InventoryAdjustment {
  id: string
  product_id: string
  adjustment_type: string
  quantity: number
  reason: string
  notes: string
  created_at: string
  products: { name: string; sku: string }
  users: { username: string }
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    adjustment_type: "increase",
    quantity: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    fetchProducts()
    fetchAdjustments()
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        categories(name),
        brands(name)
      `)
      .order("name")

    if (data) setProducts(data)
  }

  const fetchAdjustments = async () => {
    const { data } = await supabase
      .from("inventory_adjustments")
      .select(`
      *,
      products!inner(name, sku),
      users!inner(username)
    `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (data) {
      console.log("Adjustments data:", data) // Debug log
      setAdjustments(data)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return

    const adjustmentData = {
      product_id: selectedProduct.id,
      adjustment_type: formData.adjustment_type,
      quantity: Number.parseInt(formData.quantity),
      reason: formData.reason,
      notes: formData.notes,
      created_by: user?.id,
    }

    // Insert adjustment record
    await supabase.from("inventory_adjustments").insert(adjustmentData)

    // Update product stock
    const newQuantity =
      formData.adjustment_type === "increase"
        ? selectedProduct.stock_quantity + Number.parseInt(formData.quantity)
        : selectedProduct.stock_quantity - Number.parseInt(formData.quantity)

    await supabase
      .from("products")
      .update({ stock_quantity: Math.max(0, newQuantity) })
      .eq("id", selectedProduct.id)

    setIsDialogOpen(false)
    setSelectedProduct(null)
    resetForm()
    fetchProducts()
    fetchAdjustments()
  }

  const resetForm = () => {
    setFormData({
      adjustment_type: "increase",
      quantity: "",
      reason: "",
      notes: "",
    })
  }

  const openAdjustmentDialog = (product: Product) => {
    setSelectedProduct(product)
    resetForm()
    setIsDialogOpen(true)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center">
          <Warehouse className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Inventory Management</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant={product.stock_quantity <= product.min_stock_level ? "destructive" : "secondary"}
                        >
                          Stock: {product.stock_quantity}
                        </Badge>
                        {product.stock_quantity <= product.min_stock_level && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openAdjustmentDialog(product)}>
                      Adjust
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{adjustment.products.name}</h4>
                      <Badge variant={adjustment.adjustment_type === "increase" ? "default" : "destructive"}>
                        {adjustment.adjustment_type === "increase" ? "+" : "-"}
                        {adjustment.quantity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Reason: {adjustment.reason}</p>
                    <p className="text-xs text-gray-500">
                      By {adjustment.users.username} on {new Date(adjustment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjustment Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Inventory - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">
                  Current Stock: <strong>{selectedProduct?.stock_quantity}</strong>
                </p>
                <p className="text-sm">SKU: {selectedProduct?.sku}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Adjustment Type</label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase Stock</SelectItem>
                    <SelectItem value="decrease">Decrease Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stock Received">Stock Received</SelectItem>
                    <SelectItem value="Stock Return">Stock Return</SelectItem>
                    <SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
                    <SelectItem value="Theft/Loss">Theft/Loss</SelectItem>
                    <SelectItem value="Expired Items">Expired Items</SelectItem>
                    <SelectItem value="Stock Count Correction">Stock Count Correction</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Apply Adjustment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
