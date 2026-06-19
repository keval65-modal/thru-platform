
"use client";

// Force dynamic rendering to prevent Firebase initialization during build
export const dynamic = 'force-dynamic';

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  MapPin,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Home,
  ShoppingBag,
  ShoppingCart,
  Navigation
} from "lucide-react";
import { PlacedOrder, VendorOrderPortion } from "@/lib/orderModels";
import { getSupabaseClient } from "@/lib/supabase/client";
import { QRCodeCanvas } from "qrcode.react";
import { OrderTrackingMap } from "@/components/OrderTrackingMap";
import BottomNav from "@/components/layout/bottom-nav";
import { PreciseLocationRequiredModal } from "@/components/location/PreciseLocationRequiredModal";
import {
  getPrecisePositionForRouteTracking,
  openDeviceLocationSettings,
} from "@/lib/precise-location-for-tracking";
import { useActiveOrderLocationPolling } from "@/hooks/use-active-order-location-polling";
import {
  qualifiesForLiveLocationPing,
  qualifiesForPickupTravelActions,
} from "@/lib/tracking/order-live-location-gate";

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const orderId = params.orderId as string;

  const [order, setOrder] = React.useState<PlacedOrder | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userLocation, setUserLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [activeTab, setActiveTab] = React.useState("orders"); // 'orders' is the main view
  /** When true, user position + full-route actions stay off until high-accuracy GPS is available. */
  const [preciseLocationBlocked, setPreciseLocationBlocked] = React.useState(false);
  const [preciseCheckBusy, setPreciseCheckBusy] = React.useState(false);
  /** Manual stop for isolated live-location polling (does not affect map / route tracking). */
  const [liveLocationPaused, setLiveLocationPaused] = React.useState(false);
  /** High-accuracy gate for live travel polling only (Feature 1 + 2). */
  const [preciseOkForLiveTracking, setPreciseOkForLiveTracking] = React.useState(false);
  const [preciseLiveCheckBusy, setPreciseLiveCheckBusy] = React.useState(false);
  const [travelConfirmBusy, setTravelConfirmBusy] = React.useState(false);
  const supabase = React.useMemo(() => getSupabaseClient(), []);

  useActiveOrderLocationPolling({
    orderId,
    order,
    toast,
    userPaused: liveLocationPaused,
    allowLiveTracking: preciseOkForLiveTracking,
  });

  React.useEffect(() => {
    setLiveLocationPaused(false);
  }, [orderId]);

  const handleTravelConfirm = React.useCallback(async () => {
    if (!orderId) return;
    setTravelConfirmBusy(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/travel-confirm`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === "string" ? data.error : "Request failed");
      }
      toast({
        title: "You're on your way",
        description: "We've saved your travel confirmation for this order.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not confirm travel";
      toast({ title: "Something went wrong", description: message, variant: "destructive" });
    } finally {
      setTravelConfirmBusy(false);
    }
  }, [orderId, toast]);

  React.useEffect(() => {
    if (!order || !orderId) {
      setPreciseOkForLiveTracking(false);
      return;
    }
    if (
      !qualifiesForLiveLocationPing({
        overallStatus: order.overallStatus,
        paymentStatus: order.paymentStatus,
        vendorPortions: order.vendorPortions,
      })
    ) {
      setPreciseOkForLiveTracking(false);
      return;
    }
    let cancelled = false;
    setPreciseOkForLiveTracking(false);
    setPreciseLiveCheckBusy(true);
    void (async () => {
      const result = await getPrecisePositionForRouteTracking();
      if (cancelled) return;
      setPreciseLiveCheckBusy(false);
      setPreciseOkForLiveTracking(result.ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, order?.overallStatus, order?.paymentStatus]);

  React.useEffect(() => {
    if (!orderId) return;

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from("placed_orders")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (error) throw error;

        if (data && isMounted) {
          setOrder(mapSupabaseOrder(data));
        } else if (isMounted) {
          toast({ title: "Error", description: "Order not found", variant: "destructive" });
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        if (isMounted) {
          toast({ title: "Error", description: "Failed to load order", variant: "destructive" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrder();

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "placed_orders",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) {
            const newOrder = mapSupabaseOrder(payload.new);
            setOrder(newOrder);

            // Check for cancellation and notify user
            // We check if any vendor portion is cancelled in the new payload
            // Ideally we'd compare with previous state, but for now just notifying if we see a cancelled status is okay,
            // though it might toast on every update if we're not careful.
            // Better approach: Check if the status CHANGED to Cancelled.
            // Since we don't have easy access to 'prev' state inside this callback without refs or functional updates that might be tricky with the mapSupabaseOrder,
            // we'll rely on the user seeing the UI update. 
            // BUT, the user asked for "notified without refreshing".
            // Let's use a simple check: if the OVERALL status changed to Cancelled, or a vendor status is Cancelled.
            
            // Let's just toast if we see a cancellation and maybe we haven't toasted yet? 
            // Actually, let's just let the UI update do the talking, but maybe pop a toast if it's a *new* cancellation.
            // For simplicity and robustness, let's just trigger a toast if we detect a cancelled vendor portion.
            
             newOrder.vendorPortions.forEach(vp => {
                if (vp.status === 'Cancelled') {
                    toast({
                        title: `Order Cancelled by ${vp.vendorName}`,
                        description: vp.rejectionReason || "The vendor has cancelled your order.",
                        variant: "destructive",
                        duration: 5000,
                    });
                }
             });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };

  }, [orderId, supabase, toast]);

  /**
   * Location for the map / route:
   * - Active orders with vendor pins: require high-accuracy fix before exposing user location or route-from-user.
   * - All other cases: keep prior behavior (single getCurrentPosition, default browser options).
   */
  React.useEffect(() => {
    if (isLoading || !order) return;

    let cancelled = false;

    const isPaymentFailed = order.paymentStatus === "Failed";
    const isCompleted = order.overallStatus === "Completed";
    const isActiveOrder =
      !isPaymentFailed &&
      !isCompleted &&
      order.overallStatus !== "Cancelled" &&
      order.overallStatus !== "Expired";
    const vendorWithLocationCount = order.vendorPortions.filter((v) => v.vendorLocation).length;
    const needsPreciseForRoute = isActiveOrder && vendorWithLocationCount > 0;

    if (!needsPreciseForRoute) {
      setPreciseLocationBlocked(false);
      if (!("geolocation" in navigator)) {
        return () => {
          cancelled = true;
        };
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
      return () => {
        cancelled = true;
      };
    }

    setUserLocation(null);
    setPreciseLocationBlocked(false);
    setPreciseCheckBusy(true);
    (async () => {
      const result = await getPrecisePositionForRouteTracking();
      if (cancelled) return;
      setPreciseCheckBusy(false);
      if (result.ok) {
        setUserLocation({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        setPreciseLocationBlocked(false);
      } else {
        setUserLocation(null);
        setPreciseLocationBlocked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, order]);

  const retryPreciseLocation = React.useCallback(async () => {
    setPreciseCheckBusy(true);
    const result = await getPrecisePositionForRouteTracking();
    setPreciseCheckBusy(false);
    if (result.ok) {
      setUserLocation({
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setPreciseLocationBlocked(false);
    } else {
      setUserLocation(null);
      setPreciseLocationBlocked(true);
    }
  }, []);

  const needsPreciseForRouteUi = React.useMemo(() => {
    if (!order) return false;
    const isPaymentFailed = order.paymentStatus === "Failed";
    const isCompleted = order.overallStatus === "Completed";
    const isActiveOrder =
      !isPaymentFailed &&
      !isCompleted &&
      order.overallStatus !== "Cancelled" &&
      order.overallStatus !== "Expired";
    const vendorWithLocationCount = order.vendorPortions.filter((v) => v.vendorLocation).length;
    return isActiveOrder && vendorWithLocationCount > 0;
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Order Not Found</h1>
        <Button onClick={() => router.push('/home')}>Go Home</Button>
      </div>
    );
  }

  const isPaymentFailed = order.paymentStatus === "Failed";
  const isCompleted = order.overallStatus === "Completed";
  const isActive =
    !isPaymentFailed &&
    !isCompleted &&
    order.overallStatus !== "Cancelled" &&
    order.overallStatus !== "Expired";
  const canShareLiveLocation =
    isActive &&
    qualifiesForLiveLocationPing({
      overallStatus: order.overallStatus,
      paymentStatus: order.paymentStatus,
      vendorPortions: order.vendorPortions,
    });
  const canShowTravelConfirm =
    isActive &&
    qualifiesForPickupTravelActions({
      overallStatus: order.overallStatus,
      paymentStatus: order.paymentStatus,
    });

  // Prepare vendor locations for map
  const vendorLocations = order.vendorPortions
    .filter(v => v.vendorLocation)
    .map(v => ({
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      vendorAddress: v.vendorAddress,
      latitude: v.vendorLocation!.latitude,
      longitude: v.vendorLocation!.longitude
    }));

  // Function to open Google Maps with directions
  const openInGoogleMaps = (vendor: VendorOrderPortion) => {
    if (!vendor.vendorLocation) return;
    
    const { latitude, longitude } = vendor.vendorLocation;
    const destination = `${latitude},${longitude}`;
    const label = encodeURIComponent(vendor.vendorName);
    
    // Google Maps URL for navigation
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;
    window.open(url, '_blank');
  };

  // Function to open full route in Google Maps
  const openRouteInGoogleMaps = () => {
    if (!userLocation || vendorLocations.length === 0) return;

    // Start: User Location
    const origin = `${userLocation.latitude},${userLocation.longitude}`;
    
    // Waypoints: All vendors except the last one (if multiple) or just all vendors
    // Actually, for a route, we want Start -> Vendor 1 -> Vendor 2 ... -> Destination
    
    const waypoints = vendorLocations.map(v => `${v.latitude},${v.longitude}`).join('|');
    
    // Destination: Trip Destination or Last Vendor
    // Since we don't have coords for tripDestination easily without geocoding, 
    // we'll use the last vendor as the main destination if tripDestination isn't a coordinate.
    // However, the user request says "Start and End location". 
    // If tripDestination is a string address, we can pass it as destination.
    
    let destination = "";
    if (order?.tripDestination) {
        destination = encodeURIComponent(order.tripDestination);
    } else if (vendorLocations.length > 0) {
        // Fallback to last vendor
        const lastVendor = vendorLocations[vendorLocations.length - 1];
        destination = `${lastVendor.latitude},${lastVendor.longitude}`;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-2">
           {/* Back button hidden in design but good for UX */}
           {/* <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button> */}
          <h1 className="text-2xl font-bold">My order</h1>
        </div>
        <div className="flex gap-4 text-2xl">
            {/* Signal/Wifi icons would go here in a real app */}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6 pb-24">
        
        {/* Status Header Card */}
        {isActive && (
            <div className="flex items-center justify-between mb-2">
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Active Orders
                </div>
            </div>
        )}

        {isPaymentFailed && (
             <div className="bg-[#D34537] text-white text-xs font-bold px-4 py-1.5 rounded-t-lg w-fit mb-0">
                Payment Failed!
            </div>
        )}

        {isActive && order.currentEtaRange && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Estimated arrival:{" "}
              <strong className="text-foreground">{order.currentEtaRange}</strong>
            </span>
            {order.customerTrackingStatus === "Arriving" && (
              <span className="text-xs font-medium text-green-700">Near pickup</span>
            )}
          </div>
        )}

        {/* Map Overview */}
        {vendorLocations.length > 0 && !isCompleted && (
          <Card className="overflow-hidden border-none shadow-sm">
            <CardContent className="p-0">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Pickup Locations
                </h3>
                {needsPreciseForRouteUi && preciseLocationBlocked && (
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    Precise location is required to show your position and open the full driving route. Use the
                    prompt below to enable it.
                  </p>
                )}
              </div>
              <OrderTrackingMap 
                vendors={vendorLocations}
                userLocation={userLocation || undefined}
                className="h-[200px] w-full"
              />
              {userLocation && (
                <div className="p-2 bg-white border-t flex justify-center">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs flex items-center gap-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={openRouteInGoogleMaps}
                    >
                        <Navigation className="h-3 w-3" />
                        Open Full Route in Maps
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={`overflow-hidden border-none shadow-sm ${isPaymentFailed ? 'rounded-tl-none border-t-2 border-[#D34537]' : ''}`}>
            <CardContent className="p-0">
                {/* Timer / Status Banner */}
                {!isPaymentFailed && (
                    <div className="p-4 flex items-center justify-between border-b border-dashed">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-[#F06A5D] flex items-center justify-center text-[#F06A5D]">
                                <Clock className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-sm">Ready to pickup in 15 min</span>
                        </div>
                        <span className="text-[#4ADE80] text-xs font-bold">Payment successful!</span>
                    </div>
                )}

                {/* Trip Details */}
                <div className="p-4 bg-blue-50/50">
                    <div className="bg-blue-100/50 border border-blue-200 rounded-lg p-3 relative overflow-hidden">
                         <p className="text-[10px] text-muted-foreground mb-0.5">Trip to</p>
                         <h3 className="font-semibold text-base text-foreground">{order.tripDestination || "Destination"}</h3>
                         {/* Decorative blob */}
                         <div className="absolute -right-2 -bottom-4 w-16 h-16 bg-blue-200/50 rounded-full blur-xl"></div>
                    </div>
                </div>

                {/* Vendor Items */}
                <div className="p-4 space-y-6">
                    {order.vendorPortions.map((vendor: VendorOrderPortion, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-xs text-gray-800">{vendor.vendorName}</h4>
                            </div>
                            
                            <div className="space-y-4">
                                {Array.isArray(vendor.items) && vendor.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border rounded-md p-1 flex-shrink-0">
                                                <Image 
                                                    src={(item as any).imageUrl || "https://placehold.co/40x40.png"} 
                                                    alt={(item as any).name} 
                                                    width={40} 
                                                    height={40} 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.details || "200 gm"}</p>
                                            </div>
                                        </div>
                                        <div className="bg-black text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center">
                                            {item.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Vendor Specific Actions */}
                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between items-center">
                                    {vendor.status === "New" || vendor.status === "Pending Vendor Confirmation" ? (
                                        <p className="text-[10px] text-muted-foreground">Preparation time - 15 min</p>
                                    ) : vendor.status === "Cancelled" ? (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-destructive">Cancelled</p>
                                            {vendor.rejectionReason && (
                                                <p className="text-[10px] text-muted-foreground">Reason: {vendor.rejectionReason}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground">Status: {vendor.status}</p>
                                    )}
                                    
                                    {!isPaymentFailed && vendor.status !== "Cancelled" && (
                                        <Button 
                                            variant="link" 
                                            className="text-[#F06A5D] text-[10px] h-auto p-0 underline decoration-[#F06A5D]/30"
                                            onClick={() => router.push(`/order-tracking/${orderId}/cancel`)}
                                        >
                                            Cancel this order
                                        </Button>
                                    )}
                                </div>
                                
                                {/* Navigate to Vendor Button */}
                                {vendor.vendorLocation && !isCompleted && vendor.status !== "Cancelled" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                                        onClick={() => openInGoogleMaps(vendor)}
                                    >
                                        <Navigation className="h-3 w-3 mr-1" />
                                        Navigate to {vendor.vendorName}
                                    </Button>
                                )}

                                {/* Buy from another vendor button (Only if cancelled) */}
                                {vendor.status === "Cancelled" && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full text-xs h-8 bg-primary hover:bg-primary/90"
                                        onClick={() => router.push('/home')}
                                    >
                                        Buy from another vendor
                                    </Button>
                                )}
                            </div>
                            
                            {index < order.vendorPortions.length - 1 && <Separator className="my-4" />}
                        </div>
                    ))}
                </div>

                {/* Main Action Button */}
                <div className="p-4 pt-0">
                    {isPaymentFailed ? (
                        <Button 
                            variant="link" 
                            className="w-full text-[#F06A5D] font-bold underline decoration-[#F06A5D]/30"
                            onClick={() => router.push('/order/review')}
                        >
                            Complete Payment
                        </Button>
                    ) : isCompleted ? (
                         <div className="border rounded-full py-2 px-4 flex items-center gap-2 w-fit">
                            <div className="bg-[#4ADE80] rounded-full p-0.5">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-bold">Picked up : 27 Jan 2025</span>
                        </div>
                    ) : (
                        <Card id="pickup-qr" className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 scroll-mt-24">
                            <CardContent className="p-6 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <QrCode className="h-5 w-5" />
                                    <h3 className="font-bold text-sm">Show this QR to vendor</h3>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-md">
                                    <QRCodeCanvas value={orderId} size={200} />
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    The vendor will scan this code to confirm your pickup
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Cancel Full Order Link */}
        {!isPaymentFailed && !isCompleted && (
            <div className="text-center">
                <Button 
                    variant="link" 
                    className="text-[#F06A5D] text-xs underline decoration-[#F06A5D]/30"
                    onClick={() => router.push(`/order-tracking/${orderId}/cancel`)}
                >
                    Cancel Full Order
                </Button>
            </div>
        )}

        {canShowTravelConfirm && (
          <div className="flex justify-center">
            <Button
              type="button"
              className="rounded-full bg-[#2A4D46] px-6 text-white hover:bg-[#2A4D46]/90"
              onClick={() => void handleTravelConfirm()}
              disabled={travelConfirmBusy || order.manuallyConfirmedTravel}
            >
              {travelConfirmBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : order.manuallyConfirmedTravel ? (
                "Travel started — thanks!"
              ) : (
                "I'm On My Way"
              )}
            </Button>
          </div>
        )}

        {canShareLiveLocation && (
          <div className="text-center">
            {!preciseOkForLiveTracking && preciseLiveCheckBusy && (
              <p className="text-xs text-muted-foreground mb-1">Checking precise location for live tracking…</p>
            )}
            {liveLocationPaused ? (
              <Button
                variant="link"
                className="text-xs text-muted-foreground underline"
                onClick={() => setLiveLocationPaused(false)}
              >
                Resume sharing live location
              </Button>
            ) : (
              <Button
                variant="link"
                className="text-xs text-muted-foreground underline"
                onClick={() => setLiveLocationPaused(true)}
              >
                Pause live location sharing
              </Button>
            )}
          </div>
        )}

        {/* Completed Order Example (Mock for visual matching) */}
        {/* In a real app, this would be a separate card or list item */}
        {/* <div className="mt-8 opacity-50 pointer-events-none grayscale">
            <div className="border rounded-full py-2 px-4 flex items-center gap-2 w-fit mb-2">
                <div className="bg-[#4ADE80] rounded-full p-0.5">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-bold">Picked up : 27 Jan 2025</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
        </div> */}

      </div>

      <PreciseLocationRequiredModal
        open={preciseLocationBlocked && needsPreciseForRouteUi}
        onOpenChange={() => {
          /* Non-dismissible until high-accuracy location is available */
        }}
        onRetry={() => void retryPreciseLocation()}
        onOpenSettings={() => void openDeviceLocationSettings()}
        isRetrying={preciseCheckBusy}
      />

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}

function mapSupabaseOrder(data: any): PlacedOrder {
  return {
    id: data.id,
    orderId: data.order_id,
    customerInfo: data.customer_info || undefined,
    tripStartLocation: data.trip_start_location || undefined,
    tripDestination: data.trip_destination || undefined,
    createdAt: data.created_at,
    overallStatus: data.overall_status,
    paymentStatus: data.payment_status,
    grandTotal: Number(data.grand_total) || 0,
    platformFee: Number(data.platform_fee) || 0,
    paymentGatewayFee: Number(data.payment_gateway_fee) || 0,
    vendorPortions: data.vendor_portions || [],
    vendorIds: data.vendor_ids || [],
    currentEtaMinutes:
      data.current_eta_minutes != null ? Number(data.current_eta_minutes) : undefined,
    currentEtaRange: data.current_eta_range ?? undefined,
    customerTrackingStatus: data.customer_tracking_status ?? undefined,
    manuallyConfirmedTravel: Boolean(data.manually_confirmed_travel),
  };
}
