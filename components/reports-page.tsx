"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Download, Calendar, Loader2 } from "lucide-react"

// Interfaces
interface SaleTransaction { id: string; sale_number: string; total_amount: number; created_at: string; customers: { name: string } | null; }
interface ReportMetrics { totalRevenue: number; totalProfit: number; totalOrders: number; }
interface DailyData { date: string; revenue: number; profit: number; }
interface TopProduct { name: string; quantity_sold: number; revenue: number; profit: number; }
interface CompanyProfile { company_name: string; address: string; phone: string; email: string; website: string; tax_number: string; logo_url: string; }

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    // MODIFIED: Default date range is now the last 5 years to capture all historical data
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [topN, setTopN] = useState(5);

  useEffect(() => {
    fetchCompanyProfile();
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [dateRange, topN])
  
  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single();
    if (data) setCompanyProfile(data as CompanyProfile);
  };
  
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, total_amount, created_at, customers(name),
          sale_items( quantity, unit_price, total_price, products(name, cost_price) )
        `)
        .gte('created_at', dateRange.startDate)
        .lte('created_at', `${dateRange.endDate}T23:59:59`);

      if (salesError) throw salesError;
      
      const allItems = sales.flatMap(s => s.sale_items);

      // 1. Calculate Metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalProfit = allItems.reduce((sum, item: any) => {
          const cost = item.products?.cost_price || 0;
          const profitPerItem = item.unit_price - cost;
          return sum + (profitPerItem * item.quantity);
      }, 0);
      setMetrics({ totalRevenue, totalProfit, totalOrders: sales.length });

      // 2. Calculate Top Products
      const productMap = new Map<string, TopProduct>();
      allItems.forEach((item: any) => {
          if (!item.products) return;
          const name = item.products.name;
          const existing = productMap.get(name) || { name, quantity_sold: 0, revenue: 0, profit: 0 };
          existing.quantity_sold += item.quantity;
          existing.revenue += item.total_price;
          const cost = item.products.cost_price || 0;
          existing.profit += (item.unit_price - cost) * item.quantity;
          productMap.set(name, existing);
      });
      const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, topN);
      setTopProducts(sortedProducts);
      
      // 3. Set Recent Sales
      setRecentSales(sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50));

    } catch(error) {
        console.error("Error fetching report data:", error);
    } finally {
        setLoading(false);
    }
  }

  const handleDateFilterChange = (filter: 'today' | 'week' | 'month') => {
    const endDate = new Date();
    let startDate = new Date();
    if (filter === 'week') startDate.setDate(endDate.getDate() - 6);
    else if (filter === 'month') startDate.setDate(endDate.getDate() - 29);
    
    setDateRange({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
    });
  };

  const exportToCsv = (filename: string, data: any[]) => { /* ... unchanged ... */ };
  const reprintReceipt = async (sale: SaleTransaction) => { /* ... unchanged ... */ };
  const printReceipt = (sale: any, items: any[]) => { /* ... unchanged ... */ }
  
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading reports...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-semibold">Sales Reports</h1>
        <div className="flex items-center space-x-2">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} />
            <span>to</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} />
            <Button variant="outline" size="sm" onClick={() => handleDateFilterChange('today')}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateFilterChange('week')}>This Week</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateFilterChange('month')}>This Month</Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{metrics.totalRevenue.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Profit</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-blue-600">{metrics.totalProfit.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Total Orders</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p></CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle>Sales & Profit Trend</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyData}><CartesianGrid /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} /><Line dataKey="revenue" name="Revenue" stroke="#8884d8"/><Line dataKey="profit" name="Profit" stroke="#82ca9d"/></LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex-row justify-between items-center">
                    <CardTitle>Top Selling Products</CardTitle>
                    <Select value={topN.toString()} onValueChange={(val) => setTopN(Number(val))}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">Top 5</SelectItem>
                            <SelectItem value="10">Top 10</SelectItem>
                            <SelectItem value="20">Top 20</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts} layout="vertical"><CartesianGrid /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12}} interval={0} /><Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} /><Bar dataKey="revenue" name="Revenue" fill="#8884d8" /></BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Recent Sales</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCsv('recent_sales', recentSales)}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
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
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(sale.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{sale.sale_number}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">{sale.customers?.name || 'Walk-in'}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold">{sale.total_amount.toLocaleString()} MMK</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                        <Button variant="link" size="sm" onClick={() => reprintReceipt(sale)}>Reprint</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  )
}
