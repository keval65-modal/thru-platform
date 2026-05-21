"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, LocateFixed } from "lucide-react";
import { vendorTypeOptions } from "@/lib/demo-data";

interface FormState {
  shopName: string;
  ownerName: string;
  shopCategory: string;
  phone: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  whatsappOptIn: boolean;
  notes: string;
}

export function VendorSignUpForm() {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>({
    shopName: "",
    ownerName: "",
    shopCategory: "",
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
    whatsappOptIn: true,
    notes: "",
  });
  
  const locationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Wait for Google Maps to load
  useEffect(() => {
    const checkMapsLoaded = () => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Check if already loaded
    if (checkMapsLoaded()) {
      return;
    }

    // Wait for script to load
    const interval = setInterval(() => {
      if (checkMapsLoaded()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!checkMapsLoaded()) {
        console.warn('Google Maps Places API failed to load');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Initialize Google Maps Autocomplete when loaded
  useEffect(() => {
    if (!mapsLoaded || !locationInputRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        locationInputRef.current,
        {
          types: ['address'], // Fixed: 'establishment' cannot be mixed with other types
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'geometry']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setForm(prev => ({
            ...prev,
            location: place.formatted_address || prev.location,
            latitude: lat,
            longitude: lng
          }));
        }
      });
    } catch (error) {
      console.error('Error initializing Google Maps Autocomplete:', error);
      toast({
        title: "Location service unavailable",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
    }

    return () => {
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [mapsLoaded, toast]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Handle current location detection
  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update coordinates immediately
        setForm(prev => ({
          ...prev,
          latitude,
          longitude
        }));

        // Try to get address using reverse geocoding
        if (mapsLoaded && window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === 'OK' && results?.[0]) {
                setForm(prev => ({
                  ...prev,
                  location: results[0].formatted_address || prev.location,
                  latitude,
                  longitude
                }));
                toast({
                  title: "Location detected",
                  description: "Address and coordinates have been filled in.",
                });
              } else {
                // If geocoding fails, still set coordinates
                setForm(prev => ({
                  ...prev,
                  location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  latitude,
                  longitude
                }));
                toast({
                  title: "Location detected",
                  description: "Coordinates filled. Please enter the address manually.",
                });
              }
              setIsFetchingLocation(false);
            }
          );
        } else {
          // If Maps not loaded, just set coordinates
          setForm(prev => ({
            ...prev,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude
          }));
          toast({
            title: "Location detected",
            description: "Coordinates filled. Please enter the address manually.",
          });
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        toast({
          title: "Location error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If location is provided but no coordinates, try to geocode it
    if (form.location && (!form.latitude || !form.longitude)) {
      if (mapsLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: form.location }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
            // Retry submit after geocoding
            setTimeout(() => {
              const formElement = e.target as HTMLFormElement;
              formElement.requestSubmit();
            }, 100);
            return;
          }
        });
      }
      
      toast({
        title: "Location required",
        description: "Please select a location from the suggestions or enter a complete address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!form.latitude || !form.longitude) {
      toast({
        title: "Location required",
        description: "Please provide a valid location.",
        variant: "destructive",
      });
      return;
    }

    setPending(true);

    try {
      const res = await fetch("/api/demo-shop-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: form.shopName,
          ownerName: form.ownerName,
          shopCategory: form.shopCategory,
          phone: form.phone,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          whatsappOptIn: form.whatsappOptIn,
          notes: form.notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok !== false) {
        toast({
          title: "Signed up successfully!",
          description: "We'll reach out to you when Thru goes live for vendor registrations.",
        });
        setForm({
          shopName: "",
          ownerName: "",
          shopCategory: "",
          phone: "",
          location: "",
          latitude: null,
          longitude: null,
          whatsappOptIn: true,
          notes: "",
        });
      } else {
        toast({
          title: "Couldn't save",
          description: data?.message || "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network issue",
        description: "Check your connection and retry.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="md:sticky md:top-4">
      <CardHeader>
        <CardTitle>Vendor Sign Up</CardTitle>
        <CardDescription>
          Register your shop to join Thru when we launch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            required
            placeholder="Shop Name"
            value={form.shopName}
            onChange={(e) => updateField("shopName", e.target.value)}
          />

          <Input
            required
            placeholder="Owner Name"
            value={form.ownerName}
            onChange={(e) => updateField("ownerName", e.target.value)}
          />

          <Select
            required
            value={form.shopCategory}
            onValueChange={(value) => updateField("shopCategory", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Shop Category" />
            </SelectTrigger>
            <SelectContent>
              {vendorTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            required
            type="tel"
            placeholder="WhatsApp Number"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <div className="flex items-center justify-between rounded-md border bg-muted/60 p-3">
            <div>
              <Label htmlFor="vendor-wa-optin" className="font-medium">
                Opt in to WhatsApp updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about vendor registration.
              </p>
            </div>
            <Switch
              id="vendor-wa-optin"
              checked={form.whatsappOptIn}
              onCheckedChange={(checked) => updateField("whatsappOptIn", checked)}
            />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={locationInputRef}
                required
                placeholder="Shop Location (start typing address)"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseCurrentLocation}
              disabled={isFetchingLocation}
              className="w-full"
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              {isFetchingLocation ? "Detecting location..." : "Use Current Location"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                  Latitude
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="28.6139"
                  value={form.latitude ?? ""}
                  onChange={(e) => {
                    const lat = e.target.value ? parseFloat(e.target.value) : null;
                    updateField("latitude", lat);
                    // Reverse geocode if both coordinates are valid
                    if (lat !== null && form.longitude !== null && mapsLoaded && window.google?.maps?.Geocoder) {
                      const geocoder = new window.google.maps.Geocoder();
                      geocoder.geocode(
                        { location: { lat, lng: form.longitude } },
                        (results, status) => {
                          if (status === 'OK' && results?.[0]) {
                            setForm(prev => ({
                              ...prev,
                              location: results[0].formatted_address || prev.location
                            }));
                          }
                        }
                      );
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                  Longitude
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="77.2090"
                  value={form.longitude ?? ""}
                  onChange={(e) => {
                    const lng = e.target.value ? parseFloat(e.target.value) : null;
                    updateField("longitude", lng);
                    // Reverse geocode if both coordinates are valid
                    if (lng !== null && form.latitude !== null && mapsLoaded && window.google?.maps?.Geocoder) {
                      const geocoder = new window.google.maps.Geocoder();
                      geocoder.geocode(
                        { location: { lat: form.latitude, lng } },
                        (results, status) => {
                          if (status === 'OK' && results?.[0]) {
                            setForm(prev => ({
                              ...prev,
                              location: results[0].formatted_address || prev.location
                            }));
                          }
                        }
                      );
                    }
                  }}
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Coordinates are auto-filled when you use current location or select from suggestions. You can edit them manually.
            </p>
          </div>

          <Textarea
            placeholder="Any suggestions or feedback? (optional)"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
          />

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing up…" : "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
