"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import {
  BarChart3,
  Package,
  Tag,
  Diamond,
  ChevronRight,
  LogOut,
  FileText,
  Users,
  Building2,
  ShoppingCart,
  Truck,
  CreditCard,
  Warehouse,
  AlertTriangle,
  DollarSign,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { useAuth } from "@/contexts/auth-context"

interface DashboardStats {
  totalSales: number
  totalProducts: number
  totalCategories: number
  totalBrands: number
  lowStockProducts: any[]
  recentSales: any[]
}

export default function DashboardMain({
  activeItem,
  setActiveItem,
}: {
  activeItem: string
  setActiveItem: (item: string) => void
}) {
  const { logout } = useAuth()
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

      // Fetch recent sales for chart
      const { data: recentSalesData } = await supabase
        .from("sales")
        .select("total_amount, sale_date")
        .order("sale_date", { ascending: false })
        .limit(30)

      setStats({
        totalSales,
        totalProducts: productsData?.length || 0,
        totalCategories: categoriesData?.length || 0,
        totalBrands: brandsData?.length || 0,
        lowStockProducts,
        recentSales: recentSalesData || [],
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    }
  }

  const menuItems = [{ name: "Dashboard", icon: BarChart3, active: true }]

  const inventoryItems = [
    { name: "Category", icon: Tag },
    { name: "Brands", icon: Diamond },
    { name: "Products", icon: Package },
    { name: "Customers", icon: Users },
    { name: "Suppliers", icon: Truck },
    { name: "POS Sales", icon: ShoppingCart },
    { name: "Inventory", icon: Warehouse },
    { name: "Credit/Debit", icon: CreditCard },
  ]

  const reportItems = [{ name: "Reports", icon: FileText }]

  const adminItems = [
    { name: "Users", icon: Users },
    { name: "Company Profile", icon: Building2 },
  ]

  // Process sales data for chart
  const salesChartData = stats.recentSales
    .slice(0, 7)
    .reverse()
    .map((sale, index) => ({
      day: `Day ${index + 1}`,
      amount: sale.total_amount,
    }))

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-emerald-500 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-lg font-bold mb-1">SALES &</h1>
          <h1 className="text-lg font-bold mb-4">INVENTORY</h1>
          <p className="text-sm opacity-90">Welcome,</p>
          <p className="text-sm opacity-90">System Administrator</p>
        </div>

        <nav className="flex-1 px-4">
          {/* Dashboard */}
          <div className="mb-6">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                  activeItem === item.name ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-600"
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3" />
                  <span className="text-sm">{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Inventory Management */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-emerald-200 mb-3 px-4">INVENTORY MANAGEMENT</h3>
            {inventoryItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors mb-1 rounded-lg ${
                  activeItem === item.name ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-600"
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Reports */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-emerald-200 mb-3 px-4">REPORTS</h3>
            {reportItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors mb-1 rounded-lg ${
                  activeItem === item.name ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-600"
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Administration */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-emerald-200 mb-3 px-4">ADMINISTRATION</h3>
            {adminItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveItem(item.name)}
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors mb-1 rounded-lg ${
                  activeItem === item.name ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-600"
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="w-4 h-4 mr-3" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <Button onClick={logout} className="w-full bg-red-600 hover:bg-red-700 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
          <Button onClick={() => setActiveItem("Reports")} className="bg-red-600 hover:bg-red-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
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
                  <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Sales
                  </CardTitle>
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
                  <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                    Products
                  </CardTitle>
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
                  <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    Categories
                  </CardTitle>
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
    </div>
  )
}
