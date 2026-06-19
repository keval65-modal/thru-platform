"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, PlusCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

type ProfileVehicle = {
  number: string;
  make?: string;
  model?: string;
};

function splitPhoneNumber(fullPhone: string) {
  if (fullPhone.startsWith("+91")) {
    return { countryCode: "+91", phone: fullPhone.slice(3) };
  }
  if (fullPhone.startsWith("+1")) {
    return { countryCode: "+1", phone: fullPhone.slice(2) };
  }
  return { countryCode: "+91", phone: fullPhone.replace(/^\+\d{1,3}/, "") };
}

export default function PersonalInformationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+91");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [city, setCity] = React.useState("");
  const [vehicles, setVehicles] = React.useState<ProfileVehicle[]>([{ number: "" }]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!auth) return;

    const loadProfile = async (user: FirebaseUser | null) => {
      const currentPhone = user?.phoneNumber || "";
      if (!user || !currentPhone) return;

      const parts = splitPhoneNumber(currentPhone);
      setCountryCode(parts.countryCode);
      setPhone(parts.phone);

      try {
        const params = new URLSearchParams({
          firebaseUid: user.uid,
          phone: currentPhone,
        });
        const response = await fetch(`/api/user/profile?${params.toString()}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not load profile");
        }

        const p = result.profile || {};
        setName(p.name || "");
        setEmail(p.email || "");
        setAddress(p.address || "");
        setGender(p.gender || "");
        setCity(p.city || "");
        const savedVehicles = Array.isArray(p.vehicles) && p.vehicles.length > 0
          ? p.vehicles
          : Array.isArray(p.vehicleNumbers)
            ? p.vehicleNumbers.map((number: string) => ({ number }))
            : [];
        setVehicles(savedVehicles.length > 0 ? savedVehicles : [{ number: "" }]);
      } catch (e) {
        console.warn("Failed to load profile", e);
      }
    };

    void loadProfile(auth.currentUser);
    return onAuthStateChanged(auth, (user) => {
      void loadProfile(user);
    });
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const fullPhone = `${countryCode}${phone}`;
      const currentUser = auth?.currentUser;
      if (!currentUser) throw new Error("Please log in again before updating your profile.");
      const cleanedVehicles = vehicles
        .map((vehicle) => ({
          number: vehicle.number.trim().toUpperCase(),
          make: vehicle.make?.trim() || undefined,
          model: vehicle.model?.trim() || undefined,
        }))
        .filter((vehicle) => Boolean(vehicle.number));

      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: currentUser.uid,
          name,
          phoneNumber: fullPhone,
          email,
          address,
          gender,
          city,
          vehicles: cleanedVehicles,
          vehicleNumbers: cleanedVehicles.map((vehicle) => vehicle.number),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not save profile.");
      }

      toast({ title: "Saved", description: "Profile updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4 md:p-6 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Personal Information</h1>
      </div>

      <div className="p-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div>
              <Label>Phone no</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[110px]"><SelectValue placeholder="+91" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">+91 (India)</SelectItem>
                    <SelectItem value="+1">+1 (USA/CAN)</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="Phone" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your full address" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>Vehicles</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVehicles((prev) => [...prev, { number: "" }])}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
              <div className="mt-2 space-y-3">
                {vehicles.map((vehicle, index) => (
                  <div key={index} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Vehicle number</Label>
                        <Input
                          value={vehicle.number}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            setVehicles((prev) => prev.map((item, i) => i === index ? { ...item, number: value } : item));
                          }}
                          placeholder="MH-01-AB-1234"
                        />
                      </div>
                      {vehicles.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 text-destructive hover:text-destructive"
                          onClick={() => setVehicles((prev) => prev.filter((_, i) => i !== index))}
                          aria-label="Remove vehicle"
                        >
                          <XCircle className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Make</Label>
                        <Input
                          value={vehicle.make ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setVehicles((prev) => prev.map((item, i) => i === index ? { ...item, make: value } : item));
                          }}
                          placeholder="Honda"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Model</Label>
                        <Input
                          value={vehicle.model ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setVehicles((prev) => prev.map((item, i) => i === index ? { ...item, model: value } : item));
                          }}
                          placeholder="City"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                RTO make/model lookup needs an authorized data provider, so make and model are manual for now.
              </p>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save and Update"}</Button>
            <Button variant="ghost" className="w-full text-destructive" onClick={() => router.push('/home')}>Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



