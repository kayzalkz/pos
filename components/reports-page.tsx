import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"
import { 
    Download, 
    Loader2, 
    DollarSign, 
    BarChart3, 
    Users, 
    PieChart, 
    Archive, 
    TrendingUp, 
    LayoutDashboard, 
    LineChart as LineChartIcon, 
    AlertTriangle,
    CalendarIcon
} from "lucide-react"

// Interfaces
interface SaleTransaction {
  id: string
  sale_number: string
  total_amount: number
  created_at: string
  customers: { name: string } | null
}

interface ReportMetrics {
  totalRevenue: number
  totalProfit: number
  totalOrders: number
}

interface DailySales {
  date: string
  revenue: number
  profit: number
}

interface TopProduct {
  name: string
  quantity_sold: number
  revenue: number
  profit: number
}

interface CompanyProfile {
  company_name: string
  address: string
  phone: string
  email: string
  website: string
  tax_number: string
  logo_url: string
}

type ReportTab = 'salesReport' | 'productPerformance' | 'customerAnalysis' | 'categoryBreakdown' | 'inventoryStatus' | 'profitAnalysis' | 'summaryDashboard' | 'salesTrends' | 'lowStockAlert';

const reportTabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'salesReport', label: 'Sales Report', icon: DollarSign },
    { id: 'productPerformance', label: 'Product Performance', icon: BarChart3 },
    { id: 'customerAnalysis', label: 'Customer Analysis', icon: Users },
    { id: 'categoryBreakdown', label: 'Category Breakdown', icon: PieChart },
    { id: 'inventoryStatus', label: 'Inventory Status', icon: Archive },
    { id: 'profitAnalysis', label: 'Profit Analysis', icon: TrendingUp },
    { id: 'summaryDashboard', label: 'Summary Dashboard', icon: LayoutDashboard },
    { id: 'salesTrends', label: 'Sales Trends', icon: LineChartIcon },
    { id: 'lowStockAlert', label: 'Low Stock Alert', icon: AlertTriangle },
];


