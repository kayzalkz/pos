"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Search, Users } from "lucide-react"

interface User {
  id: string
  username: string
  role: string
  permissions: string[]
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "staff",
    permissions: [] as string[],
  })

  const availablePermissions = [
    "manage_products",
    "manage_customers",
    "manage_suppliers",
    "process_sales",
    "view_reports",
    "manage_inventory",
    "manage_users",
    "manage_settings",
  ]

  const rolePermissions = {
    admin: availablePermissions,
    manager: [
      "manage_products",
      "manage_customers",
      "manage_suppliers",
      "process_sales",
      "view_reports",
      "manage_inventory",
    ],
    staff: ["process_sales", "manage_customers"],
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("username")
    if (data) setUsers(data)
  }

  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const userData = {
      username: formData.username,
      role: formData.role,
      permissions: rolePermissions[formData.role as keyof typeof rolePermissions],
      ...(formData.password && { password: formData.password }),
    }

    if (editingUser) {
      await supabase.from("users").update(userData).eq("id", editingUser.id)
    } else {
      await supabase.from("users").insert({ ...userData, password: formData.password })
    }

    setIsDialogOpen(false)
    setEditingUser(null)
    resetForm()
    fetchUsers()
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      permissions: user.permissions || [],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await supabase.from("users").delete().eq("id", id)
      fetchUsers()
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "staff",
      permissions: [],
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "manager":
        return "default"
      case "staff":
        return "secondary"
      default:
        return "secondary"
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Users Management</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setEditingUser(null)
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Username *</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Permissions (Auto-assigned by role)</label>
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <div className="flex flex-wrap gap-1">
                    {rolePermissions[formData.role as keyof typeof rolePermissions]?.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingUser ? "Update" : "Create"} User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{user.username}</CardTitle>
                  <Badge variant={getRoleBadgeColor(user.role)}>{user.role.toUpperCase()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {(user.permissions || []).slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission.replace("_", " ")}
                        </Badge>
                      ))}
                      {(user.permissions || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(user.permissions || []).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No users found. Add your first user to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
