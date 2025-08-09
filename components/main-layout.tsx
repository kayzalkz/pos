"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Package,
  Tag,
  Diamond,
  ChevronRight,
  LogOut,
  FileText,
  Users,
  Building2,
  ShoppingCart,
  Truck,
  CreditCard,
  Warehouse,
  Database,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import POSSalesForm from "./pos-sales-form"
import ReportsPage from "./reports-page"
import ProductsPage from "./products-page"
import CategoriesPage from "./categories-page"
import BrandsPage from "./brands-page"
import AttributesPage from "./attributes-page"
import CompanyProfilePage from "./company-profile-page"
import CustomersPage from "./customers-page"
import SuppliersPage from "./suppliers-page"
import InventoryPage from "./inventory-page"
import CreditDebitPage from "./credit-debit-page"
import UsersPage from "./users-page"
import DashboardContent from "./dashboard-content"
import DataManagementPage from "./data-management-page"

export default function MainLayout() {
  const { logout, user } = useAuth()
  const [activeItem, setActiveItem] = useState("Dashboard")

  const menuItems = [
    { name: "Dashboard", icon: BarChart3 },
    { name: "Category", icon: Tag },
    { name: "Brands", icon: Diamond },
    { name: "Attributes", icon: Package },
    { name: "Products", icon: Package },
    { name: "Customers", icon: Users },
    { name: "Suppliers", icon: Truck },
    { name: "POS Sales", icon: ShoppingCart },
    { name: "Inventory", icon: Warehouse },
    { name: "Credit/Debit", icon: CreditCard },
    { name: "Reports", icon: FileText },
    { name: "Users", icon: Users },
    { name: "Company Profile", icon: Building2 },
    ...(user?.role === "admin" ? [{ name: "Data Management", icon: Database }] : []),
  ]

  const renderContent = () => {
    switch (activeItem) {
      case "POS Sales":
        return <POSSalesForm />
      case "Reports":
        return <ReportsPage />
      case "Products":
        return <ProductsPage />
      case "Category":
        return <CategoriesPage />
      case "Brands":
        return <BrandsPage />
      case "Attributes":
        return <AttributesPage />
      case "Company Profile":
        return <CompanyProfilePage />
      case "Customers":
        return <CustomersPage />
      case "Suppliers":
        return <SuppliersPage />
      case "Inventory":
        return <InventoryPage />
      case "Credit/Debit":
        return <CreditDebitPage />
      case "Users":
        return <UsersPage />
      case "Data Management":
        return <DataManagementPage />
      default:
        return <DashboardContent setActiveItem={setActiveItem} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-emerald-500 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-lg font-bold mb-1">SALES &</h1>
          <h1 className="text-lg font-bold mb-4">INVENTORY</h1>
          <p className="text-sm opacity-90">Welcome,</p>
          <p className="text-sm opacity-90">System Administrator</p>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveItem(item.name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors mb-1 ${
                activeItem === item.name ? "bg-emerald-600 text-white" : "text-white hover:bg-emerald-600"
              }`}
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3" />
                <span className="text-sm">{item.name}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <Button onClick={logout} className="w-full bg-red-600 hover:bg-red-700 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>
    </div>
  )
}
