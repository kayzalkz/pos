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

// Interfaces
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
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
    const [creditApplied, setCreditApplied] = useState(0)

    const isAdmin = user?.role?.trim().toLowerCase() === "admin"
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)
    const amountDue = totalAmount - creditApplied;
    const paidAmountNum = Number.parseFloat(paidAmount) || 0
    const changeAmount = paidAmountNum > amountDue ? paidAmountNum - amountDue : 0

    // Effects
    useEffect(() => {
        fetchProducts()
        fetchCustomers()
        fetchCategories()
        fetchCompanyProfile()
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

    // Data Fetching Functions
    const fetchCompanyProfile = async () => {
        const { data } = await supabase.from("company_profile").select("*").single();
        if (data) setCompanyProfile(data);
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

    // Cart Handlers and Filtering Logic
    const filteredProducts = products.filter((product) => { /* ... */ });
    const addToCart = (product: Product) => { /* ... */ }
    const updateQuantity = (productId: string, newQuantity: number) => { /* ... */ }
    const removeFromCart = (productId: string) => { /* ... */ }

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
            const { data: saleData } = await supabase.from("sales").insert({
                sale_number: saleNumber, customer_id: selectedCustomer?.id,
                total_amount: totalAmount, paid_amount: paidAmountNum,
                change_amount: changeAmount, payment_method: paymentMethod,
                created_by: user?.id,
            }).select().single();

            const saleItems = cart.map((item) => ({ /* ... */ }));
            await supabase.from("sale_items").insert(saleItems);

            for (const item of cart) {
                await supabase.from("products").update({ stock_quantity: item.product.stock_quantity - item.quantity }).eq("id", item.product.id);
            }

            let finalCustomerBalance: number | undefined;
            if (selectedCustomer) {
                const { data: customerData } = await supabase.from("customers").select("credit_balance").eq("id", selectedCustomer.id).single();
                let newBalance = customerData?.credit_balance ?? 0;

                if (creditApplied > 0) {
                    await supabase.from("customer_credits").insert({ /* ... */ });
                    newBalance -= creditApplied;
                }

                if (paymentMethod === "credit") {
                    const debtAdded = amountDue - paidAmountNum;
                    if (debtAdded > 0) {
                        await supabase.from("customer_credits").insert({ /* ... */ });
                        newBalance -= debtAdded;
                    }
                }

                if (changeAmount > 0 && paymentMethod !== 'credit') {
                    await supabase.from("customer_credits").insert({
                        customer_id: selectedCustomer.id, amount: changeAmount,
                        type: 'credit', description: `Overpayment/change from sale ${saleNumber}`,
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

            // High-performance local state updates
            setProducts(currentProducts => {
                const productsMap = new Map(currentProducts.map(p => [p.id, { ...p }]));
                cart.forEach(cartItem => {
                    const product = productsMap.get(cartItem.product.id);
                    if (product) { product.stock_quantity -= cartItem.quantity; }
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

        } catch (error) {
            console.error("Error processing sale:", error);
            alert("An error occurred while processing the sale.");
        } finally {
            setLoading(false);
        }
    };
    
    const printReceipt = (sale: any, items: CartItem[]) => { /* ... full print function ... */ }
    
    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <div className="w-3/V p-4 flex flex-col">{/* ... Product Panel ... */}</div>
            <div className="w-2/5 bg-white p-6 flex flex-col shadow-lg">
                <div className="flex-1 flex flex-col min-h-0">{/* ... Customer and Cart ... */}</div>
                <div className="mt-auto border-t pt-4 space-y-4">
                    <div className="space-y-2 text-md">{/* ... Totals ... */}</div>
                    <div className="grid grid-cols-3 gap-2">
                        <Button size="lg" variant={paymentMethod === "cash" ? "default" : "outline"} onClick={() => setPaymentMethod("cash")}>Cash</Button>
                        <Button size="lg" variant={paymentMethod === "kbz" ? "default" : "outline"} onClick={() => setPaymentMethod("kbz")}>KBZ Pay</Button>
                        <Button size="lg" variant={paymentMethod === "credit" ? "default" : "outline"} onClick={() => setPaymentMethod("credit")}>Credit</Button>
                    </div>
                    
                    {/* NEW: KBZ Phone Number Input is back */}
                    {paymentMethod === 'kbz' && (
                        <div>
                           <label className="text-sm font-medium">KBZ Pay Phone Number</label>
                           <Input 
                                type="tel" 
                                placeholder="09xxxxxxxxx" 
                                value={kbzPhoneNumber} 
                                onChange={(e) => setKbzPhoneNumber(e.target.value)} 
                                required
                            />
                        </div>
                    )}

                    <div>
                        <Input type="number" placeholder="Paid Amount" className="h-12 text-md" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                        {paidAmountNum > amountDue && !selectedCustomer && (paymentMethod === 'cash' || paymentMethod === 'kbz') && (
                            <p className="text-sm text-red-600 mt-1">Please select a customer to credit the change amount.</p>
                        )}
                        {changeAmount > 0 && (
                            <p className="text-right text-green-600 mt-1 font-medium">
                                {selectedCustomer ? 'Credit Change' : 'Change Due'}: {changeAmount.toLocaleString()} MMK
                            </p>
                        )}
                    </div>
                    <Button onClick={processSale} disabled={!canCompleteSale() || loading} className="w-full h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                        {loading ? "Processing..." : "Complete Sale"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
