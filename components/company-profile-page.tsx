"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { Building2, Save, UploadCloud, X, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"

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
  const [isFetching, setIsFetching] = useState(true);

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCompanyProfile()
  }, [])

  // MODIFIED: This function now handles the case where no profile exists
  const fetchCompanyProfile = async () => {
    setIsFetching(true);
    const { data, error } = await supabase.from("company_profile").select("*").single()
    
    if (data) {
      setProfile(data)
      if (data.logo_url) {
        setLogoPreview(data.logo_url)
      }
    } else {
      // If no profile exists, create a default empty one so the form can be filled out
      setProfile({
        company_name: "", address: "", phone: "", email: "",
        website: "", tax_number: "", logo_url: "",
      });
    }
    setIsFetching(false);
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return;
    
    setLoading(true)
    let newLogoUrl = profile.logo_url;

    try {
      if (logoFile) {
        const filePath = `public/${Date.now()}-${logoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('company-assets').upload(filePath, logoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(filePath);
        newLogoUrl = urlData.publicUrl;
      }

      const updatedProfile = { ...profile, logo_url: newLogoUrl };

      // Use upsert to handle both creating a new profile and updating an existing one
      const { error } = await supabase.from("company_profile").upsert(updatedProfile, { onConflict: 'id' });
      if (error) throw error;

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchCompanyProfile()
    } catch (error) {
      console.error("Error saving company profile:", error)
    } finally {
      setLoading(false)
      setLogoFile(null);
    }
  }

  if (isFetching) {
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
                    <div className="md:col-span-1">
                        <Label className="mb-2 block">Company Logo</Label>
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
                                            if (profile) setProfile({...profile, logo_url: null});
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
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input id="companyName" value={profile?.company_name || ''} onChange={(e) => setProfile({ ...profile!, company_name: e.target.value })} required />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" value={profile?.phone || ''} onChange={(e) => setProfile({ ...profile!, phone: e.target.value })} />
                        </div>
                         <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={profile?.email || ''} onChange={(e) => setProfile({ ...profile!, email: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" value={profile?.address || ''} onChange={(e) => setProfile({ ...profile!, address: e.target.value })} rows={3}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" value={profile?.website || ''} onChange={(e) => setProfile({ ...profile!, website: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="tax_number">Tax Number</Label>
                    <Input id="tax_number" value={profile?.tax_number || ''} onChange={(e) => setProfile({ ...profile!, tax_number: e.target.value })}/>
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
