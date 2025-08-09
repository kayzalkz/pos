"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, DollarSign, ShoppingCart, Download, Calendar, Loader2 } from "lucide-react"

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
}

interface TopProduct {
    name: string;
    quantity_sold: number;
    revenue: number;
    profit: number;
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

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
      fetchTopProducts(),
      fetchRecentSales(),
    ])
    setLoading(false)
  }

  const fetchMetricsAndDailySales = async () => {
    const { data, error } = await supabase.rpc('get_daily_sales_and_profit', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
    });

    if (error) {
        console.error("Error fetching daily sales data:", error);
        setDailySales([]);
        setMetrics({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 });
        return;
    }
    
    const formattedData = data.map((d: any) => ({
        date: new Date(d.sale_day).toLocaleDateString(),
        revenue: d.total_revenue,
        profit: d.total_profit
    }));
    setDailySales(formattedData);

    const totalRevenue = data.reduce((sum: number, day: any) => sum + (day.total_revenue || 0), 0);
    const totalProfit = data.reduce((sum: number, day: any) => sum + (day.total_profit || 0), 0);
    const totalOrders = data.reduce((sum: number, day: any) => sum + (day.order_count || 0), 0);

    setMetrics({ totalRevenue, totalProfit, totalOrders });
  };

  const fetchTopProducts = async () => {
    const { data, error } = await supabase.rpc('get_top_selling_products', {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        limit_count: 5
    });
    if (error) console.error("Error fetching top products:", error);
    else setTopProducts(data || []);
  };

  const fetchRecentSales = async () => {
    const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, total_amount, created_at, customers(name)')
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) console.error("Error fetching recent sales:", error);
    else setRecentSales(data || []);
  };

  const handleDateFilterChange = (filter: 'today' | 'week' | 'month' | 'year') => {
    const endDate = new Date();
    let startDate = new Date();
    if (filter === 'week') startDate.setDate(endDate.getDate() - 7);
    else if (filter === 'month') startDate.setMonth(endDate.getMonth() - 1);
    else if (filter === 'year') startDate.setFullYear(endDate.getFullYear() - 1);
    
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
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const reprintReceipt = async (sale: SaleTransaction) => {
    const { data: saleItemsData } = await supabase.from('sale_items').select('*, products(*)').eq('sale_id', sale.id);
    if (!saleItemsData) return;

    const cartItems = saleItemsData.map(item => ({
        product: item.products,
        quantity: item.quantity,
        total: item.total_price,
    }));
    printReceipt(sale, cartItems, sale.customers);
  };
  
  // This is the same print function from your POS form, included here for reprinting.
  const printReceipt = (sale: any, items: any[], customer: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const receiptHTML = `
    <html>
        <head>
        <title>Receipt - ${sale.sale_number}</title>
        <style>
            /* ... Full CSS from your POS form receipt ... */
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
                ${customer ? `<div><span>Customer:</span><span>${customer.name}</span></div>` : ""}
            </div>
            <div class="items-section">
                ${items.map((item: any) => `
                    <div class="item">
                        <span class="item-name">${item.product.name}</span>
                        <span class="item-qty">${item.quantity}</span>
                        <span class="item-price">${item.total.toLocaleString()}</span>
                    </div>
                `).join("")}
            </div>
            <div class="totals-section">
                <div class="total-line grand-total">
                    <span>TOTAL:</span>
                    <span>${sale.total_amount.toLocaleString()} MMK</span>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
            </script>
        </body>
    </html>`;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  }
  
  if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
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
            <Button variant="outline" size="sm" onClick={() => handleDateFilterChange('week')}>Week</Button>
            <Button variant="outline" size="sm" onClick={() => handleDateFilterChange('month')}>Month</Button>
        </div>
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{metrics.totalRevenue.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Total Profit</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-blue-600">{metrics.totalProfit.toLocaleString()} MMK</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Total Orders</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p></CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle>Sales & Profit Trend</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={300}>{/* ... LineChart ... */}</ResponsiveContainer></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 5 Selling Products</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={300}>{/* ... BarChart for top products ... */}</ResponsiveContainer></CardContent>
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
                        <thead className="bg-gray-50">{/* ... Table Headers ... */}</thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td className="px-6 py-4">{new Date(sale.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">{sale.sale_number}</td>
                                    <td className="px-6 py-4">{sale.customers?.name || 'Walk-in'}</td>
                                    <td className="px-6 py-4 text-right">{sale.total_amount.toLocaleString()} MMK</td>
                                    <td className="px-6 py-4 text-center">
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
