"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  Package,
  Tag,
  Diamond,
  TrendingUp,
  Plus,
  ChevronRight,
  LogOut,
  FileText,
  Users,
  Building2,
  ShoppingCart,
  Truck,
  CreditCard,
  Warehouse,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

const salesData = [
  { month: "Aug", value: 2900000 },
  { month: "Sep", value: 1300000 },
]

export default function Component() {
  const [activeItem, setActiveItem] = useState("Dashboard")

  const menuItems = [{ name: "Dashboard", icon: BarChart3, active: true }]

  const inventoryItems = [
    { name: "Category", icon: Tag },
    { name: "Brands", icon: Diamond },
    { name: "Attributes", icon: Package },
    { name: "Products", icon: Package },
    { name: "Customers", icon: Users },
    { name: "Suppliers", icon: Truck },
    { name: "Sales", icon: ShoppingCart },
    { name: "Inventory", icon: Warehouse },
    { name: "Credit/Debit", icon: CreditCard },
  ]

  const reportItems = [{ name: "Reports", icon: FileText }]

  const adminItems = [
    { name: "Users", icon: Users },
    { name: "Company Profile", icon: Building2 },
  ]

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
                className="w-full flex items-center justify-between px-4 py-2 text-left text-sm text-white hover:bg-emerald-600 rounded-lg transition-colors mb-1"
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
                className="w-full flex items-center justify-between px-4 py-2 text-left text-sm text-white hover:bg-emerald-600 rounded-lg transition-colors mb-1"
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
                className="w-full flex items-center justify-between px-4 py-2 text-left text-sm text-white hover:bg-emerald-600 rounded-lg transition-colors mb-1"
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
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
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
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-gray-400">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total Sales
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">4,100,000 MMK</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-400">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                    Products
                  </CardTitle>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">2</div>
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
                <div className="text-2xl font-bold text-gray-900">3</div>
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
                <div className="text-2xl font-bold text-gray-900">3</div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M MMK`}
                      domain={[0, 3000000]}
                      ticks={[0, 700000, 1400000, 2100000, 2800000]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
