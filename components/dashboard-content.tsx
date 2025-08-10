"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { FileText, AlertTriangle, DollarSign, Package, Tag, Diamond } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

interface DashboardStats {
  totalSales: number
  totalProducts: number
  totalCategories: number
  totalBrands: number
  lowStockProducts: any[]
  recentSales: any[]
}

export default function DashboardContent({ setActiveItem }: { setActiveItem: (item: string) => void }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalBrands: 0,
    lowStockProducts: [],
    recentSales: [],
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch total sales
      const { data: salesData } = await supabase.from("sales").select("total_amount")
      const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0

      // Fetch products count and low stock
      const { data: productsData } = await supabase.from("products").select("*, categories(name), brands(name)")
      const lowStockProducts = productsData?.filter((p) => p.stock_quantity <= p.min_stock_level) || []

      // Fetch categories count
      const { data: categoriesData } = await supabase.from("categories").select("id")

      // Fetch brands count
      const { data: brandsData } = await supabase.from("brands").select("id")

      // Fetch recent sales for chart (last 7 days)
      const { data: recentSalesData } = await supabase
        .from("sales")
        .select("total_amount, sale_date")
        .gte("sale_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("sale_date", { ascending: true })

      // Process sales data by day
      const salesByDay = {}
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split("T")[0]
        last7Days.push({
          date: dateStr,
          day: date.toLocaleDateString("en", { weekday: "short" }),
          amount: 0,
        })
        salesByDay[dateStr] = 0
      }

      // Aggregate sales by date
      recentSalesData?.forEach((sale) => {
        const saleDate = sale.sale_date.split("T")[0]
        if (salesByDay.hasOwnProperty(saleDate)) {
          salesByDay[saleDate] += sale.total_amount
        }
      })

      // Update the chart data
      const salesChartData = last7Days.map((day) => ({
        day: day.day,
        amount: salesByDay[day.date],
      }))

      setStats({
        totalSales,
        totalProducts: productsData?.length || 0,
        totalCategories: categoriesData?.length || 0,
        totalBrands: brandsData?.length || 0,
        lowStockProducts,
        recentSales: salesChartData,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    }
  }

  // Process sales data for chart
  const salesChartData = stats.recentSales

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Low Stock Alert */}
        {stats.lowStockProducts.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Low Stock Alert:</strong> {stats.lowStockProducts.length} products are running low on stock.
              <Button
                variant="link"
                className="p-0 h-auto text-orange-600 underline ml-2"
                onClick={() => setActiveItem("Products")}
              >
                View Products
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-gray-400">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sales</CardTitle>
                <DollarSign className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSales.toLocaleString()} MMK</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-400">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Products</CardTitle>
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
              {stats.lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {stats.lowStockProducts.length} Low Stock
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-wide">Categories</CardTitle>
                <Tag className="w-4 h-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalCategories}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-400">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Brands</CardTitle>
                <Diamond className="w-4 h-4 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.totalBrands}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Overview Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Sales Overview (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Low Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats.lowStockProducts.length === 0 ? (
                  <p className="text-gray-500 text-sm">All products are well stocked!</p>
                ) : (
                  stats.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <h4 className="font-medium text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <Badge variant="destructive">{product.stock_quantity} left</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
