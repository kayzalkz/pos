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
import { Search, Warehouse, AlertTriangle, Plus, Loader2 } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  stock_quantity: number
  min_stock_level: number
}

interface InventoryAdjustment {
  id: string
  product_id: string
  adjustment_type: string
  quantity: number
  reason: string
  notes: string | null
  created_at: string
  products: { name: string; sku: string }
  users: { username: string } | null // User can be null
}

export default function InventoryPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    adjustment_type: "increase",
    quantity: "",
    reason: "",
    notes: "",
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    await Promise.all([fetchProducts(), fetchAdjustments()])
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, sku, stock_quantity, min_stock_level").order("name")
    if (data) setProducts(data)
  }

  const fetchAdjustments = async () => {
    // MODIFIED: Correctly performs a LEFT JOIN on users so it doesn't fail if the user is deleted.
    const { data } = await supabase
      .from("inventory_adjustments")
      .select(`*, products!inner(name, sku), users(username)`)
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setAdjustments(data)
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !user) return

    setSubmitting(true);
    try {
        const adjustmentData = {
          product_id: selectedProduct.id,
          adjustment_type: formData.adjustment_type,
          quantity: Number.parseInt(formData.quantity),
          reason: formData.reason,
          notes: formData.notes,
          created_by: user.id,
        }
        await supabase.from("inventory_adjustments").insert(adjustmentData)

        const newQuantity =
          formData.adjustment_type === "increase"
            ? selectedProduct.stock_quantity + Number.parseInt(formData.quantity)
            : selectedProduct.stock_quantity - Number.parseInt(formData.quantity)

        await supabase
          .from("products")
          .update({ stock_quantity: Math.max(0, newQuantity) })
          .eq("id", selectedProduct.id)

        setIsDialogOpen(false)
        await fetchProducts()
        await fetchAdjustments() // THIS IS THE FIX: Refresh the adjustments list after submitting
    } catch (error) {
        console.error("Error submitting adjustment:", error);
        alert("Failed to submit adjustment.");
    } finally {
        setSubmitting(false);
    }
  }

  const resetForm = () => {
    setFormData({ adjustment_type: "increase", quantity: "", reason: "", notes: "" })
  }

  const openAdjustmentDialog = (product: Product) => {
    setSelectedProduct(product)
    resetForm()
    setIsDialogOpen(true)
  }

  if (loading) {
      return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white p-6 border-b">
        <div className="flex items-center">
          <Warehouse className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Inventory Management</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Stock Levels</CardTitle>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={product.stock_quantity <= product.min_stock_level ? "destructive" : "secondary"}>
                          Stock: {product.stock_quantity}
                        </Badge>
                        {product.stock_quantity <= product.min_stock_level && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" title="Low stock" />
                        )}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openAdjustmentDialog(product)}>Adjust</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[75vh] overflow-y-auto">
                {adjustments.map((adj) => (
                  <div key={adj.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-medium">{adj.products.name}</h4>
                            <p className="text-xs text-gray-500">{adj.products.sku}</p>
                        </div>
                      <Badge variant={adj.adjustment_type === "increase" ? "default" : "destructive"}>
                        {adj.adjustment_type === "increase" ? "+" : "-"}
                        {adj.quantity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Reason: {adj.reason}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      By {adj.users?.username || 'N/A'} on {new Date(adj.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setSelectedProduct(null); setIsDialogOpen(open); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Inventory - {selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">Current Stock: <strong>{selectedProduct?.stock_quantity}</strong></p>
              </div>
              <div>
                <label className="text-sm font-medium">Adjustment Type</label>
                <Select value={formData.adjustment_type} onValueChange={(value) => setFormData({ ...formData, adjustment_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase Stock (Stock In)</SelectItem>
                    <SelectItem value="decrease">Decrease Stock (Stock Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })} required>
                  <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
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
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="e.g., PO #12345, staff member name" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
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
