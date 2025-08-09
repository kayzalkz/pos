"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { 
    Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, 
    User, ShoppingCart, Image as ImageIcon 
} from "lucide-react"

// Interfaces to match your database schema
interface Category {
    id: string;
    name: string;
}

interface Product {
  id: string
  name: string
  sku: string
  selling_price: number
  stock_quantity: number
  image_url?: string;
  category_id: string;
  categories: {
      name: string;
  }
}

interface Customer {
  id: string
  name: string
  phone: string
  credit_balance: number
}

interface CartItem {
  product: Product
  quantity: number
  total: number
}

export default function POSSalesForm() {
    // State variables
    const { user } = useAuth()
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [paymentMethod, setPaymentMethod] = useState("cash")
    const [paidAmount, setPaidAmount] = useState("")
    const [kbzPhoneNumber, setKbzPhoneNumber] = useState("")
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const isAdmin = user?.role === "admin"
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)

    // Effects
    useEffect(() => {
        fetchProducts()
        fetchCustomers()
        fetchCategories()
    }, [])
    
    useEffect(() => {
        if (paymentMethod === "cash" || paymentMethod === "kbz") {
            setPaidAmount(totalAmount.toString())
        } else if (paymentMethod === "credit") {
            setPaidAmount("0")
        }
    }, [paymentMethod, totalAmount])

    // Data Fetching Functions
    const fetchProducts = async () => {
        const { data } = await supabase
        .from("products")
        .select(`
            *,
            categories (name)
        `)
        .eq('is_active', true)
        .gt("stock_quantity", 0)
        .order("name");
        if (data) setProducts(data as Product[])
    }

    const fetchCategories = async () => {
        const { data } = await supabase
            .from("categories")
            .select("id, name")
            .eq('is_active', true)
            .order('name');
        if (data) setCategories(data);
    }

    const fetchCustomers = async () => {
        const { data } = await supabase.from("customers").select("*").order("name")
        if (data) setCustomers(data)
    }

    // Filtering Logic
    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Cart Handlers
    const addToCart = (product: Product) => {
        const existingItem = cart.find((item) => item.product.id === product.id)
        if (existingItem) {
            if (existingItem.quantity < product.stock_quantity) {
                setCart(cart.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.selling_price }
                        : item
                ));
            }
        } else {
            setCart([...cart, { product, quantity: 1, total: product.selling_price }]);
        }
    }

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId)
        } else {
            setCart(cart.map((item) =>
                item.product.id === productId
                    ? { ...item, quantity: newQuantity, total: newQuantity * item.product.selling_price }
                    : item
            ));
        }
    }
    
    const removeFromCart = (productId: string) => {
        setCart(cart.filter((item) => item.product.id !== productId))
    }

    // Sale validation and processing
    const paidAmountNum = Number.parseFloat(paidAmount) || 0
    const changeAmount = paidAmountNum > totalAmount ? paidAmountNum - totalAmount : 0

    const canCompleteSale = () => {
        if (cart.length === 0) return false;
        if (paymentMethod === "credit") {
            if (!selectedCustomer || paidAmountNum > totalAmount) return false;
            return true;
        }
        if (paidAmountNum < totalAmount) return false;
        if (paymentMethod === "kbz" && !kbzPhoneNumber) return false;
        return true;
    }

    // ==========================================================
    // RESTORED 'processSale' FUNCTION
    // ==========================================================
    const processSale = async () => {
        if (!canCompleteSale()) return;

        if (!isAdmin) {
            alert("Only administrators can complete sales");
            return;
        }

        setLoading(true);

        try {
            const saleNumber = `SALE-${Date.now()}`;
            const { data: saleData, error: saleError } = await supabase
                .from("sales")
                .insert({
                    sale_number: saleNumber,
                    customer_id: selectedCustomer?.id,
                    total_amount: totalAmount,
                    paid_amount: paidAmountNum,
                    change_amount: changeAmount,
                    payment_method: paymentMethod,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (saleError) throw saleError;

            const saleItems = cart.map((item) => ({
                sale_id: saleData.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.selling_price,
                total_price: item.total,
            }));
            await supabase.from("sale_items").insert(saleItems);

            for (const item of cart) {
                await supabase
                    .from("products")
                    .update({
                        stock_quantity: item.product.stock_quantity - item.quantity,
                    })
                    .eq("id", item.product.id);
            }

            if (selectedCustomer) {
                const { data: customerData } = await supabase
                    .from("customers")
                    .select("credit_balance")
                    .eq("id", selectedCustomer.id)
                    .single();
                
                let newBalance = customerData?.credit_balance ?? 0;

                if (paymentMethod === "credit") {
                    const creditUsed = totalAmount - paidAmountNum;
                    if (creditUsed > 0) {
                        await supabase.from("customer_credits").insert({
                            customer_id: selectedCustomer.id,
                            amount: creditUsed,
                            type: "debit",
                            description: `Credit sale: ${saleNumber}`,
                            sale_id: saleData.id,
                        });
                        newBalance += creditUsed;
                    }
                }
                
                await supabase
                    .from("customers")
                    .update({ credit_balance: newBalance })
                    .eq("id", selectedCustomer.id);
            }

            printReceipt(saleData, cart);

            setCart([]);
            setPaidAmount("");
            setKbzPhoneNumber("");
            setSelectedCustomer(null);
            fetchProducts();
            fetchCustomers();
        } catch (error) {
            console.error("Error processing sale:", error);
            alert("An error occurred while processing the sale.");
        } finally {
            setLoading(false);
        }
    };
    
    // ==========================================================
    // RESTORED 'printReceipt' FUNCTION
    // ==========================================================
    const printReceipt = (sale: any, items: CartItem[]) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        // Note: You would fetch companyProfile in a real app to display here
        const receiptHTML = `
        <html>
          <head>
            <title>Receipt - ${sale.sale_number}</title>
            <style>
              body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 10px; }
              /* Add other receipt styles here */
            </style>
          </head>
          <body>
            <h2>Receipt</h2>
            <p>Sale No: ${sale.sale_number}</p>
            <p>Date: ${new Date(sale.created_at).toLocaleString()}</p>
            <hr/>
            <h4>Items:</h4>
            <ul>
              ${items.map(item => `<li>${item.product.name} - ${item.quantity} x ${item.product.selling_price.toLocaleString()} = ${item.total.toLocaleString()}</li>`).join('')}
            </ul>
            <hr/>
            <p><strong>Total: ${sale.total_amount.toLocaleString()} MMK</strong></p>
            <p>Paid: ${sale.paid_amount.toLocaleString()} MMK</p>
            <p>Change: ${sale.change_amount.toLocaleString()} MMK</p>
            <script>
              window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
            </script>
          </body>
        </html>
        `;

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    }
    
    // Modern UI JSX
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Left Panel: Product Selection */}
            <div className="w-3/5 p-4 flex flex-col">
                <header className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 text-md bg-white rounded-full shadow-sm"
                        />
                    </div>
                    <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
                        <Button 
                            variant={selectedCategory === 'all' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategory('all')}
                        >
                            All Products
                        </Button>
                        {categories.map(category => (
                            <Button
                                key={category.id}
                                variant={selectedCategory === category.id ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(category.id)}
                            >
                                {category.name}
                            </Button>
                        ))}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => (
                            <Card 
                                key={product.id} 
                                className="cursor-pointer group hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden" 
                                onClick={() => addToCart(product)}
                            >
                                <CardContent className="p-0">
                                    <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
                                        ) : (
                                            <ImageIcon className="h-10 w-10 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs text-emerald-600 font-semibold">{product.categories?.name || 'Uncategorized'}</p>
                                        <h4 className="font-bold text-sm text-gray-800 truncate">{product.name}</h4>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="font-black text-lg text-gray-900">{product.selling_price.toLocaleString()}</span>
                                            <Badge variant={product.stock_quantity < 10 ? "destructive" : "secondary"}>
                                                {product.stock_quantity}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel: Shopping Cart & Checkout */}
            <div className="w-2/5 bg-white p-6 flex flex-col shadow-lg">
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center space-x-3 mb-4">
                        <User className="h-6 w-6 text-gray-500" />
                        <Select
                            onValueChange={(value) => {
                                const customer = customers.find((c) => c.id === value)
                                setSelectedCustomer(customer || null)
                            }}
                            value={selectedCustomer?.id || ""}
                        >
                            <SelectTrigger className="h-12 text-md">
                                <SelectValue placeholder="Walk-in Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name} {customer.credit_balance > 0 && `(Owes: ${customer.credit_balance.toLocaleString()} MMK)`}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <h2 className="text-xl font-bold border-b pb-2 mb-4 text-gray-700">Current Order</h2>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <ShoppingCart className="h-16 w-16 mb-2"/>
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.product.id} className="flex items-center">
                                    <img src={item.product.image_url || 'https://placehold.co/64'} alt={item.product.name} className="w-16 h-16 object-cover rounded-md mr-4"/>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800">{item.product.name}</p>
                                        <p className="text-sm text-gray-500">{item.product.selling_price.toLocaleString()} MMK</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Button size="icon" className="h-7 w-7" variant="outline" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                        <span className="w-5 text-center text-md font-medium">{item.quantity}</span>
                                        <Button size="icon" className="h-7 w-7" variant="outline" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                    <p className="w-24 text-right font-bold text-gray-800">{item.total.toLocaleString()}</p>
                                    <Button size="icon" variant="ghost" className="ml-2 h-7 w-7" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" /></Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-auto border-t pt-4 space-y-4">
                    <div className="space-y-2 text-md">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span className="font-medium">{totalAmount.toLocaleString()} MMK</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl border-t pt-2">
                            <span>Total</span>
                            <span>{totalAmount.toLocaleString()} MMK</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <Button size="lg" variant={paymentMethod === "cash" ? "default" : "outline"} onClick={() => setPaymentMethod("cash")}> <Banknote className="h-5 w-5 mr-2" /> Cash </Button>
                            <Button size="lg" variant={paymentMethod === "kbz" ? "default" : "outline"} onClick={() => setPaymentMethod("kbz")}> <Smartphone className="h-5 w-5 mr-2" /> KBZ Pay </Button>
                            <Button size="lg" variant={paymentMethod === "credit" ? "default" : "outline"} onClick={() => setPaymentMethod("credit")}> <CreditCard className="h-5 w-5 mr-2" /> Credit </Button>
                        </div>
                    </div>
                    
                    <div>
                        <Input
                            type="number"
                            placeholder="Paid Amount"
                            className="h-12 text-md"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            readOnly={paymentMethod === 'cash' || paymentMethod === 'kbz'}
                        />
                         {changeAmount > 0 && paymentMethod !== 'credit' && (
                            <p className="text-right text-green-600 mt-1 font-medium">Change: {changeAmount.toLocaleString()} MMK</p>
                        )}
                    </div>

                    <Button 
                        onClick={processSale} 
                        disabled={!canCompleteSale() || loading} 
                        className="w-full h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                        {loading ? "Processing..." : "Complete Sale"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
