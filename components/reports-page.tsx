"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, DollarSign, ShoppingCart, Download, Calendar, Loader2 } from "lucide-react"

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
    name: string;
    quantity_sold: number;
    revenue: number;
    profit: number;
}
interface CompanyProfile {
  company_name: string; address: string; phone: string; email: string;
  website: string; tax_number: string; logo_url: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    // MODIFIED: Default date range is now the beginning of the year to ensure data is visible
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailySales, setDailySales] = useState<DailySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    fetchCompanyProfile();
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [dateRange])
  
  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single();
    if (data) setCompanyProfile(data as CompanyProfile);
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
        date: new Date(d.sale_day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) console.error("Error fetching recent sales:", error);
    else setRecentSales(data || []);
  };

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

  const exportToCsv = (filename: string, data: any[]) => {
    if (!data || data.length === 0) {
      alert("No data to export.");
      return;
    }
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
    const { data: saleItemsData, error } = await supabase.from('sale_items').select('*, products(*)').eq('sale_id', sale.id);
    if (error || !saleItemsData) {
        alert("Could not fetch sale details to reprint.");
        return;
    }

    const cartItems = saleItemsData.map(item => ({
        product: item.products,
        quantity: item.quantity,
        total: item.total_price,
    }));
    printReceipt(sale, cartItems);
  };
  
  const printReceipt = (sale: any, items: any[]) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
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
    </html>`;
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  }
  
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
                        <LineChart data={dailySales}><CartesianGrid /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} /><Line dataKey="revenue" name="Revenue" stroke="#8884d8"/><Line dataKey="profit" name="Profit" stroke="#82ca9d"/></LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top 5 Selling Products</CardTitle></CardHeader>
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
