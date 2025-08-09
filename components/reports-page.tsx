"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { TrendingUp, DollarSign, Package, Users, ShoppingCart, Download, Calendar, Loader2 } from "lucide-react"

// Interfaces for our data structures
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
  orders: number
}

interface ProductCategorySales {
  name: string
  revenue: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  // State for all our report data
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [categorySales, setCategorySales] = useState<ProductCategorySales[]>([])
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<any>(null);


  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single();
    if (data) setCompanyProfile(data);
  };
  
  const fetchReportData = async () => {
    setLoading(true)
    await Promise.all([
      fetchMetricsAndDailySales(),
      fetchCategorySales(),
      fetchRecentSales(),
    ])
    setLoading(false)
  }

  const fetchMetricsAndDailySales = async () => {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        quantity,
        unit_price,
        products!inner(cost_price),
        sales!inner(created_at, total_amount)
      `)
      .gte('created_at', dateRange.startDate)
      .lte('created_at', dateRange.endDate + 'T23:59:59');

    if (error) {
      console.error("Error fetching sales metrics:", error);
      return;
    }

    let totalRevenue = 0;
    let totalProfit = 0;
    const dailyData: Record<string, { revenue: number, profit: number, orders: number }> = {};
    const saleIds = new Set<string>(); // To count unique orders

    data.forEach((item: any) => {
        const revenue = (item.unit_price || 0) * (item.quantity || 0);
        const cost = (item.products.cost_price || 0) * (item.quantity || 0);
        const profit = revenue - cost;

        totalRevenue += revenue;
        totalProfit += profit;
        
        const date = item.sales.created_at.split("T")[0];
        if (!dailyData[date]) {
            dailyData[date] = { revenue: 0, profit: 0, orders: 0 };
        }
        dailyData[date].revenue += revenue;
        dailyData[date].profit += profit;
        
        // This logic approximates daily orders based on sale items
        if (!saleIds.has(item.sales.id)) {
            dailyData[date].orders += 1;
            saleIds.add(item.sales.id);
        }
    });

    setMetrics({ totalRevenue, totalProfit, totalOrders: saleIds.size });
    setDailySales(Object.entries(dailyData).map(([date, data]) => ({ date, ...data })));
  };

  const fetchCategorySales = async () => { /* ... (similar logic to above) ... */ };
  const fetchRecentSales = async () => {
    const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, total_amount, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) console.error("Error fetching recent sales:", error);
    else setRecentSales(data || []);
  };

  const handleDateFilterChange = (filter: 'today' | 'week' | 'month' | 'year') => {
    const endDate = new Date();
    let startDate = new Date();
    if (filter === 'today') {
        // Start date is today
    } else if (filter === 'week') {
        startDate.setDate(endDate.getDate() - 7);
    } else if (filter === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
    } else if (filter === 'year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
    }
    setDateRange({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
    });
  };

  const exportToCsv = (filename: string, data: any[]) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const reprintReceipt = async (saleId: string) => {
    const { data: saleData } = await supabase.from('sales').select('*, customers(name)').eq('id', saleId).single();
    const { data: saleItemsData } = await supabase.from('sale_items').select('*, products(*)').eq('sale_id', saleId);
    
    if (saleData && saleItemsData) {
        const cartItems = saleItemsData.map(item => ({
            product: item.products,
            quantity: item.quantity,
            total: item.total_price,
        }));
        // This reuses the same print logic from your POS form
        // printReceipt(saleData, cartItems); // You would need to import or pass this function
    }
  };
  
  if (loading) { /* ... loading component ... */ }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white p-6 border-b">
        <h1 className="text-2xl font-semibold text-gray-800">Sales Reports & Analytics</h1>
        <div className="flex items-center space-x-2 mt-4">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} />
            <span>to</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} />
            <Button variant="outline" onClick={() => handleDateFilterChange('today')}>Today</Button>
            <Button variant="outline" onClick={() => handleDateFilterChange('week')}>This Week</Button>
            <Button variant="outline" onClick={() => handleDateFilterChange('month')}>This Month</Button>
            <Button variant="outline" onClick={() => handleDateFilterChange('year')}>This Year</Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{metrics.totalRevenue.toLocaleString(undefined, {style:'currency', currency:'USD'})}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Total Profit</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-blue-600">{metrics.totalProfit.toLocaleString(undefined, {style:'currency', currency:'USD'})}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p></CardContent>
            </Card>
        </div>

        <Card className="mb-6">
            <CardHeader><CardTitle>Sales & Profit Trend</CardTitle></CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                        <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        {/* Placeholder for other charts and tables */}

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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.sale_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.customers?.name || 'Walk-in'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">{sale.total_amount.toLocaleString(undefined, {style:'currency', currency:'USD'})}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <Button variant="link" size="sm" onClick={() => reprintReceipt(sale.id)}>Reprint</Button>
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
