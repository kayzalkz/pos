"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Trash2, RefreshCw, AlertTriangle, Database } from "lucide-react"

export default function DataManagementPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const isAdmin = user?.role === "admin"

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="bg-white p-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-800">Access Denied</h1>
        </div>
        <div className="flex-1 p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Only administrators can access data management functions.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const clearAllData = async () => {
    if (!confirm("Are you sure you want to clear ALL data? This action cannot be undone!")) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // Clear data in correct order (respecting foreign key constraints)
      await supabase.from("sale_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("customer_credits").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("inventory_adjustments").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("product_attributes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("brands").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("attributes").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      setMessage("All data cleared successfully!")
    } catch (error) {
      console.error("Error clearing data:", error)
      setMessage("Error clearing data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaultData = async () => {
    if (!confirm("Reset to default sample data? This will clear existing data first.")) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // First clear existing data
      await clearAllData()

      // Insert default categories
      await supabase.from("categories").insert([
        { name: "Electronics", description: "Electronic devices and accessories" },
        { name: "Clothing", description: "Apparel and fashion items" },
        { name: "Food & Beverages", description: "Food and drink products" },
      ])

      // Insert default brands
      await supabase.from("brands").insert([
        { name: "Samsung", description: "Samsung electronics" },
        { name: "Nike", description: "Nike sportswear" },
        { name: "Coca Cola", description: "Beverage brand" },
      ])

      // Insert default suppliers
      await supabase.from("suppliers").insert([
        {
          name: "ABC Electronics",
          contact_person: "John Smith",
          phone: "09111111111",
          email: "john@abc.com",
          address: "123 Main St, Yangon",
        },
        {
          name: "XYZ Fashion",
          contact_person: "Mary Johnson",
          phone: "09222222222",
          email: "mary@xyz.com",
          address: "456 Fashion Ave, Mandalay",
        },
      ])

      // Insert default attributes
      await supabase.from("attributes").insert([
        { name: "Color", type: "select", values: ["Red", "Blue", "Green", "Black", "White"] },
        { name: "Size", type: "select", values: ["XS", "S", "M", "L", "XL", "XXL"] },
        { name: "Material", type: "select", values: ["Cotton", "Polyester", "Leather", "Plastic", "Metal"] },
      ])

      // Get inserted data for relationships
      const { data: categories } = await supabase.from("categories").select("*")
      const { data: brands } = await supabase.from("brands").select("*")
      const { data: suppliers } = await supabase.from("suppliers").select("*")

      if (categories && brands && suppliers) {
        // Insert default products
        await supabase.from("products").insert([
          {
            name: "Samsung Galaxy Phone",
            sku: "SKU001",
            category_id: categories.find((c) => c.name === "Electronics")?.id,
            brand_id: brands.find((b) => b.name === "Samsung")?.id,
            supplier_id: suppliers.find((s) => s.name === "ABC Electronics")?.id,
            cost_price: 800000,
            selling_price: 1200000,
            stock_quantity: 5,
            min_stock_level: 3,
          },
          {
            name: "Nike Air Max",
            sku: "SKU002",
            category_id: categories.find((c) => c.name === "Clothing")?.id,
            brand_id: brands.find((b) => b.name === "Nike")?.id,
            supplier_id: suppliers.find((s) => s.name === "XYZ Fashion")?.id,
            cost_price: 80000,
            selling_price: 150000,
            stock_quantity: 2,
            min_stock_level: 5,
          },
        ])
      }

      // Insert default customer
      await supabase
        .from("customers")
        .insert([{ name: "John Doe", phone: "09123456789", email: "john@example.com", credit_balance: 0 }])

      setMessage("Default data restored successfully!")
    } catch (error) {
      console.error("Error resetting data:", error)
      setMessage("Error resetting data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center">
          <Database className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Data Management</h1>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> These operations are irreversible. Only use in development or when you need to
              reset the system.
            </AlertDescription>
          </Alert>

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Clear All Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This will permanently delete all sales, products, customers, suppliers, and other data from the system.
              </p>
              <Button onClick={clearAllData} disabled={loading} variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                {loading ? "Clearing Data..." : "Clear All Data"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Reset to Default Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This will clear all existing data and restore the system with sample categories, brands, products, and
                customers.
              </p>
              <Button onClick={resetToDefaultData} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                {loading ? "Resetting Data..." : "Reset to Default Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
