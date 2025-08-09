"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone } from "lucide-react"

interface Product {
  id: string
  name: string
  sku: string
  selling_price: number
  stock_quantity: number
  product_attributes?: Array<{
    attribute_id: string
    value: string
    attributes: { name: string }
  }>
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
  selectedAttributes?: { [key: string]: string }
}

interface CompanyProfile {
  company_name: string
  address: string
  phone: string
  email: string
  website: string
  tax_number: string
}

export default function POSSalesForm() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [paidAmount, setPaidAmount] = useState("")
  const [kbzPhoneNumber, setKbzPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === "admin"

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
    fetchCompanyProfile()
  }, [])

  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single()
    if (data) setCompanyProfile(data)
  }

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        product_attributes(
          attribute_id,
          value,
          attributes(name)
        )
      `)
      .gt("stock_quantity", 0)

    if (data) setProducts(data)
  }

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("*")
    if (data) setCustomers(data)
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id)

    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.selling_price }
              : item,
          ),
        )
      }
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          total: product.selling_price,
          selectedAttributes: {},
        },
      ])
    }
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter((item) => item.product.id !== productId))
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity, total: newQuantity * item.product.selling_price }
            : item,
        ),
      )
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)
  const paidAmountNum = Number.parseFloat(paidAmount) || 0
  const changeAmount = paidAmountNum - totalAmount

  const canCompleteSale = () => {
    if (cart.length === 0) return false
    if (!isAdmin && paidAmountNum < totalAmount) return false
    if (paymentMethod === "kbz" && !kbzPhoneNumber) return false

    // Prevent credit sales for walk-in customers
    if (paymentMethod === "credit" && !selectedCustomer) {
      return false
    }

    return true
  }

  const processSale = async () => {
    if (!canCompleteSale()) return

    // Only admin can complete sales
    if (!isAdmin) {
      alert("Only administrators can complete sales")
      return
    }

    setLoading(true)

    try {
      const saleNumber = `SALE-${Date.now()}`

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
        .single()

      if (saleError) throw saleError

      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        total_price: item.total,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)
      if (itemsError) throw itemsError

      for (const item of cart) {
        await supabase
          .from("products")
          .update({
            stock_quantity: item.product.stock_quantity - item.quantity,
          })
          .eq("id", item.product.id)
      }

      if (changeAmount > 0 && selectedCustomer) {
        await supabase.from("customer_credits").insert({
          customer_id: selectedCustomer.id,
          amount: changeAmount,
          type: "credit",
          description: `Change from sale ${saleNumber}`,
          sale_id: saleData.id,
        })

        await supabase
          .from("customers")
          .update({
            credit_balance: selectedCustomer.credit_balance + changeAmount,
          })
          .eq("id", selectedCustomer.id)
      }

      printReceipt(saleData, cart)

      setCart([])
      setPaidAmount("")
      setKbzPhoneNumber("")
      setSelectedCustomer(null)
      fetchProducts()
      fetchCustomers()
    } catch (error) {
      console.error("Error processing sale:", error)
    } finally {
      setLoading(false)
    }
  }

  const printReceipt = (sale: any, items: CartItem[]) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const receiptHTML = `
    <html>
      <head>
        <title>Receipt - ${sale.sale_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.4;
            max-width: 300px; 
            margin: 0 auto; 
            padding: 10px;
            background: white;
          }
          .receipt-header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .company-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
            text-transform: uppercase;
          }
          .company-info { 
            font-size: 10px; 
            line-height: 1.3; 
            margin-bottom: 8px; 
          }
          .receipt-title { 
            font-size: 14px; 
            font-weight: bold; 
            margin: 8px 0; 
            text-transform: uppercase;
          }
          .sale-info { 
            margin-bottom: 15px; 
            font-size: 11px; 
          }
          .sale-info div { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 2px; 
          }
          .items-section { 
            border-top: 1px dashed #000; 
            border-bottom: 1px dashed #000; 
            padding: 10px 0; 
            margin: 15px 0; 
          }
          .item-header { 
            display: flex; 
            justify-content: space-between; 
            font-weight: bold; 
            margin-bottom: 5px; 
            font-size: 10px;
            text-transform: uppercase;
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px; 
            font-size: 11px;
          }
          .item-name { 
            flex: 1; 
            margin-right: 10px; 
          }
          .item-qty { 
            width: 30px; 
            text-align: center; 
          }
          .item-price { 
            width: 60px; 
            text-align: right; 
          }
          .totals-section { 
            margin-top: 15px; 
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px; 
            font-size: 11px;
          }
          .total-line.grand-total { 
            font-weight: bold; 
            font-size: 13px; 
            border-top: 1px solid #000; 
            padding-top: 5px; 
            margin-top: 8px; 
          }
          .payment-info { 
            margin-top: 15px; 
            padding-top: 10px; 
            border-top: 1px dashed #000; 
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 10px; 
            border-top: 2px solid #000; 
            font-size: 10px; 
          }
          .thank-you { 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          @media print { 
            body { margin: 0; padding: 5px; } 
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div class="company-name">${companyProfile?.company_name || "POS SYSTEM"}</div>
          <div class="company-info">
            ${companyProfile?.address ? `${companyProfile.address}<br>` : ""}
            ${companyProfile?.phone ? `Tel: ${companyProfile.phone}<br>` : ""}
            ${companyProfile?.email ? `Email: ${companyProfile.email}<br>` : ""}
            ${companyProfile?.tax_number ? `Tax No: ${companyProfile.tax_number}` : ""}
          </div>
          <div class="receipt-title">SALES RECEIPT</div>
        </div>
        
        <div class="sale-info">
          <div><span>Receipt No:</span><span>${sale.sale_number}</span></div>
          <div><span>Date:</span><span>${new Date(sale.sale_date).toLocaleDateString()}</span></div>
          <div><span>Time:</span><span>${new Date(sale.sale_date).toLocaleTimeString()}</span></div>
          ${selectedCustomer ? `<div><span>Customer:</span><span>${selectedCustomer.name}</span></div>` : ""}
          ${selectedCustomer?.phone ? `<div><span>Phone:</span><span>${selectedCustomer.phone}</span></div>` : ""}
        </div>
        
        <div class="items-section">
          <div class="item-header">
            <span>ITEM</span>
            <span>QTY</span>
            <span>AMOUNT</span>
          </div>
          ${items
            .map(
              (item) => `
            <div class="item">
              <span class="item-name">${item.product.name}</span>
              <span class="item-qty">${item.quantity}</span>
              <span class="item-price">${item.total.toLocaleString()}</span>
            </div>
            <div style="font-size: 10px; color: #666; margin-left: 0; margin-bottom: 5px;">
              @ ${item.product.selling_price.toLocaleString()} MMK each
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="totals-section">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${totalAmount.toLocaleString()} MMK</span>
          </div>
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${totalAmount.toLocaleString()} MMK</span>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="total-line">
            <span>Payment Method:</span>
            <span>${paymentMethod.toUpperCase()}</span>
          </div>
          ${
            paymentMethod === "kbz" && kbzPhoneNumber
              ? `
          <div class="total-line">
            <span>KBZ Phone:</span>
            <span>${kbzPhoneNumber}</span>
          </div>`
              : ""
          }
          <div class="total-line">
            <span>Amount Paid:</span>
            <span>${paidAmountNum.toLocaleString()} MMK</span>
          </div>
          ${
            changeAmount > 0
              ? `
          <div class="total-line">
            <span>Change:</span>
            <span>${changeAmount.toLocaleString()} MMK</span>
          </div>`
              : ""
          }
        </div>
        
        <div class="footer">
          <div class="thank-you">THANK YOU FOR YOUR BUSINESS!</div>
          <div>Please come again</div>
          ${companyProfile?.website ? `<div>${companyProfile.website}</div>` : ""}
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
    </html>
  `

    printWindow.document.write(receiptHTML)
    printWindow.document.close()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {!isAdmin && (
        <div className="mb-4 p-4 bg-orange-100 border border-orange-300 rounded-lg">
          <p className="text-orange-800 font-medium">⚠️ Only administrators can complete sales transactions.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Search & Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Product Search</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-emerald-600">{product.selling_price.toLocaleString()} MMK</span>
                      <Badge variant={product.stock_quantity < 10 ? "destructive" : "secondary"}>
                        Stock: {product.stock_quantity}
                      </Badge>
                    </div>
                    {product.product_attributes && product.product_attributes.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {product.product_attributes.slice(0, 2).map((attr, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {attr.attributes.name}: {attr.value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shopping Cart & Checkout */}
        <Card>
          <CardHeader>
            <CardTitle>Shopping Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <div>
              <label className="text-sm font-medium">Customer (Optional)</label>
              <Select
                onValueChange={(value) => {
                  const customer = customers.find((c) => c.id === value)
                  setSelectedCustomer(customer || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}{" "}
                      {customer.credit_balance > 0 && `(Credit: ${customer.credit_balance.toLocaleString()} MMK)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && selectedCustomer.credit_balance > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-700">
                    Customer has credit balance: {selectedCustomer.credit_balance.toLocaleString()} MMK
                  </p>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{item.product.name}</h5>
                    <p className="text-xs text-gray-500">{item.product.selling_price.toLocaleString()} MMK each</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="ml-4 font-medium">{item.total.toLocaleString()} MMK</div>
                </div>
              ))}
            </div>

            {/* Payment Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{totalAmount.toLocaleString()} MMK</span>
              </div>

              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="flex items-center space-x-1"
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Cash</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "kbz" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("kbz")}
                    className="flex items-center space-x-1"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>KBZ Pay</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "credit" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("credit")}
                    className="flex items-center space-x-1"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Credit</span>
                  </Button>
                </div>
              </div>

              {paymentMethod === "credit" && !selectedCustomer && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">Please select a customer for credit sales.</p>
                </div>
              )}

              {paymentMethod === "kbz" && (
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
                <label className="text-sm font-medium">Paid Amount (MMK)</label>
                <Input
                  type="number"
                  placeholder="Enter paid amount"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                {paidAmountNum > 0 && (
                  <div className="mt-2 text-sm">
                    <p className={changeAmount >= 0 ? "text-green-600" : "text-red-600"}>
                      Change: {changeAmount.toLocaleString()} MMK
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={processSale}
                disabled={!canCompleteSale() || loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
