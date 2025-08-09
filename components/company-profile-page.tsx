"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Building2, Save } from "lucide-react"

interface CompanyProfile {
  id?: string
  company_name: string
  address: string
  phone: string
  email: string
  website: string
  tax_number: string
  logo_url: string
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    tax_number: "",
    logo_url: "",
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single()
    if (data) {
      setProfile(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (profile.id) {
        await supabase.from("company_profile").update(profile).eq("id", profile.id)
      } else {
        await supabase.from("company_profile").insert(profile)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchCompanyProfile()
    } catch (error) {
      console.error("Error saving company profile:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-center">
          <Building2 className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Company Profile</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <p className="text-sm text-gray-600">This information will appear on receipts and reports</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company Name *</label>
                    <Input
                      value={profile.company_name}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Textarea
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tax Number</label>
                    <Input
                      value={profile.tax_number}
                      onChange={(e) => setProfile({ ...profile, tax_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Logo URL</label>
                    <Input
                      value={profile.logo_url}
                      onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className={`${saved ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Saving..." : saved ? "Saved!" : "Save Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
