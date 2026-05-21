import type { PlacedOrder } from "@/lib/orderModels"
import {
  LIVE_LOCATION_POLL_INTERVAL_MS,
  qualifiesForLiveLocationPing,
  isTerminalOrderForLiveLocation,
} from "@/lib/tracking/order-live-location-gate"

export type PermissionLostNotifier = () => void

type ControllerOptions = {
  orderId: string
  getOrder: () => PlacedOrder | null
  isUserPaused: () => boolean
  /** Precise/high-accuracy permission satisfied; live tracking must not start without it. */
  allowLiveTracking: () => boolean
  onPermissionLost: PermissionLostNotifier
}

/**
 * Isolated GPS → API loop for active orders. Does not touch map state or route logic.
 */
export class ActiveOrderLocationPollController {
  private readonly orderId: string
  private readonly getOrder: () => PlacedOrder | null
  private readonly isUserPaused: () => boolean
  private readonly allowLiveTracking: () => boolean
  private readonly onPermissionLost: PermissionLostNotifier

  private intervalId: ReturnType<typeof setInterval> | null = null
  private permissionNotified = false
  private disposed = false

  private readonly visHandler = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      this.clearPermissionPause()
      this.sync()
    }
  }

  constructor(opts: ControllerOptions) {
    this.orderId = opts.orderId
    this.getOrder = opts.getOrder
    this.isUserPaused = opts.isUserPaused
    this.allowLiveTracking = opts.allowLiveTracking
    this.onPermissionLost = opts.onPermissionLost
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.visHandler)
    }
  }

  sync(): void {
    if (this.disposed) return

    const order = this.getOrder()
    if (!order || this.isUserPaused() || !this.allowLiveTracking()) {
      this.clearInterval()
      return
    }

    if (
      isTerminalOrderForLiveLocation(order.overallStatus, order.paymentStatus) ||
      !qualifiesForLiveLocationPing({
        overallStatus: order.overallStatus,
        paymentStatus: order.paymentStatus,
        vendorPortions: order.vendorPortions,
      })
    ) {
      this.clearInterval()
      return
    }

    if (!("geolocation" in navigator)) {
      this.clearInterval()
      return
    }

    if (!this.intervalId) {
      void this.tick()
      this.intervalId = setInterval(
        () => void this.tick(),
        LIVE_LOCATION_POLL_INTERVAL_MS
      )
    }
  }

  clearPermissionPause(): void {
    this.permissionNotified = false
  }

  dispose(): void {
    this.disposed = true
    this.clearInterval()
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visHandler)
    }
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private pauseForPermission(): void {
    this.clearInterval()
    if (this.permissionNotified) return
    this.permissionNotified = true
    this.onPermissionLost()
  }

  private async tick(): Promise<void> {
    if (this.disposed) return
    if (typeof document !== "undefined" && document.hidden) {
      return
    }
    const order = this.getOrder()
    if (
      !order ||
      this.isUserPaused() ||
      !this.allowLiveTracking() ||
      isTerminalOrderForLiveLocation(order.overallStatus, order.paymentStatus) ||
      !qualifiesForLiveLocationPing({
        overallStatus: order.overallStatus,
        paymentStatus: order.paymentStatus,
        vendorPortions: order.vendorPortions,
      })
    ) {
      this.clearInterval()
      return
    }

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const speed = pos.coords.speed
            await fetch(`/api/orders/${encodeURIComponent(this.orderId)}/customer-location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                recordedAt: new Date().toISOString(),
                speedMps:
                  speed != null && Number.isFinite(speed) && speed >= 0 ? speed : null,
                heading:
                  pos.coords.heading != null && Number.isFinite(pos.coords.heading)
                    ? pos.coords.heading
                    : null,
              }),
              credentials: "same-origin",
            })
          } catch (e) {
            console.warn("[live-location] POST failed", e)
          } finally {
            resolve()
          }
        },
        (err: GeolocationPositionError) => {
          console.warn("[live-location] geolocation error", err)
          if (err.code === 1 || err.code === 2) {
            this.pauseForPermission()
          }
          resolve()
        },
        {
          enableHighAccuracy: false,
          maximumAge: 8000,
          timeout: 15000,
        }
      )
    })
  }
}
