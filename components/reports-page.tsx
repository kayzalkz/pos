"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Download, Calendar, Loader2 } from "lucide-react"

// Interfaces
interface SaleTransaction {
  id: string; sale_number: string; total_amount: number; created_at: string;
  customers: { name: string } | null;
}
interface ReportMetrics {
  totalRevenue: number; totalProfit: number; totalOrders: number;
}
interface DailyData {
  date: string; revenue: number; profit: number;
}
interface TopProduct {
    name: string; quantity_sold: number; revenue: number; profit: number;
}
interface CompanyProfile {
  company_name: string; address: string; phone: string; email: string;
  website: string; tax_number: string; logo_url: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 })
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    fetchCompanyProfile();
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [dateRange])
  
  const fetchCompanyProfile = async () => { /* ... unchanged ... */ };
  
  const fetchReportData = async () => {
    setLoading(true);
    try {
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('id, total_amount, created_at, customers(name)')
            .gte('created_at', dateRange.startDate)
            .lte('created_at', `${dateRange.endDate}T23:59:59`);

        if (salesError) throw salesError;
        setRecentSales(sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50));
        
        const { data: saleItems, error: itemsError } = await supabase
            .from('sale_items')
            .select('quantity, unit_price, total_price, products(name, cost_price)')
            .in('sale_id', sales.map(s => s.id));

        if (itemsError) throw itemsError;
        
        // Calculate Metrics
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const totalProfit = saleItems.reduce((sum, item) => {
            const cost = item.products?.cost_price || 0;
            const profitPerItem = item.unit_price - cost;
            return sum + (profitPerItem * item.quantity);
        }, 0);
        setMetrics({ totalRevenue, totalProfit, totalOrders: sales.length });

        // Calculate Top Products
        const productMap = new Map<string, TopProduct>();
        saleItems.forEach(item => {
            if (!item.products) return;
            const name = item.products.name;
            const existing = productMap.get(name) || { name, quantity_sold: 0, revenue: 0, profit: 0 };
            existing.quantity_sold += item.quantity;
            existing.revenue += item.total_price;
            const cost = item.products.cost_price || 0;
            existing.profit += (item.unit_price - cost) * item.quantity;
            productMap.set(name, existing);
        });
        const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopProducts(sortedProducts);
        
    } catch(error) {
        console.error("Error fetching report data:", error);
    } finally {
        setLoading(false);
    }
  }

  const handleDateFilterChange = (filter: 'today' | 'week' | 'month') => { /* ... unchanged ... */ };
  const exportToCsv = (filename: string, data: any[]) => { /* ... unchanged ... */ };
  const reprintReceipt = async (sale: SaleTransaction) => { /* ... unchanged ... */ };
  const printReceipt = (sale: any, items: any[]) => { /* ... unchanged ... */ }
  
  if (loading) { /* ... loading component ... */ }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white p-4 border-b flex justify-between items-center">
        {/* ... header JSX unchanged ... */}
      </header>
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>{/* Total Revenue */}</Card>
            <Card>{/* Total Profit */}</Card>
            <Card>{/* Total Orders */}</Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
                <CardHeader><CardTitle>Top 5 Selling Products</CardTitle></CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topProducts} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 12}} interval={0} />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} />
                            <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            {/* You can add another chart here if you wish, like Sales Trend */}
        </div>
        
        <Card>
            <CardHeader>{/* Recent Sales Header */}</CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        {/* ... table unchanged ... */}
                        <tbody>
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    {/* ... table rows unchanged ... */}
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
