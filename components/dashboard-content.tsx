"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import {
  BarChart3, Package, Tag, Diamond, ChevronRight, LogOut, FileText, Users,
  Building2, ShoppingCart, Truck, CreditCard, Warehouse, AlertTriangle,
  DollarSign, TrendingUp, PanelLeftClose, PanelLeftOpen, ClipboardList, Database
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useAuth } from "@/contexts/auth-context"

// Interfaces for our data structures
interface DashboardStats {
  totalRevenue: number
  totalProfit: number
  totalOrders: number
  newCustomers: number
  totalProducts: number
  lowStockCount: number
}

interface LowStockProduct {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
}

interface DailySale {
    date: string;
    revenue: number;
}

export default function DashboardPage({ activeItem, setActiveItem }: { activeItem: string, setActiveItem: (item: string) => void }) {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0, totalProfit: 0, totalOrders: 0, newCustomers: 0,
    totalProducts: 0, lowStockCount: 0
  })
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySale[]>([]);

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      if (rpcError) throw rpcError;
      const mainStats = rpcData[0];

      const { count: productCount } = await supabase.from("products").select("id", { count: "exact" });
      const { data: lowStockData } = await supabase.from("products").select("id, name, sku, stock_quantity").lte('stock_quantity', 5).limit(10);
      
      const { data: dailySalesData } = await supabase.rpc('get_daily_sales_sum', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      
      setStats({
        totalRevenue: mainStats.total_revenue,
        totalProfit: mainStats.total_profit,
        totalOrders: mainStats.total_orders,
        newCustomers: mainStats.new_customers,
        totalProducts: productCount ?? 0,
        lowStockCount: lowStockData?.length ?? 0
      });

      setLowStockProducts(lowStockData || []);
      setDailySales(dailySalesData.map((d: any) => ({
          date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: d.total_revenue
      })) || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false);
    }
  }

  // MODIFIED: Single menu array to match your screenshot
  const menuItems = [
    { name: "Dashboard", icon: BarChart3 },
    { name: "Category", icon: Tag },
    { name: "Brands", icon: Diamond },
    { name: "Attributes", icon: ClipboardList },
    { name: "Products", icon: Package },
    { name: "Customers", icon: Users },
    { name: "Suppliers", icon: Truck },
    { name: "POS Sales", icon: ShoppingCart },
    { name: "Inventory", icon: Warehouse },
    { name: "Credit/Debit", icon: CreditCard },
    { name: "Reports", icon: FileText },
    { name: "Users", icon: Users },
    { name: "Company Profile", icon: Building2 },
    { name: "Data Management", icon: Database },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-emerald-700 text-white flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 flex items-center justify-between">
            <div className={`transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                <h1 className="text-xl font-bold whitespace-nowrap">SALES & INVENTORY</h1>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hover:bg-emerald-600"
            >
                {isSidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
        </div>

        <div className="p-4 border-y border-emerald-600">
            <p className={`text-sm opacity-90 truncate transition-opacity ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Welcome,</p>
            <p className={`font-bold opacity-90 truncate transition-opacity ${isSidebarCollapsed ? 'hidden' : 'block'}`}>{user?.username || 'System Administrator'}</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveItem(item.name)}
              title={item.name}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors
                  ${isSidebarCollapsed ? 'justify-center' : ''}
                  ${activeItem === item.name ? "bg-emerald-800 font-semibold" : "hover:bg-emerald-600"}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`ml-4 text-sm whitespace-nowrap transition-all ${isSidebarCollapsed ? 'hidden' : 'block'}`}>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-emerald-600">
          <Button onClick={logout} className="w-full bg-red-600 hover:bg-red-700">
            <LogOut className={`transition-all ${isSidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'}`} />
            <span className={isSidebarCollapsed ? 'hidden' : 'block'}>Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* MODIFIED: Header no longer has the "Generate Report" button */}
        <header className="bg-white p-6 border-b flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {stats.lowStockCount > 0 && (
            <Alert className="mb-6 border-orange-300 bg-orange-50 text-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <strong>Low Stock Alert:</strong> {stats.lowStockCount} products are running low.
                <Button variant="link" className="p-0 h-auto text-orange-700 underline ml-2" onClick={() => setActiveItem("Products")}>
                  View Products
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Profit</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{stats.totalProfit.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Orders</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{stats.totalOrders}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">New Customers</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{stats.newCustomers}</p></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Sales Overview (Last 7 Days)</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `${(Number(value) / 1000)}k`} />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString()} MMK`} />
                        <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Low Stock Products</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                  {lowStockProducts.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center pt-8">All products are well stocked!</p>
                  ) : (
                      lowStockProducts.map(product => (
                          <div key={product.id} className="flex justify-between items-center p-2 border rounded-md">
                              <div>
                                <p className="font-medium text-sm">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.sku}</p>
                              </div>
                              <Badge variant="destructive">{product.stock_quantity} left</Badge>
                          </div>
                      ))
                  )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
