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
import { useAuth } from "@/contexts/auth-context"
import { Plus, Search, CreditCard, TrendingUp, TrendingDown } from "lucide-react"

interface Customer {
  id: string
  name: string
  phone: string
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
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    type: "credit", // Default to 'credit' which is now a repayment
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
    const { data } = await supabase
      .from("customer_credits")
      .select(
        `
        *,
        customers(name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (data) setTransactions(data)
  }

  const filteredCustomers = customers.filter(
    (customer) => customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.phone.includes(searchTerm),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return

    const amount = Number.parseFloat(formData.amount)
    const transactionData = {
      customer_id: selectedCustomer.id,
      amount: amount,
      type: formData.type,
      description: formData.description,
    }
    
    await supabase.from("customer_credits").insert(transactionData)

    // MODIFIED: Corrected logic for balance updates
    // "credit" is a repayment, which DECREASES debt.
    // "debit" adds to their debt, which INCREASES it.
    const newBalance =
      formData.type === "credit"
        ? selectedCustomer.credit_balance - amount
        : selectedCustomer.credit_balance + amount

    await supabase
      .from("customers")
      .update({ credit_balance: Math.max(0, newBalance) }) // Ensure debt can't go negative
      .eq("id", selectedCustomer.id)

    setIsDialogOpen(false)
    setSelectedCustomer(null)
    resetForm()
    fetchCustomers()
    fetchTransactions()
  }

  const resetForm = () => {
    setFormData({
      type: "credit",
      amount: "",
      description: "",
    })
  }

  const openTransactionDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    resetForm()
    setIsDialogOpen(true)
  }

  const totalDebt = customers.reduce((sum, customer) => sum + customer.credit_balance, 0)

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center">
          <CreditCard className="w-6 h-6 mr-3 text-red-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Customer Debt Management</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding Debt</p>
                  <p className="text-2xl font-bold text-red-600">{totalDebt.toLocaleString()} MMK</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-gray-600">Customers with Debt</p>
                   <p className="text-2xl font-bold text-blue-600">
                     {customers.filter((c) => c.credit_balance > 0).length}
                   </p>
                 </div>
                 <CreditCard className="w-8 h-8 text-blue-600" />
               </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-gray-600">Recent Transactions</p>
                   <p className="text-2xl font-bold text-purple-600">{transactions.length}</p>
                 </div>
                 <TrendingDown className="w-8 h-8 text-purple-600" />
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Debt Balances</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{customer.name}</h4>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      <Badge variant={customer.credit_balance > 0 ? "destructive" : "default"} className="mt-1">
                        Debt: {customer.credit_balance.toLocaleString()} MMK
                      </Badge>
                    </div>
                    <Button size="sm" onClick={() => openTransactionDialog(customer)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Transaction
                    </Button>
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{transaction.customers.name}</h4>
                      <Badge variant={transaction.type === "credit" ? "default" : "destructive"}>
                        {transaction.type === "credit" ? "PAID -" : "DEBT +"}
                        {transaction.amount.toLocaleString()} MMK
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString()} at{" "}
                      {new Date(transaction.created_at).toLocaleTimeString()}
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
                  Current Debt: <strong>{selectedCustomer?.credit_balance?.toLocaleString()} MMK</strong>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Transaction Type</label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Repayment (Reduces Debt)</SelectItem>
                    <SelectItem value="debit">Add to Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Amount (MMK)</label>
                <Input type="number" min="1" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g., Cash repayment, Service fee" required />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Submit Transaction</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
