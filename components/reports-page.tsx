"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, DollarSign, Package, Users, ShoppingCart, Download, Calendar, Loader2 } from "lucide-react"

interface SalesData {
  date: string
  total_amount: number
  profit: number
  orders: number
}

interface ProductSales {
  product_name: string
  quantity_sold: number
  revenue: number
  profit: number
}

interface CategorySales {
  category_name: string
  revenue: number
  quantity: number
}

interface ReportMetrics {
  totalRevenue: number
  totalProfit: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  averageOrderValue: number
  profitMargin: number
  topSellingProduct: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    profitMargin: 0,
    topSellingProduct: "N/A",
  })
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [productSales, setProductSales] = useState<ProductSales[]>([])
  const [categorySales, setCategorySales] = useState<CategorySales[]>([])

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchMetrics(), fetchSalesData(), fetchProductSales(), fetchCategorySales()])
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      // Fetch sales metrics with error handling for missing columns
      const { data: salesMetrics, error: salesError } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .gte("created_at", dateRange.startDate)
        .lte("created_at", dateRange.endDate + "T23:59:59")

      if (salesError && !salesError.message.includes("does not exist")) {
        throw salesError
      }

      // Fetch product count with error handling
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id", { count: "exact" })
        .eq("is_active", true)

      if (productsError && !productsError.message.includes("does not exist")) {
        console.warn("Products query failed:", productsError)
      }

      // Fetch customer count with error handling
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id", { count: "exact" })
        .eq("is_active", true)

      if (customersError && !customersError.message.includes("does not exist")) {
        console.warn("Customers query failed:", customersError)
      }

      // Calculate metrics with fallbacks
      const sales = salesMetrics || []
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
      const totalOrders = sales.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Fetch top selling product with error handling
      let topSellingProduct = "N/A"
      try {
        const { data: topProduct } = await supabase
          .from("sale_items")
          .select(`
            quantity,
            products!inner(name)
          `)
          .gte("created_at", dateRange.startDate)
          .lte("created_at", dateRange.endDate + "T23:59:59")
          .order("quantity", { ascending: false })
          .limit(1)
          .single()

        if (topProduct?.products?.name) {
          topSellingProduct = topProduct.products.name
        }
      } catch (error) {
        console.warn("Top product query failed:", error)
      }

      setMetrics({
        totalRevenue,
        totalProfit: totalRevenue * 0.3, // Estimated 30% profit margin
        totalOrders,
        totalProducts: productsData?.length || 0,
        totalCustomers: customersData?.length || 0,
        averageOrderValue,
        profitMargin: totalRevenue > 0 ? 30 : 0, // Estimated
        topSellingProduct,
      })
    } catch (error) {
      console.error("Error fetching metrics:", error)
      // Set default metrics on error
      setMetrics({
        totalRevenue: 0,
        totalProfit: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        profitMargin: 0,
        topSellingProduct: "N/A",
      })
    }
  }

  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .gte("created_at", dateRange.startDate)
        .lte("created_at", dateRange.endDate + "T23:59:59")
        .order("created_at")

      if (error && !error.message.includes("does not exist")) {
        throw error
      }

      // Group by date and calculate daily metrics
      const dailyData: { [key: string]: { total_amount: number; orders: number } } = {}
      ;(data || []).forEach((sale) => {
        const date = new Date(sale.created_at).toISOString().split("T")[0]
        if (!dailyData[date]) {
          dailyData[date] = { total_amount: 0, orders: 0 }
        }
        dailyData[date].total_amount += sale.total_amount || 0
        dailyData[date].orders += 1
      })

      const chartData = Object.entries(dailyData).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString(),
        total_amount: data.total_amount,
        profit: data.total_amount * 0.3, // Estimated profit
        orders: data.orders,
      }))

      setSalesData(chartData)
    } catch (error) {
      console.error("Error fetching sales data:", error)
      setSalesData([])
    }
  }

  const fetchProductSales = async () => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          quantity,
          price,
          products!inner(name, cost)
        `)
        .gte("created_at", dateRange.startDate)
        .lte("created_at", dateRange.endDate + "T23:59:59")

      if (error && !error.message.includes("does not exist")) {
        throw error
      }

      // Group by product and calculate totals
      const productData: { [key: string]: { quantity: number; revenue: number; cost: number } } = {}
      ;(data || []).forEach((item) => {
        const productName = item.products?.name || "Unknown Product"
        if (!productData[productName]) {
          productData[productName] = { quantity: 0, revenue: 0, cost: 0 }
        }
        productData[productName].quantity += item.quantity || 0
        productData[productName].revenue += (item.price || 0) * (item.quantity || 0)
        productData[productName].cost += (item.products?.cost || 0) * (item.quantity || 0)
      })

      const chartData = Object.entries(productData)
        .map(([product_name, data]) => ({
          product_name,
          quantity_sold: data.quantity,
          revenue: data.revenue,
          profit: data.revenue - data.cost,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) // Top 10 products

      setProductSales(chartData)
    } catch (error) {
      console.error("Error fetching product sales:", error)
      setProductSales([])
    }
  }

  const fetchCategorySales = async () => {
    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          quantity,
          price,
          products!inner(
            categories!inner(name)
          )
        `)
        .gte("created_at", dateRange.startDate)
        .lte("created_at", dateRange.endDate + "T23:59:59")

      if (error && !error.message.includes("does not exist")) {
        throw error
      }

      // Group by category
      const categoryData: { [key: string]: { quantity: number; revenue: number } } = {}
      ;(data || []).forEach((item) => {
        const categoryName = item.products?.categories?.name || "Uncategorized"
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = { quantity: 0, revenue: 0 }
        }
        categoryData[categoryName].quantity += item.quantity || 0
        categoryData[categoryName].revenue += (item.price || 0) * (item.quantity || 0)
      })

      const chartData = Object.entries(categoryData).map(([category_name, data]) => ({
        category_name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))

      setCategorySales(chartData)
    } catch (error) {
      console.error("Error fetching category sales:", error)
      setCategorySales([])
    }
  }

  const exportReport = () => {
    const reportData = {
      dateRange,
      metrics,
      salesData,
      productSales,
      categorySales,
      generatedAt: new Date().toISOString(),
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading reports...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Sales Reports & Analytics</h1>
          <Button onClick={exportReport} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Date Range:</span>
          </div>
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-auto"
          />
          <span className="text-gray-500">to</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-auto"
          />
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${metrics.totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-blue-600">${metrics.totalProfit.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-orange-600">${metrics.averageOrderValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-xl font-bold">{metrics.totalProducts}</p>
                </div>
                <Package className="w-6 h-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-xl font-bold">{metrics.totalCustomers}</p>
                </div>
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className="text-xl font-bold">{metrics.profitMargin.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_amount" stroke="#8884d8" name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Sales Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={productSales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
