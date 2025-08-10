"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BarChart3, Package, Tag, Diamond, ChevronRight, LogOut, FileText, Users,
  Building2, ShoppingCart, Truck, CreditCard, Warehouse, Database,
  PanelLeftClose, PanelLeftOpen, ClipboardList
} from "lucide-react"

// Import all your page components
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
  // NEW: State to manage the sidebar's collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { name: "Dashboard", icon: BarChart3 },
    { name: "POS Sales", icon: ShoppingCart },
    { name: "Products", icon: Package },
    { name: "Inventory", icon: Warehouse },
    { name: "Reports", icon: FileText },
    { name: "Customers", icon: Users },
    { name: "Credit/Debit", icon: CreditCard },
    { name: "Suppliers", icon: Truck },
    { name: "Category", icon: Tag },
    { name: "Brands", icon: Diamond },
    { name: "Attributes", icon: ClipboardList },
    { name: "Users", icon: Users },
    { name: "Company Profile", icon: Building2 },
    ...(user?.role === "admin" ? [{ name: "Data Management", icon: Database }] : []),
  ]

  const renderContent = () => {
    switch (activeItem) {
      case "POS Sales": return <POSSalesForm />
      case "Reports": return <ReportsPage />
      case "Products": return <ProductsPage />
      case "Category": return <CategoriesPage />
      case "Brands": return <BrandsPage />
      case "Attributes": return <AttributesPage />
      case "Company Profile": return <CompanyProfilePage />
      case "Customers": return <CustomersPage />
      case "Suppliers": return <SuppliersPage />
      case "Inventory": return <InventoryPage />
      case "Credit/Debit": return <CreditDebitPage />
      case "Users": return <UsersPage />
      case "Data Management": return <DataManagementPage />
      default: return <DashboardContent setActiveItem={setActiveItem} />
    }
  }

  return (
    <TooltipProvider>
        <div className="flex h-screen bg-gray-100">
        {/* MODIFIED: Sidebar with conditional width and content */}
        <div className={`bg-emerald-700 text-white flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div className="p-4 flex items-center justify-between border-b border-emerald-600">
                <div className={`transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 delay-200'}`}>
                    <h1 className="text-xl font-bold whitespace-nowrap">POS System</h1>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hover:bg-emerald-600"
                >
                    {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                </Button>
            </div>

            <div className="p-4 border-b border-emerald-600">
                <p className={`text-sm opacity-90 truncate transition-opacity ${isCollapsed ? 'hidden' : 'block'}`}>Welcome,</p>
                <p className={`font-bold opacity-90 truncate transition-opacity ${isCollapsed ? 'hidden' : 'block'}`}>{user?.username || 'System Administrator'}</p>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
                <Tooltip key={item.name} delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                        onClick={() => setActiveItem(item.name)}
                        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors
                            ${isCollapsed ? 'justify-center' : ''}
                            ${activeItem === item.name ? "bg-emerald-800 font-semibold" : "hover:bg-emerald-600"}`}
                        >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className={`ml-4 text-sm whitespace-nowrap transition-all ${isCollapsed ? 'hidden' : 'block'}`}>{item.name}</span>
                        </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right" className="bg-gray-800 text-white border-gray-800">
                            <p>{item.name}</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            ))}
            </nav>

            <div className="p-4 mt-auto border-t border-emerald-600">
            <Button onClick={logout} className="w-full bg-red-600 hover:bg-red-700">
                <LogOut className={`transition-all ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2'}`} />
                <span className={isCollapsed ? 'hidden' : 'block'}>Logout</span>
            </Button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>
        </div>
    </TooltipProvider>
  )
}
