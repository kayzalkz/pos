"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { 
    Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, 
    User, ShoppingCart, Image as ImageIcon, History
} from "lucide-react"

// Interfaces
interface SaleTransaction {
  id: string;
  sale_number: string;
  total_amount: number;
  created_at: string;
  customers: { name: string } | null;
}
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
interface CompanyProfile {
  company_name: string
  address: string
  phone: string
  email: string
  website: string
  tax_number: string
  logo_url: string
}

export default function POSSalesForm() {
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
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
    const [creditApplied, setCreditApplied] = useState(0)
    const [recentSales, setRecentSales] = useState<SaleTransaction[]>([])

    const isAdmin = user?.role?.trim().toLowerCase() === "admin"
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)
    const amountDue = totalAmount - creditApplied;
    const paidAmountNum = Number.parseFloat(paidAmount) || 0
    const changeAmount = paidAmountNum > amountDue ? paidAmountNum - amountDue : 0

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchCategories();
        fetchCompanyProfile();
        fetchRecentSales();
    }, [])
    
    useEffect(() => {
        if (selectedCustomer && selectedCustomer.credit_balance > 0) {
            const creditToApply = Math.min(totalAmount, selectedCustomer.credit_balance);
            setCreditApplied(creditToApply);
        } else {
            setCreditApplied(0);
        }
    }, [selectedCustomer, totalAmount]);
    
    useEffect(() => {
        if (paymentMethod === "cash" || paymentMethod === "kbz") {
            setPaidAmount(amountDue.toFixed(2))
        } else if (paymentMethod === "credit") {
            setPaidAmount("0")
        }
    }, [paymentMethod, amountDue]);

    const fetchCompanyProfile = async () => {
        const { data } = await supabase.from("company_profile").select("*").single();
        if (data) setCompanyProfile(data as CompanyProfile);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from("products").select(`*, categories (name)`).eq('is_active', true).gt("stock_quantity", 0).order("name");
        if (data) setProducts(data as Product[])
    }

    const fetchCategories = async () => {
        const { data } = await supabase.from("categories").select("id, name").eq('is_active', true).order('name');
        if (data) setCategories(data);
    }

    const fetchCustomers = async () => {
        const { data } = await supabase.from("customers").select("*").order("name")
        if (data) setCustomers(data)
    }

    const fetchRecentSales = async () => {
        const { data, error } = await supabase
            .from('sales')
            .select('id, sale_number, total_amount, created_at, customers(name)')
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) console.error("Error fetching recent sales:", error);
        else setRecentSales(data || []);
    }

    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

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

    const canCompleteSale = () => {
        if (cart.length === 0) return false;
        if (paymentMethod === "credit") {
            if (!selectedCustomer || paidAmountNum > amountDue) return false;
            return true;
        }
        if (paymentMethod === 'cash' || paymentMethod === 'kbz') {
            if (paidAmountNum < amountDue) return false;
            if (paidAmountNum > amountDue && !selectedCustomer) return false;
            if (paymentMethod === "kbz" && !kbzPhoneNumber) return false;
        }
        return true;
    }

    const processSale = async () => {
        if (!canCompleteSale()) return;
        if (!isAdmin) {
            alert("Only administrators can complete sales");
            return;
        }
        setLoading(true);
        try {
            const saleNumber = `SALE-${Date.now()}`;
            const { data: saleData, error: saleError } = await supabase.from("sales").insert({
                sale_number: saleNumber,
                customer_id: selectedCustomer?.id,
                total_amount: totalAmount,
                paid_amount: paidAmountNum,
                change_amount: changeAmount,
                payment_method: paymentMethod,
                created_by: user?.id,
            }).select('*, customers(name)').single();

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
                await supabase.from("products").update({ stock_quantity: item.product.stock_quantity - item.quantity }).eq("id", item.product.id);
            }

            let finalCustomerBalance: number | undefined;
            if (selectedCustomer) {
                const { data: customerData } = await supabase.from("customers").select("credit_balance").eq("id", selectedCustomer.id).single();
                let newBalance = customerData?.credit_balance ?? 0;

                if (creditApplied > 0) {
                    await supabase.from("customer_credits").insert({
                        customer_id: selectedCustomer.id,
                        amount: creditApplied,
                        type: "debit",
                        description: `Credit applied to sale ${saleNumber}`,
                        sale_id: saleData.id,
                    });
                    newBalance -= creditApplied;
                }

                if (paymentMethod === "credit") {
                    const debtAdded = amountDue - paidAmountNum;
                    if (debtAdded > 0) {
                        await supabase.from("customer_credits").insert({
                            customer_id: selectedCustomer.id,
                            amount: debtAdded,
                            type: "debit",
                            description: `Debt from sale ${saleNumber}`,
                            sale_id: saleData.id,
                        });
                        newBalance -= debtAdded;
                    }
                }

                if (changeAmount > 0 && paymentMethod !== 'credit') {
                    await supabase.from("customer_credits").insert({
                        customer_id: selectedCustomer.id,
                        amount: changeAmount,
                        type: 'credit',
                        description: `Overpayment/change from sale ${saleNumber}`,
                        sale_id: saleData.id,
                    });
                    newBalance += changeAmount;
                }

                if (newBalance !== (customerData?.credit_balance ?? 0)) {
                    await supabase.from("customers").update({ credit_balance: newBalance }).eq("id", selectedCustomer.id);
                }
                finalCustomerBalance = newBalance;
            }

            printReceipt(saleData, cart);

            setProducts(currentProducts => {
                const productsMap = new Map(currentProducts.map(p => [p.id, { ...p }]));
                cart.forEach(cartItem => {
                    const product = productsMap.get(cartItem.product.id);
                    if (product) {
                        product.stock_quantity -= cartItem.quantity;
                    }
                });
                return Array.from(productsMap.values()).filter(p => p.stock_quantity > 0);
            });

            if (selectedCustomer && finalCustomerBalance !== undefined) {
                setCustomers(currentCustomers => 
                    currentCustomers.map(c => 
                        c.id === selectedCustomer.id 
                            ? { ...c, credit_balance: finalCustomerBalance } 
                            : c
                    )
                );
            }
            
            setCart([]);
            setPaidAmount("");
            setKbzPhoneNumber("");
            setSelectedCustomer(null);
            
            await fetchRecentSales();

        } catch (error) {
            console.error("Error processing sale:", error);
            alert("An error occurred while processing the sale.");
        } finally {
            setLoading(false);
        }
    };
    
    const printReceipt = (sale: any, items: CartItem[]) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Please disable your pop-up blocker to print receipts.");
            return;
        }
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
                    .total-line { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    .total-line.grand-total { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 5px; margin-top: 8px; }
                    .payment-info { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; }
                    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 10px; }
                    .thank-you { font-weight: bold; margin-bottom: 5px; }
                    @media print { body { margin: 0; padding: 5px; } }
                </style>
            </head>
            <body>
                ${companyProfile?.logo_url ? `<div class="logo-container"><img src="${companyProfile.logo_url}" alt="Company Logo"></div>` : ""}
                <div class="receipt-header">
                    <div class="company-name">${companyProfile?.company_name || "POS SYSTEM"}</div>
                    <div class="company-info">
                        ${companyProfile?.address ? `${companyProfile.address}<br>` : ""}
                        ${companyProfile?.phone ? `Tel: ${companyProfile.phone}<br>` : ""}
                        ${companyProfile?.email ? `Email: ${companyProfile.email}<br>` : ""}
                        ${companyProfile?.tax_number ? `Tax No: ${companyProfile.tax_number}` : ""}
                    </div>
                </div>
                <div class="sale-info">
                    <div><span>Voucher No:</span><span>${sale.sale_number}</span></div>
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
                    <div class="total-line grand-total">
                        <span>TOTAL:</span>
                        <span>${totalAmount.toLocaleString()} MMK</span>
                    </div>
                </div>
                <div class="payment-info">
                    <div class="total-line">
                        <span>Payment:</span>
                        <span>${sale.payment_method.toUpperCase()}</span>
                    </div>
                    ${sale.payment_method === "kbz" && kbzPhoneNumber ? `<div class="total-line"><span>KBZ Phone:</span><span>${kbzPhoneNumber}</span></div>` : ""}
                    <div class="total-line">
                        <span>Paid:</span>
                        <span>${sale.paid_amount.toLocaleString()} MMK</span>
                    </div>
                    ${sale.change_amount > 0 ? `<div class="total-line"><span>Change:</span><span>${sale.change_amount.toLocaleString()} MMK</span></div>` : ""}
                </div>
                <div class="footer">
                    <div class="thank-you">THANK YOU!</div>
                </div>
                <script>
                    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
                </script>
            </body>
        </html>`;
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
    }
    
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <div className="w-3/5 p-4 flex flex-col">
                <header className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 h-14 text-md bg-white rounded-full shadow-sm"/>
                    </div>
                    <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
                        <Button variant={selectedCategory === 'all' ? 'default' : 'outline'} onClick={() => setSelectedCategory('all')}>All Products</Button>
                        {categories.map(category => (
                            <Button key={category.id} variant={selectedCategory === category.id ? 'default' : 'outline'} onClick={() => setSelectedCategory(category.id)}>{category.name}</Button>
                        ))}
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="cursor-pointer group hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden" onClick={() => addToCart(product)}>
                                <CardContent className="p-0">
                                    <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                                        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/> : <ImageIcon className="h-10 w-10 text-gray-400" />}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs text-emerald-600 font-semibold">{product.categories?.name || 'Uncategorized'}</p>
                                        <h4 className="font-bold text-sm text-gray-800 truncate">{product.name}</h4>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="font-black text-lg text-gray-900">{product.selling_price.toLocaleString()}</span>
                                            <Badge variant={product.stock_quantity < 10 ? "destructive" : "secondary"}>{product.stock_quantity}</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="w-2/5 bg-white p-6 flex flex-col shadow-lg">
                <Tabs defaultValue="order" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="order"><ShoppingCart className="w-4 h-4 mr-2"/> Current Order</TabsTrigger>
                        <TabsTrigger value="recent"><History className="w-4 h-4 mr-2"/> Recent Sales</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="order" className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center space-x-3 my-4">
                                <User className="h-6 w-6 text-gray-500" />
                                <Select onValueChange={(value) => {const c = customers.find(c=>c.id===value); setSelectedCustomer(c||null)}} value={selectedCustomer?.id || ""}>
                                    <SelectTrigger className="h-12 text-md"><SelectValue placeholder="Walk-in Customer" /></SelectTrigger>
                                    <SelectContent>
                                        {customers.map((customer) => (
                                            <SelectItem key={customer.id} value={customer.id}>
                                                {customer.name} {customer.credit_balance > 0 ? `(Credit: ${customer.credit_balance.toLocaleString()} MMK)` : customer.credit_balance < 0 ? `(Owes: ${Math.abs(customer.credit_balance).toLocaleString()} MMK)` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <h2 className="text-xl font-bold border-b pb-2 mb-4 text-gray-700">Shopping Cart</h2>
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <ShoppingCart className="h-16 w-16 mb-2"/><p>Cart is empty</p>
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
                                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium">{totalAmount.toLocaleString()} MMK</span></div>
                                {creditApplied > 0 && (<div className="flex justify-between text-blue-600"><span>Credit Applied</span><span className="font-medium">- {creditApplied.toLocaleString()} MMK</span></div>)}
                                <div className="flex justify-between font-bold text-xl border-t pt-2"><span>Amount Due</span><span>{amountDue.toLocaleString()} MMK</span></div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Button size="lg" variant={paymentMethod === "cash" ? "default" : "outline"} onClick={() => setPaymentMethod("cash")}> <Banknote className="h-5 w-5 mr-2" /> Cash </Button>
                                <Button size="lg" variant={paymentMethod === "kbz" ? "default" : "outline"} onClick={() => setPaymentMethod("kbz")}> <Smartphone className="h-5 w-5 mr-2" /> KBZ Pay </Button>
                                <Button size="lg" variant={paymentMethod === "credit" ? "default" : "outline"} onClick={() => setPaymentMethod("credit")}> <CreditCard className="h-5 w-5 mr-2" /> Credit </Button>
                            </div>
                            {paymentMethod === 'kbz' && (<div><label className="text-sm font-medium">KBZ Pay Phone Number</label><Input type="tel" placeholder="09xxxxxxxxx" value={kbzPhoneNumber} onChange={(e) => setKbzPhoneNumber(e.target.value)} required /></div>)}
                            <div>
                                <Input type="number" placeholder="Paid Amount" className="h-12 text-md" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                                {paidAmountNum > amountDue && !selectedCustomer && (paymentMethod === 'cash' || paymentMethod === 'kbz') && (<p className="text-sm text-red-600 mt-1">Please select a customer to credit the change amount.</p>)}
                                {changeAmount > 0 && (<p className="text-right text-green-600 mt-1 font-medium">{selectedCustomer ? 'Credit Change' : 'Change Due'}: {changeAmount.toLocaleString()} MMK</p>)}
                            </div>
                            <Button onClick={processSale} disabled={!canCompleteSale() || loading} className="w-full h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">{loading ? "Processing..." : "Complete Sale"}</Button>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="recent" className="flex-1 overflow-y-auto">
                        <div className="space-y-3 pt-4">
                            {recentSales.length > 0 ? (
                                recentSales.map(sale => (
                                    <Card key={sale.id} className="p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{sale.sale_number}</p>
                                                <p className="text-sm text-gray-600">{sale.customers?.name || 'Walk-in Customer'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600">{sale.total_amount.toLocaleString()} MMK</p>
                                                <p className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 pt-10">No recent sales found.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
