"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Loader2, Download } from "lucide-react"

// Interfaces
interface ReportMetrics { totalRevenue: number; totalProfit: number; totalOrders: number; }
interface TopProduct { name: string; revenue: number; }
interface SaleTransaction { id: string; sale_number: string; total_amount: number; created_at: string; customers: { name: string } | null; }

export default function SalesReport({ startDate, endDate }: { startDate: string, endDate: string }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<SaleTransaction[]>([]);

  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      
      const { data: metricsData, error: metricsError } = await supabase.rpc('get_daily_sales_and_profit', { start_date: startDate, end_date: endDate });
      const { data: topProductsData, error: topProductsError } = await supabase.rpc('get_top_selling_products', { start_date: startDate, end_date: endDate, limit_count: 5 });
      const { data: recentSalesData, error: recentSalesError } = await supabase.from('sales').select('*, customers(name)').gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59`).order('created_at', { ascending: false }).limit(50);

      if (metricsData) {
          const totalRevenue = metricsData.reduce((sum: number, day: any) => sum + (day.total_revenue || 0), 0);
          const totalProfit = metricsData.reduce((sum: number, day: any) => sum + (day.total_profit || 0), 0);
          const totalOrders = metricsData.reduce((sum: number, day: any) => sum + (day.order_count || 0), 0);
          setMetrics({ totalRevenue, totalProfit, totalOrders });
      }
      
      setTopProducts(topProductsData || []);
      setRecentSales(recentSalesData || []);
      setLoading(false);
    }
    fetchSalesData();
  }, [startDate, endDate]);

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block" /></div>
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{metrics.totalRevenue.toLocaleString()} MMK</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Profit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-600">{metrics.totalProfit.toLocaleString()} MMK</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Total Orders</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-purple-600">{metrics.totalOrders}</p></CardContent></Card>
        </div>
        <Card>
            <CardHeader><CardTitle>Top 5 Selling Products by Revenue</CardTitle></CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} interval={0} /><Tooltip formatter={(value: number) => `${value.toLocaleString()} MMK`} /><Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    </ResponsiveContainer>
                </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Recent Sales Transactions</CardTitle></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Sale No.</th>
                                <th className="px-4 py-2 text-left">Customer</th>
                                <th className="px-4 py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td className="px-4 py-2">{new Date(sale.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-2">{sale.sale_number}</td>
                                    <td className="px-4 py-2">{sale.customers?.name || 'Walk-in'}</td>
                                    <td className="px-4 py-2 text-right">{sale.total_amount.toLocaleString()} MMK</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
