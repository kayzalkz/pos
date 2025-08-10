import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface TopProduct {
  name: string;
  quantity_sold: number;
  revenue: number;
  profit: number;
}

export default function DailySalesReport() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalProfit: 0, totalOrders: 0 });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; profit: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(), "yyyy-MM-01"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange, topN]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`
          id, sale_number, total_amount, created_at, payment_method, paid_amount, change_amount, customers(name),
          sale_items( quantity, unit_price, total_price, products(name, cost_price) )
        `)
        .gte("created_at", dateRange.startDate)
        .lte("created_at", `${dateRange.endDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      const allItems = sales.flatMap((s) => s.sale_items);

      // 1. Metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalProfit = allItems.reduce((sum, item: any) => {
        const cost = item.products?.cost_price || 0;
        return sum + (item.unit_price - cost) * item.quantity;
      }, 0);
      setMetrics({ totalRevenue, totalProfit, totalOrders: sales.length });

      // 2. Top Products
      const productMap = new Map<string, TopProduct>();
      allItems.forEach((item: any) => {
        if (!item.products) return;
        const name = item.products.name;
        const existing = productMap.get(name) || { name, quantity_sold: 0, revenue: 0, profit: 0 };
        existing.quantity_sold += item.quantity;
        existing.revenue += item.total_price;
        existing.profit += (item.unit_price - (item.products.cost_price || 0)) * item.quantity;
        productMap.set(name, existing);
      });
      const sortedProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, topN);
      setTopProducts(sortedProducts);

      // 3. Daily Data
      const dailyMap = new Map<string, { date: string; revenue: number; profit: number }>();
      sales.forEach((sale) => {
        const date = new Date(sale.created_at).toISOString().split("T")[0];
        const revenue = sale.total_amount;
        const profit = sale.sale_items.reduce((sum: number, item: any) => {
          const cost = item.products?.cost_price || 0;
          return sum + (item.unit_price - cost) * item.quantity;
        }, 0);

        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, revenue, profit });
        } else {
          const entry = dailyMap.get(date)!;
          entry.revenue += revenue;
          entry.profit += profit;
        }
      });

      // Fill missing dates
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const filledDailyData: { date: string; revenue: number; profit: number }[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        if (dailyMap.has(dateStr)) {
          filledDailyData.push(dailyMap.get(dateStr)!);
        } else {
          filledDailyData.push({ date: dateStr, revenue: 0, profit: 0 });
        }
      }

      setDailyData(filledDailyData);

      // 4. Recent Sales
      setRecentSales(sales.slice(0, 50));
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Daily Sales & Profit Report</h1>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-600">Total Revenue</p>
          <p className="text-lg font-bold">${metrics.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-600">Total Profit</p>
          <p className="text-lg font-bold">${metrics.totalProfit.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-600">Total Orders</p>
          <p className="text-lg font-bold">{metrics.totalOrders}</p>
        </div>
      </div>

      {/* Sales & Profit Trend */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-bold mb-2">Sales & Profit Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            <Line type="monotone" dataKey="profit" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-bold mb-2">Top Products</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Product</th>
              <th className="p-2 border">Quantity Sold</th>
              <th className="p-2 border">Revenue</th>
              <th className="p-2 border">Profit</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p, idx) => (
              <tr key={idx}>
                <td className="p-2 border">{p.name}</td>
                <td className="p-2 border">{p.quantity_sold}</td>
                <td className="p-2 border">${p.revenue.toFixed(2)}</td>
                <td className="p-2 border">${p.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Sales */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Recent Sales</h2>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Sale #</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Payment</th>
            </tr>
          </thead>
          <tbody>
            {recentSales.map((sale) => (
              <tr key={sale.id}>
                <td className="p-2 border">{sale.sale_number}</td>
                <td className="p-2 border">{format(new Date(sale.created_at), "yyyy-MM-dd")}</td>
                <td className="p-2 border">{sale.customers?.name || "Walk-in"}</td>
                <td className="p-2 border">${sale.total_amount.toFixed(2)}</td>
                <td className="p-2 border">{sale.payment_method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
