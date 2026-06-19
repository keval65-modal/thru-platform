"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Home,
  Loader2,
  MapPin,
  Package,
  QrCode,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";

import BottomNav from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import type { PlacedOrder, VendorOrderPortion } from "@/lib/orderModels";
import { getSupabaseClient } from "@/lib/supabase/client";

type OrdersTab = "active" | "recent" | "cancelled";

const ACTIVE_STATUSES = new Set([
  "New",
  "Pending Confirmation",
  "Accepted",
  "Confirmed",
  "In Progress",
  "Ready for Pickup",
]);

const RECENT_STATUSES = new Set(["Completed", "Expired"]);

const TAB_CONFIG: Array<{ id: OrdersTab; label: string }> = [
  { id: "active", label: "Active orders" },
  { id: "recent", label: "Recent orders" },
  { id: "cancelled", label: "Cancelled orders" },
];

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
    currentEtaMinutes: data.current_eta_minutes ?? undefined,
    currentEtaRange: data.current_eta_range ?? undefined,
    customerTrackingStatus: data.customer_tracking_status ?? undefined,
    manuallyConfirmedTravel: data.manually_confirmed_travel ?? undefined,
  };
}

function formatDate(value: PlacedOrder["createdAt"]): string {
  const raw = typeof value === "string" ? value : value?.toDate?.()?.toISOString?.();
  const date = raw ? new Date(raw) : new Date();

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function getStatusStyle(status: string): string {
  if (status === "Cancelled") return "bg-red-100 text-red-700";
  if (status === "Completed") return "bg-emerald-100 text-emerald-700";
  if (status === "Ready for Pickup") return "bg-blue-100 text-blue-700";
  if (status === "In Progress" || status === "Preparing") return "bg-amber-100 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function getStatusLabel(status: string): string {
  if (status === "New") return "Sent to vendor";
  if (status === "Pending Confirmation") return "Awaiting vendor confirmation";
  return status;
}

function isCancelled(order: PlacedOrder): boolean {
  return order.overallStatus === "Cancelled" || order.vendorPortions.every((portion) => portion.status === "Cancelled");
}

function isRecent(order: PlacedOrder): boolean {
  return RECENT_STATUSES.has(order.overallStatus);
}

function isActive(order: PlacedOrder): boolean {
  return !isCancelled(order) && ACTIVE_STATUSES.has(order.overallStatus);
}

function getPickupShops(order: PlacedOrder): string {
  const names = order.vendorPortions.map((portion) => portion.vendorName).filter(Boolean);
  return names.length > 0 ? names.join(" · ") : "Pickup shops pending";
}

function getItemCount(order: PlacedOrder): number {
  return order.vendorPortions.reduce(
    (sum, portion) => sum + portion.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
}

function OrderEmptyState({ tab }: { tab: OrdersTab }) {
  const router = useRouter();
  const copy = {
    active: {
      title: "No active orders",
      description: "Start an order and track live vendor updates here.",
    },
    recent: {
      title: "No recent orders",
      description: "Completed orders will appear here with totals and pickup shops.",
    },
    cancelled: {
      title: "No cancelled orders",
      description: "Orders you cancel will be listed here.",
    },
  }[tab];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
      <h2 className="mb-2 text-xl font-semibold">{copy.title}</h2>
      <p className="mb-6 max-w-xs text-muted-foreground">{copy.description}</p>
      {tab === "active" ? (
        <Button onClick={() => router.push("/order/destination")}>Start Planning Trip</Button>
      ) : null}
    </div>
  );
}

function VendorStatusList({ portions }: { portions: VendorOrderPortion[] }) {
  if (portions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Store className="h-4 w-4 text-primary" />
        Vendor updates
      </p>
      <div className="space-y-2">
        {portions.map((portion) => (
          <div key={portion.vendorId} className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{portion.vendorName}</p>
                {portion.vendorAddress ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{portion.vendorAddress}</p>
                ) : null}
                {portion.rejectionReason ? (
                  <p className="mt-1 text-xs text-red-600">{portion.rejectionReason}</p>
                ) : null}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(portion.status)}`}>
                {getStatusLabel(portion.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  tab,
  cancelling,
  onCancel,
}: {
  order: PlacedOrder;
  tab: OrdersTab;
  cancelling: boolean;
  onCancel: (order: PlacedOrder) => void;
}) {
  const router = useRouter();
  const itemCount = getItemCount(order);

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">Order #{order.orderId}</CardTitle>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(order.createdAt)}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyle(order.overallStatus)}`}>
            {getStatusLabel(order.overallStatus)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tab === "active" ? <VendorStatusList portions={order.vendorPortions} /> : null}

        {tab !== "active" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span className="text-lg font-bold text-primary">{formatInr(order.grandTotal)}</span>
            </div>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{getPickupShops(order)}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/20 p-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Cart total</span>
              <span className="font-bold text-primary">{formatInr(order.grandTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{getPickupShops(order)}</p>
          </div>
        )}

        {tab === "cancelled" && order.customerInfo?.cancellation?.reason ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            Cancelled: {order.customerInfo.cancellation.reason}
          </p>
        ) : null}

        <Separator />

        <div className={tab === "active" ? "grid grid-cols-1 gap-2 sm:grid-cols-3" : "grid grid-cols-1 gap-2 sm:grid-cols-2"}>
          <Button variant="outline" onClick={() => router.push(`/order-tracking/${order.orderId}`)}>
            Track Order
          </Button>
          {tab === "active" ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/order-tracking/${order.orderId}#pickup-qr`)}>
                <QrCode className="mr-2 h-4 w-4" />
                Show Pickup QR
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={cancelling}
                onClick={() => onCancel(order)}
              >
                {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Cancel order
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => getSupabaseClient(), []);
  const [orders, setOrders] = React.useState<PlacedOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<OrdersTab>("active");
  const [cancellingOrderId, setCancellingOrderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
    });

    return () => unsubscribe?.();
  }, []);

  const loadOrders = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("placed_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(75);

      if (error) throw error;

      const mapped = (data || []).map(mapSupabaseOrder).filter((order) => {
        const ownerId = order.customerInfo?.id;
        return !ownerId || !userId || ownerId === userId;
      });

      setOrders(mapped);
    } catch (error) {
      console.error("Error fetching placed orders:", error);
      toast({
        title: "Error fetching orders",
        description: "Could not retrieve your orders. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast, userId]);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  React.useEffect(() => {
    const channel = supabase
      .channel("customer-placed-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "placed_orders",
        },
        () => {
          void loadOrders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadOrders, supabase]);

  const grouped = React.useMemo(
    () => ({
      active: orders.filter(isActive),
      recent: orders.filter((order) => !isCancelled(order) && isRecent(order)),
      cancelled: orders.filter(isCancelled),
    }),
    [orders]
  );

  const currentOrders = grouped[activeTab];

  const handleCancelOrder = async (order: PlacedOrder) => {
    const confirmed = window.confirm(`Cancel order #${order.orderId}? The vendor will be notified.`);
    if (!confirmed) return;

    setCancellingOrderId(order.orderId);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderId)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by customer from orders page" }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not cancel order");
      }

      toast({
        title: "Order cancelled",
        description: "The cancellation has been sent to the vendor.",
      });
      await loadOrders();
      setActiveTab("cancelled");
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background p-4 shadow-sm">
        <div className="flex-1" />
        <h1 className="flex-1 text-center text-2xl font-semibold text-foreground">My Orders</h1>
        <div className="flex flex-1 justify-end">
          <Button variant="ghost" size="icon" onClick={() => router.push("/order/destination")}>
            <Home className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="grid grid-cols-3 rounded-2xl bg-muted/50 p-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Fetching your orders...</p>
            </div>
          ) : currentOrders.length === 0 ? (
            <OrderEmptyState tab={activeTab} />
          ) : (
            <div className="space-y-4">
              {currentOrders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  tab={activeTab}
                  cancelling={cancellingOrderId === order.orderId}
                  onCancel={handleCancelOrder}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
