"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Building2, Save, UploadCloud, X, Loader2 } from "lucide-react"

interface CompanyProfile {
  id?: string
  company_name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  tax_number: string | null
  logo_url: string | null
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // NEW: State for handling the logo file upload
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  const fetchCompanyProfile = async () => {
    const { data } = await supabase.from("company_profile").select("*").single()
    if (data) {
      setProfile(data)
      setLogoPreview(data.logo_url) // Set the preview to the existing logo
    }
  }

  // NEW: Handler for when a user selects an image file
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // MODIFIED: handleSubmit now includes image upload logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return;
    
    setLoading(true)
    let newLogoUrl = profile.logo_url;

    try {
      // 1. If a new logo file was selected, upload it first
      if (logoFile) {
        const filePath = `public/${Date.now()}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('company-assets') // The bucket you just created
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('company-assets')
          .getPublicUrl(filePath);
        
        newLogoUrl = urlData.publicUrl;
      }

      const updatedProfile = {
          ...profile,
          logo_url: newLogoUrl
      };

      // 2. Insert or Update the profile with the new URL
      if (profile.id) {
        await supabase.from("company_profile").update(updatedProfile).eq("id", profile.id)
      } else {
        await supabase.from("company_profile").insert(updatedProfile)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchCompanyProfile()
    } catch (error) {
      console.error("Error saving company profile:", error)
    } finally {
      setLoading(false)
      setLogoFile(null); // Clear the file after submission
    }
  }

  if (!profile) {
      return (
          <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
          </div>
      )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white p-6 border-b">
        <div className="flex items-center">
          <Building2 className="w-6 h-6 mr-3 text-emerald-600" />
          <h1 className="text-2xl font-semibold text-gray-800">Company Profile</h1>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <p className="text-sm text-gray-600">This information will appear on receipts and reports</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Logo Uploader */}
                    <div className="md:col-span-1">
                        <label className="text-sm font-medium mb-2 block">Company Logo</label>
                        <div 
                            className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 relative"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoChange}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                            />
                            {logoPreview ? (
                                <>
                                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain rounded-lg p-2" />
                                    <Button
                                        type="button" variant="destructive" size="icon"
                                        className="absolute top-2 right-2 h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLogoFile(null);
                                            setLogoPreview(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                            setProfile({...profile, logo_url: null});
                                        }}
                                    ><X className="h-4 w-4" /></Button>
                                </>
                            ) : (
                                <div className="text-center">
                                    <UploadCloud className="mx-auto h-10 w-10" />
                                    <p className="mt-2 text-sm">Click to upload</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Company Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <label className="text-sm font-medium">Company Name *</label>
                            <Input value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                        </div>
                         <div>
                            <label className="text-sm font-medium">Email</label>
                            <Input type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Textarea value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} rows={3}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Website</label>
                    <Input value={profile.website || ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tax Number</label>
                    <Input value={profile.tax_number || ''} onChange={(e) => setProfile({ ...profile, tax_number: e.target.value })}/>
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