export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ReportTab>('salesReport');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })

  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'salesReport') {
        fetchReportData()
    } else {
        // Handle data fetching for other tabs here
        setLoading(false);
    }
  }, [dateRange, activeTab])

  const fetchCompanyProfile = async () => {
    const { data, error } = await supabase.from("company_profile").select("*").single()
    if (error) {
      console.error("Error fetching company profile:", error)
    } else {
      setCompanyProfile(data as CompanyProfile)
    }
  }

  const fetchReportData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchMetricsAndDailySales(), fetchTopProducts(), fetchRecentSales()])
    } catch (error) {
      console.error("Error fetching report data:", error)
    }
    setLoading(false)
  }

  const fetchMetricsAndDailySales = async () => {
    const { data, error } = await supabase.rpc("get_daily_sales_and_profit", {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
    })

    if (error) {
      console.error("Error fetching daily sales data:", error)
      setDailySales([])
      setMetrics({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
      return
    }

    const formattedData = data.map((d: any) => ({
      date: new Date(d.sale_day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: d.total_revenue,
      profit: d.total_profit,
    }))
    setDailySales(formattedData)

    const totalRevenue = data.reduce((sum: number, day: any) => sum + (day.total_revenue || 0), 0)
    const totalProfit = data.reduce((sum: number, day: any) => sum + (day.total_profit || 0), 0)
    const totalOrders = data.reduce((sum: number, day: any) => sum + (day.order_count || 0), 0)
    setMetrics({ totalRevenue, totalProfit, totalOrders })
  }

  const fetchTopProducts = async () => {
    const { data, error } = await supabase.rpc("get_top_selling_products", {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      limit_count: 5,
    })
    if (error) {
      console.error("Error fetching top products:", error)
    } else {
      setTopProducts(data || [])
    }
  }

  const fetchRecentSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("id, sale_number, total_amount, created_at, customers(name)")
      .gte("created_at", dateRange.startDate)
      .lte("created_at", `${dateRange.endDate}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching recent sales:", error)
    } else {
      setRecentSales(data || [])
    }
  }

  const exportToCsv = (filename: string, data: any[]) => {
    if (!data || data.length === 0) {
      // Using a custom modal or toast is better than alert
      console.warn("No data to export.");
      return
    }
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => {
        const cell = row[header];
        // Handle nested objects like customers
        if (typeof cell === 'object' && cell !== null) {
            return JSON.stringify(cell.name || '');
        }
        return JSON.stringify(cell);
      }).join(",")),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const reprintReceipt = async (sale: SaleTransaction) => {
    const { data: saleItemsData, error } = await supabase
      .from("sale_items")
      .select("*, products(*)")
      .eq("sale_id", sale.id)
    if (error || !saleItemsData) {
      // Use a better notification system than alert
      console.error("Could not fetch sale details to reprint.");
      return
    }

    const cartItems = saleItemsData.map((item) => ({
      product: item.products,
      quantity: item.quantity,
      total: item.total_price,
    }))
    printReceipt(sale, cartItems)
  }

  const printReceipt = (sale: any, items: any[]) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    const receiptHTML = `
    <html>
        <head>
        <title>Receipt - ${sale.sale_number}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; max-width: 300px; margin: 0 auto; padding: 10px; background: white; }
            .logo-container { text-align: center; margin-bottom: 10px; }
            .logo-container img { max-width: 120px; max-height: 80px; object-fit: contain; }
            .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .company-info { font-size: 10px; line-height: 1.3; margin-bottom: 8px; }
            .sale-info { margin-bottom: 10px; font-size: 11px; }
            .sale-info div { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .items-section { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; }
            .item-header, .item { display: flex; justify-content: space-between; }
            .item-header span:first-child, .item .item-name { flex-grow: 1; text-align: left; margin-right: 5px; word-break: break-word; }
            .item-header span:nth-child(2), .item .item-qty { width: 35px; text-align: center; flex-shrink: 0; }
            .item-header span:last-child, .item .item-price { width: 70px; text-align: right; flex-shrink: 0; }
            .item-header { font-weight: bold; margin-bottom: 5px; font-size: 10px; text-transform: uppercase; }
            .item { margin-bottom: 3px; font-size: 11px; }
            .totals-section { margin-top: 15px; }
            .total-line { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 5px; margin-top: 8px; display: flex; justify-content: space-between; }
        </style>
        </head>
        <body>
            ${companyProfile?.logo_url ? `<div class="logo-container"><img src="${companyProfile.logo_url}" alt="Company Logo"></div>` : ""}
            <div class="receipt-header">
                <div class="company-name">${companyProfile?.company_name || "POS SYSTEM"}</div>
                <div class="company-info">${companyProfile?.address || ""}</div>
            </div>
            <div class="sale-info">
                <div><span>Voucher:</span><span>${sale.sale_number}</span></div>
                <div><span>Date:</span><span>${new Date(sale.created_at).toLocaleString()}</span></div>
                ${sale.customers ? `<div><span>Customer:</span><span>${sale.customers.name}</span></div>` : ""}
            </div>
            <div class="items-section">
                <div class="item-header"><span>ITEM</span><span>QTY</span><span>AMOUNT</span></div>
                ${items.map((item: any) => `
                    <div class="item">
                        <span class="item-name">${item.product.name}</span>
                        <span class="item-qty">${item.quantity}</span>
                        <span class="item-price">${item.total.toLocaleString()}</span>
                    </div>
                `).join("")}
            </div>
            <div class="totals-section">
                <div class="total-line">
                    <span>TOTAL:</span>
                    <span>${sale.total_amount.toLocaleString()} MMK</span>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
            </script>
        </body>
    </html>`
    printWindow.document.write(receiptHTML)
    printWindow.document.close()
  }

  const renderSalesReport = () => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-green-600">
                {metrics.totalRevenue.toLocaleString()} MMK
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                {metrics.totalProfit.toLocaleString()} MMK
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p>
            </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
            <CardHeader>
                <CardTitle>Sales & Profit Trend</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#2563eb" />
                </LineChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle>Top 5 Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} interval={0} width={120} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sale No.</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {recentSales.map((sale) => (
                    <tr key={sale.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {new Date(sale.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        {sale.sale_number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {sale.customers?.name || "Walk-in"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold">
                        {sale.total_amount.toLocaleString()} MMK
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                        <Button variant="link" size="sm" onClick={() => reprintReceipt(sale)}>
                            Reprint
                        </Button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </CardContent>
        </Card>
    </>
  );

  const renderActiveTabContent = () => {
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading report...</span>
            </div>
        )
    }

    switch (activeTab) {
        case 'salesReport':
            return renderSalesReport();
        // Add cases for other reports here
        default:
            return (
                <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
                    <p>{reportTabs.find(t => t.id === activeTab)?.label} is under construction.</p>
                </div>
            );
    }
  };


  return (
    <div className="flex-1 flex flex-col bg-gray-100 p-4 sm:p-6">
        {/* Main Header */}
        <header className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Reports & Analytics</h1>
                <div className="flex items-center space-x-2">
                    <Button 
                        variant="outline" 
                        className="bg-white"
                        onClick={() => {
                            if (activeTab === 'salesReport') {
                                exportToCsv("sales_report", recentSales);
                            }
                            // Add logic for other tabs
                        }}
                    >
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button variant="link" className="text-sm">More options</Button>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="pl-8 bg-white"
                    />
                </div>
                <span>to</span>
                <div className="relative">
                    <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="pl-8 bg-white"
                    />
                </div>
            </div>
        </header>

        {/* Report Tabs Navigation */}
        <div className="mb-6 overflow-x-auto">
            <div className="flex border-b border-gray-200">
                {reportTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ease-in-out
                            ${activeTab === tab.id 
                                ? 'border-b-2 border-blue-600 text-blue-600' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`
                        }
                    >
                        <tab.icon className="w-4 h-4 mr-2" />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 bg-white p-6 rounded-lg shadow-sm">
            <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-semibold text-gray-800">
                    {reportTabs.find(t => t.id === activeTab)?.label}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {renderActiveTabContent()}
            </CardContent>
        </main>
    </div>
  )
}
