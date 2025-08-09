"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Wallet, HandCoins, TrendingDown } from "lucide-react"
import { Label } from "@/components/ui/label"

interface Customer {
  id: string
  name: string
  phone: string | null // phone can be null
  credit_balance: number
}

interface CreditTransaction {
  id: string
  customer_id: string
  amount: number
  type: string
  description: string
  created_at: string
  customers: { name: string }
}

export default function CreditDebitPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [transactions, setTransactions] = useState<CreditTransaction[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [formData, setFormData] = useState({
        type: "credit",
        amount: "",
        description: "",
    })

    useEffect(() => {
        fetchCustomers()
        fetchTransactions()
    }, [])

    const fetchCustomers = async () => {
        const { data } = await supabase.from("customers").select("*").order("name")
        if (data) setCustomers(data)
    }

    const fetchTransactions = async () => {
        const { data } = await supabase.from("customer_credits").select(`*, customers(name)`).order("created_at", { ascending: false }).limit(100)
        if (data) setTransactions(data)
    }

    // MODIFIED: Safely handles null phone numbers
    const filteredCustomers = customers.filter(
        (customer) =>
            (customer.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.phone || "").includes(searchTerm),
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCustomer) return
        
        const amount = Number.parseFloat(formData.amount)
        await supabase.from("customer_credits").insert({
            customer_id: selectedCustomer.id,
            amount: amount,
            type: formData.type,
            description: formData.description,
        })

        // "credit" (repayment) INCREASES balance (less debt / more credit)
        // "debit" (adding debt) DECREASES balance (more debt / less credit)
        const newBalance =
            formData.type === "credit"
                ? selectedCustomer.credit_balance + amount
                : selectedCustomer.credit_balance - amount

        await supabase
            .from("customers")
            .update({ credit_balance: newBalance })
            .eq("id", selectedCustomer.id)
            
        setIsDialogOpen(false)
        resetForm()
        fetchCustomers()
        fetchTransactions()
    }
    
    const resetForm = () => {
        setFormData({ type: "credit", amount: "", description: "" })
    }

    const openTransactionDialog = (customer: Customer) => {
        setSelectedCustomer(customer)
        resetForm()
        setIsDialogOpen(true)
    }

    const totalCredit = customers.filter(c => c.credit_balance > 0).reduce((sum, c) => sum + c.credit_balance, 0);
    const totalDebt = Math.abs(customers.filter(c => c.credit_balance < 0).reduce((sum, c) => sum + c.credit_balance, 0));

    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            <header className="bg-white p-6 border-b border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-800">Customer Balances (Credit/Debt)</h1>
            </header>

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Customer Credit</CardTitle>
                            <Wallet className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{totalCredit.toLocaleString()} MMK</div>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Customer Debt</CardTitle>
                            <HandCoins className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{totalDebt.toLocaleString()} MMK</div>
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
                            <TrendingDown className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold text-purple-600">{transactions.length}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Balances</CardTitle>
                            <div className="relative pt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                {filteredCustomers.map((customer) => (
                                    <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <h4 className="font-medium">{customer.name}</h4>
                                            <Badge variant={customer.credit_balance > 0 ? "default" : customer.credit_balance < 0 ? "destructive" : "secondary"}>
                                                {
                                                    customer.credit_balance > 0 ? `Credit: ${customer.credit_balance.toLocaleString()} MMK` :
                                                    customer.credit_balance < 0 ? `Owes: ${Math.abs(customer.credit_balance).toLocaleString()} MMK` :
                                                    `Balance: 0 MMK`
                                                }
                                            </Badge>
                                        </div>
                                        <Button size="sm" onClick={() => openTransactionDialog(customer)}>Transaction</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                                {transactions.map((transaction) => (
                                    <div key={transaction.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">{transaction.customers.name}</h4>
                                        <Badge variant={transaction.type === "credit" ? "default" : "destructive"}>
                                            {transaction.type === "credit" ? "CREDIT +" : "DEBT -"}
                                            {transaction.amount.toLocaleString()} MMK
                                        </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600">{transaction.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(transaction.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Transaction for {selectedCustomer?.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded">
                                <p className="text-sm">
                                    Current Balance: <strong>
                                        {
                                            (selectedCustomer?.credit_balance ?? 0) > 0 ? `Credit of ${(selectedCustomer?.credit_balance ?? 0).toLocaleString()} MMK` :
                                            (selectedCustomer?.credit_balance ?? 0) < 0 ? `Owes ${Math.abs(selectedCustomer?.credit_balance ?? 0).toLocaleString()} MMK` :
                                            `0 MMK`
                                        }
                                    </strong>
                                </p>
                            </div>
                            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">Add Credit / Repayment</SelectItem>
                                    <SelectItem value="debit">Add Debt / Use Credit</SelectItem>
                                </SelectContent>
                            </Select>
                            <div>
                                <Label>Amount (MMK)</Label>
                                <Input type="number" min="1" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Cash repayment, Service fee" required />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Submit Transaction</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}
