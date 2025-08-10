import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { 
    Download, 
    Loader2, 
    DollarSign, 
    TrendingUp,
    Package,
    Users,
    Calendar as CalendarIcon,
    FileText,
    Printer
} from "lucide-react"

// Interfaces
interface SaleTransaction {
  id: string
  sale_number: string
  total_amount: number
  paid_amount: number
  created_at: string
  customers: { name: string } | null
  sale_items: {
      quantity: number
      products: {
          id: string
          name: string
          cost: number
          stock_quantity: number
      }
  }[]
}

interface ProductPerformance {
    productId: string
    name: string
    category: string | null
    quantity: number
    revenue: number
    cost: number
    profit: number
}

interface StockMovement {
    productId: string
    name: string
    sku: string
    initialStock: number
    sold: number
    currentStock: number
    revenue: number
}

interface ReportMetrics {
  totalRevenue: number
  totalProfit: number
  totalPaid: number
  totalOutstanding: number
  profitMargin: number
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })

  const [metrics, setMetrics] = useState<ReportMetrics>({ totalRevenue: 0, totalProfit: 0, totalPaid: 0, totalOutstanding: 0, profitMargin: 0 });
  const [salesData, setSalesData] = useState<SaleTransaction[]>([]);
  const [productPerformanceData, setProductPerformanceData] = useState<ProductPerformance[]>([]);
  const [stockMovementData, setStockMovementData] = useState<StockMovement[]>([]);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    setLoading(true)
    
    // Fetch all sales and related data within the date range
    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        id,
        sale_number,
        total_amount,
        paid_amount,
        created_at,
        customers (name),
        sale_items (
          quantity,
          products (id, name, cost, stock_quantity)
        )
      `)
      .gte("created_at", dateRange.startDate)
      .lte("created_at", `${dateRange.endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sales data:", error)
      setLoading(false)
      return
    }
    
    setSalesData(sales as SaleTransaction[]);
    calculateAllMetrics(sales as SaleTransaction[]);

    setLoading(false)
  }

  const calculateAllMetrics = (sales: SaleTransaction[]) => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalCost = 0;
    const productSales: { [key: string]: ProductPerformance } = {};
    const productStock: { [key: string]: { productId: string, sold: number, initialStock: number, name: string, sku: string, revenue: number, currentStock: number } } = {};

    sales.forEach(sale => {
        totalRevenue += sale.total_amount;
        totalPaid += sale.paid_amount;
        
        sale.sale_items.forEach(item => {
            const product = item.products;
            if (!product) return;

            const saleCost = (product.cost || 0) * item.quantity;
            totalCost += saleCost;
            
            // For Product Performance
            if (!productSales[product.id]) {
                productSales[product.id] = { 
                    productId: product.id, 
                    name: product.name, 
                    category: null, // Assuming category needs another join
                    quantity: 0, 
                    revenue: 0,
                    cost: 0,
                    profit: 0 
                };
            }
            const itemRevenue = item.quantity * (sale.total_amount / sale.sale_items.reduce((acc, i) => acc + i.quantity, 0)); // Approximate revenue per item
            productSales[product.id].quantity += item.quantity;
            productSales[product.id].revenue += itemRevenue;
            productSales[product.id].cost += saleCost;
            productSales[product.id].profit += (itemRevenue - saleCost);

            // For Stock Movement
            if (!productStock[product.id]) {
                 productStock[product.id] = { 
                    productId: product.id,
                    sold: 0, 
                    initialStock: product.stock_quantity + item.quantity, // Approximation
                    name: product.name,
                    sku: '', // Assuming SKU needs to be fetched
                    revenue: 0,
                    currentStock: product.stock_quantity,
                };
            }
            productStock[product.id].sold += item.quantity;
            productStock[product.id].revenue += itemRevenue;
        });
    });

    const totalProfit = totalRevenue - totalCost;
    const totalOutstanding = totalRevenue - totalPaid;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    setMetrics({ totalRevenue, totalProfit, totalPaid, totalOutstanding, profitMargin });
    
    const perfData = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
    setProductPerformanceData(perfData);

    const stockData = Object.values(productStock);
    setStockMovementData(stockData);
  };

  const exportToCsv = (filename: string, data: any[]) => {
    if (!data || data.length === 0) {
      console.warn("No data to export.");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header])).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToTxt = (filename: string, data: any[]) => {
     if (!data || data.length === 0) {
      console.warn("No data to export.");
      return;
    }
    const headers = Object.keys(data[0]);
    let textContent = headers.join('\t\t') + '\n';
    textContent += '-'.repeat(headers.length * 15) + '\n';
    data.forEach(row => {
        textContent += headers.map(header => `${row[header]}`.padEnd(15)).join('\t') + '\n';
    });
    
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const renderContent = () => {
    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading reports...</span>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 bg-gray-50">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalRevenue.toLocaleString()} MMK</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalProfit.toLocaleString()} MMK</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.profitMargin.toFixed(2)}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.totalOutstanding.toLocaleString()} MMK</div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Reports Tabs */}
            <Tabs defaultValue="sales" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 no-print">
                    <TabsTrigger value="sales">Sales Report</TabsTrigger>
                    <TabsTrigger value="stock">Stock Report</TabsTrigger>
                    <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
                    <TabsTrigger value="products">Product Performance</TabsTrigger>
                </TabsList>
                
                {/* Sales Report */}
                <TabsContent value="sales">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Sales Transactions</CardTitle>
                            <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={() => exportToTxt('sales_report', salesData)}><FileText className="w-4 h-4 mr-2" /> TXT</Button>
                                <Button variant="outline" size="sm" onClick={() => exportToCsv('sales_report', salesData)}><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Sale No.</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Paid</TableHead>
                                        <TableHead className="text-right">Outstanding</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {salesData.map(sale => (
                                        <TableRow key={sale.id}>
                                            <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{sale.sale_number}</TableCell>
                                            <TableCell>{sale.customers?.name || 'Walk-in'}</TableCell>
                                            <TableCell className="text-right">{sale.total_amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{sale.paid_amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-red-500">{(sale.total_amount - sale.paid_amount).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Stock Report */}
                <TabsContent value="stock">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Stock Movement</CardTitle>
                            <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={() => exportToTxt('stock_movement', stockMovementData)}><FileText className="w-4 h-4 mr-2" /> TXT</Button>
                                <Button variant="outline" size="sm" onClick={() => exportToCsv('stock_movement', stockMovementData)}><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Initial Stock</TableHead>
                                        <TableHead>Sold</TableHead>
                                        <TableHead>Current Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockMovementData.map(item => (
                                        <TableRow key={item.productId}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.initialStock}</TableCell>
                                            <TableCell>{item.sold}</TableCell>
                                            <TableCell>{item.currentStock}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.currentStock < 10 ? 'destructive' : 'default'}>
                                                    {item.currentStock < 10 ? 'LOW STOCK' : 'IN STOCK'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Profit & Loss Report */}
                <TabsContent value="profit">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Profit & Loss by Product</CardTitle>
                             <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={() => exportToTxt('profit_loss', productPerformanceData)}><FileText className="w-4 h-4 mr-2" /> TXT</Button>
                                <Button variant="outline" size="sm" onClick={() => exportToCsv('profit_loss', productPerformanceData)}><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Qty Sold</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Cost</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productPerformanceData.map(item => (
                                        <TableRow key={item.productId}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-right">{item.revenue.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.cost.toLocaleString()}</TableCell>
                                            <TableCell className={`text-right font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.profit.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Product Performance */}
                <TabsContent value="products">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Product Performance</CardTitle>
                             <div className="flex gap-2 no-print">
                                <Button variant="outline" size="sm" onClick={() => exportToTxt('product_performance', productPerformanceData)}><FileText className="w-4 h-4 mr-2" /> TXT</Button>
                                <Button variant="outline" size="sm" onClick={() => exportToCsv('product_performance', productPerformanceData)}><Download className="w-4 h-4 mr-2" /> CSV</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Qty Sold</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productPerformanceData.map((item, index) => (
                                        <TableRow key={item.productId}>
                                            <TableCell className="font-bold">#{index + 1}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell className="text-right">{item.revenue.toLocaleString()}</TableCell>
                                            <TableCell className={`text-right ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.profit.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100 p-4 sm:p-6">
        <style>{`
            @media print {
                body {
                    background-color: white;
                }
                .no-print {
                    display: none !important;
                }
                main {
                    padding: 0;
                    margin: 0;
                    box-shadow: none;
                    border: none;
                }
                .printable-area {
                    padding: 0;
                    margin: 0;
                }
            }
        `}</style>
        {/* Main Header */}
        <header className="mb-6 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Reports & Analytics</h1>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="bg-white" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" /> Print
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><CalendarIcon className="w-5 h-5" />Date Range Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="dateFrom">From Date</Label>
                            <Input
                                id="dateFrom"
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="dateTo">To Date</Label>
                            <Input
                                id="dateTo"
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-white p-6 rounded-lg shadow-sm printable-area">
            {renderContent()}
        </main>
    </div>
  )
}
