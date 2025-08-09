"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Search, Tag, Loader2, X } from "lucide-react"

interface Attribute {
  id: string
  name: string
  type: string
  values: string[] | null
  is_active: boolean
  is_required: boolean
  created_at: string
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "text",
    values: [] as string[],
    is_active: true,
    is_required: false,
  })
  const [newValue, setNewValue] = useState("")

  useEffect(() => {
    fetchAttributes()
  }, [])

  const fetchAttributes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("attributes")
        .select("id, name, type, values, is_active, is_required, created_at")
        .order("name")

      if (error) throw error

      const processedData = (data || []).map((attr) => ({
        ...attr,
        values: Array.isArray(attr.values) ? attr.values : [],
        is_active: attr.is_active ?? true,
        is_required: attr.is_required ?? false,
      }))

      setAttributes(processedData)
    } catch (error) {
      console.error("Error fetching attributes:", error)
      setAttributes([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAttributes = attributes.filter((attribute) =>
    (attribute.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const attributeData = {
        name: formData.name.trim(),
        type: formData.type,
        values: formData.type === "select" ? formData.values : null,
        is_active: formData.is_active,
        is_required: formData.is_required,
        updated_at: new Date().toISOString(),
      }

      if (editingAttribute) {
        const { error } = await supabase.from("attributes").update(attributeData).eq("id", editingAttribute.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("attributes").insert({
          ...attributeData,
          created_at: new Date().toISOString(),
        })

        if (error) throw error
      }

      setIsDialogOpen(false)
      setEditingAttribute(null)
      resetForm()
      await fetchAttributes()
    } catch (error) {
      console.error("Error saving attribute:", error)
      alert("Error saving attribute. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute)
    setFormData({
      name: attribute.name || "",
      type: attribute.type || "text",
      values: Array.isArray(attribute.values) ? [...attribute.values] : [],
      is_active: attribute.is_active ?? true,
      is_required: attribute.is_required ?? false,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this attribute? This will also remove it from all products.")) {
      try {
        // First, delete related product attributes
        await supabase.from("product_attributes").delete().eq("attribute_id", id)

        // Then delete the attribute
        const { error } = await supabase.from("attributes").delete().eq("id", id)

        if (error) throw error
        await fetchAttributes()
      } catch (error) {
        console.error("Error deleting attribute:", error)
        alert("Error deleting attribute. Please try again.")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "text",
      values: [],
      is_active: true,
      is_required: false,
    })
    setNewValue("")
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingAttribute(null)
      resetForm()
    }
  }

  const handleAddAttribute = () => {
    resetForm()
    setEditingAttribute(null)
    setIsDialogOpen(true)
  }

  const addValue = () => {
    if (newValue.trim() && !formData.values.includes(newValue.trim())) {
      setFormData({
        ...formData,
        values: [...formData.values, newValue.trim()],
      })
      setNewValue("")
    }
  }

  const removeValue = (valueToRemove: string) => {
    setFormData({
      ...formData,
      values: formData.values.filter((value) => value !== valueToRemove),
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading attributes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Attributes Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={handleAddAttribute} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Attribute
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAttribute ? "Edit Attribute" : "Add New Attribute"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Attribute Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter attribute name"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, values: [] })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select (Dropdown)</option>
                  <option value="textarea">Textarea</option>
                </select>
              </div>

              {formData.type === "select" && (
                <div>
                  <label className="text-sm font-medium">Values</label>
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="Enter a value"
                        onKeyPress={handleKeyPress}
                      />
                      <Button type="button" onClick={addValue} disabled={!newValue.trim()}>
                        Add
                      </Button>
                    </div>
                    {formData.values.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.values.map((value, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{value}</span>
                            <button
                              type="button"
                              onClick={() => removeValue(value)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_required"
                    checked={formData.is_required}
                    onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  />
                  <label htmlFor="is_required" className="text-sm font-medium">
                    Required
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingAttribute ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>{editingAttribute ? "Update" : "Create"} Attribute</>
                  )}
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
                placeholder="Search attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttributes.map((attribute) => (
            <Card key={attribute.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{attribute.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={attribute.is_active ? "default" : "secondary"}>
                      {attribute.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {attribute.is_required && <Badge variant="outline">Required</Badge>}
                  </div>
                </div>
                <p className="text-sm text-gray-600 capitalize">Type: {attribute.type}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {attribute.type === "select" && attribute.values && attribute.values.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Values:</p>
                      <div className="flex flex-wrap gap-1">
                        {attribute.values.map((value, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Created: {new Date(attribute.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(attribute)} className="flex-1">
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(attribute.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAttributes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No attributes found matching your search."
                  : "No attributes found. Add your first attribute to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
