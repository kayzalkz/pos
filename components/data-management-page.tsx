"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Trash2, RefreshCw, AlertTriangle, Database, Loader2 } from "lucide-react"

export default function DataManagementPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const isAdmin = user?.role === "admin"

  if (!isAdmin) {
    return (
      <div className="flex-1 p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Only administrators can access this page.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const clearAllData = async () => {
    setLoading(true)
    setMessage("Clearing data... This may take a moment.")

    try {
      // Clear data in the correct order to respect foreign key constraints
      // Start with tables that reference others
      await supabase.from("sale_items").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("customer_credits").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("inventory_adjustments").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("product_attributes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      
      // Now clear tables that are referenced
      await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("suppliers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      
      // Finally, clear the base data tables
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("brands").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("attributes").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      setMessage("All application data has been permanently deleted.")
      return true // Return true on success
    } catch (error) {
      const err = error as Error;
      setMessage(`Error clearing data: ${err.message}`)
      console.error("Error clearing data:", err)
      return false // Return false on failure
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaultData = async () => {
    if (!confirm("Are you sure you want to reset to default sample data? This will clear all current data first.")) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      // First, ensure all existing data is cleared
      const cleared = await clearAllData();
      if (!cleared) {
          // If clearing failed, stop the reset process
          setMessage("Could not clear existing data. Aborting reset.")
          setLoading(false);
          return;
      }

      setMessage("Seeding new sample data...");

      // Insert default categories and wait for completion
      await supabase.from("categories").insert([
        { name: "Electronics" }, { name: "Apparel" }, { name: "Beverages" },
      ])

      // Insert default brands and wait for completion
      await supabase.from("brands").insert([
        { name: "Apple" }, { name: "Adidas" }, { name: "Local Coffee Co." },
      ])

      // Insert default suppliers and wait for completion
      await supabase.from("suppliers").insert([
        { name: "Global Tech Distributors", contact_person: "John Appleseed", phone: "09111111111" },
        { name: "Fashion Forward Inc.", contact_person: "Jane Doe", phone: "09222222222" },
      ])

      // Get the IDs of the newly inserted data
      const { data: categories } = await supabase.from("categories").select("id, name")
      const { data: brands } = await supabase.from("brands").select("id, name")
      const { data: suppliers } = await supabase.from("suppliers").select("id, name")

      if (categories && brands && suppliers) {
        // Insert default products using the fetched IDs
        await supabase.from("products").insert([
          {
            name: "iPhone 15 Pro", sku: "APPLE-IP15P",
            category_id: categories.find((c) => c.name === "Electronics")?.id,
            brand_id: brands.find((b) => b.name === "Apple")?.id,
            supplier_id: suppliers.find((s) => s.name === "Global Tech Distributors")?.id,
            cost_price: 900, selling_price: 1199,
            stock_quantity: 10, min_stock_level: 5,
            image_url: 'https://placehold.co/600x400/000000/FFFFFF/png?text=iPhone+15'
          },
          {
            name: "Adidas Ultraboost", sku: "ADIDAS-UB22",
            category_id: categories.find((c) => c.name === "Apparel")?.id,
            brand_id: brands.find((b) => b.name === "Adidas")?.id,
            supplier_id: suppliers.find((s) => s.name === "Fashion Forward Inc.")?.id,
            cost_price: 75, selling_price: 180,
            stock_quantity: 4, min_stock_level: 10, // Example of low stock
            image_url: 'https://placehold.co/600x400/FFFFFF/000000/png?text=Shoes'
          },
          {
            name: "Iced Americano", sku: "COFFEE-AME-L",
            category_id: categories.find((c) => c.name === "Beverages")?.id,
            brand_id: brands.find((b) => b.name === "Local Coffee Co.")?.id,
            cost_price: 1, selling_price: 3.50,
            stock_quantity: 100, min_stock_level: 20,
            image_url: 'https://placehold.co/600x400/A52A2A/FFFFFF/png?text=Coffee'
          },
        ])
      }

      // Insert a default customer
      await supabase.from("customers").insert([
          { name: "Default Customer", phone: "09987654321", credit_balance: 0 }
      ])

      setMessage("Default data restored successfully! You may need to refresh other pages to see the changes.")
    } catch (error) {
        const err = error as Error
        setMessage(`Error resetting data: ${err.message}`)
        console.error("Error resetting data:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white p-6 border-b">
        <div className="flex items-center">
          <Database className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Data Management</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> These operations are irreversible and will permanently delete data. Only use them if you are absolutely certain.
            </AlertDescription>
          </Alert>

          {message && (
            <Alert className={message.startsWith("Error") ? "border-red-500 text-red-700" : "border-green-500 text-green-700"}>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Clear All Application Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Permanently delete all sales, products, customers, suppliers, and related records. This cannot be undone.
              </p>
              <Button onClick={clearAllData} disabled={loading} variant="destructive" className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                {loading ? "Clearing..." : "Clear All Data"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Reset to Default Sample Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                This will clear all existing data and restore the system with a small set of sample data.
              </p>
              <Button onClick={resetToDefaultData} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {loading ? "Resetting..." : "Reset to Default Data"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
