"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DollarSign, BarChart, Users, Tag, Warehouse, TrendingUp, Sun, AlertTriangle } from 'lucide-react'

// Import the first report component
import SalesReport from "@/components/reports/SalesReport"

// Create placeholder components for your future reports
const PlaceholderReport = ({ name }: { name: string }) => (
  <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg bg-white">
    <h2 className="text-xl font-semibold">{name}</h2>
    <p className="text-sm mt-2">This report is not yet built. You can create it in a new component file and add it here.</p>
  </div>
);

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState("sales");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const reportTypes = [
    { key: "sales", label: "Sales Report", icon: DollarSign },
    { key: "product", label: "Product Performance", icon: BarChart },
    { key: "customer", label: "Customer Analysis", icon: Users },
    { key: "category", label: "Category Breakdown", icon: Tag },
    { key: "inventory", label: "Inventory Status", icon: Warehouse },
    { key: "profit", label: "Profit Analysis", icon: TrendingUp },
    { key: "dashboard", label: "Summary Dashboard", icon: Sun },
    { key: "low_stock", label: "Low Stock Alert", icon: AlertTriangle },
  ]

  const renderReport = () => {
    switch(activeReport) {
      case "sales":
        return <SalesReport startDate={dateRange.startDate} endDate={dateRange.endDate} />
      // You will add more cases here as you build other reports
      default:
        return <PlaceholderReport name={reportTypes.find(r => r.key === activeReport)?.label || 'Report'} />
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      <header className="bg-white p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Start Date:</span>
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} />
            <span className="text-sm font-medium">End Date:</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} />
          </div>
        </div>
        <div className="flex space-x-1 overflow-x-auto pb-2">
          {reportTypes.map(report => (
            <Button
              key={report.key}
              variant={activeReport === report.key ? "default" : "outline"}
              onClick={() => setActiveReport(report.key)}
              className="shrink-0"
            >
              <report.icon className="w-4 h-4 mr-2" />
              {report.label}
            </Button>
          ))}
        </div>
      </header>
      <main className="flex-1 p-6 overflow-y-auto">
        {renderReport()}
      </main>
    </div>
  )
}
