"use client"

import * as React from "react"
import type { PlacedOrder } from "@/lib/orderModels"
import { useToast } from "@/hooks/use-toast"
import { ActiveOrderLocationPollController } from "@/lib/tracking/active-order-location-poll-controller"
import { ToastAction } from "@/components/ui/toast"
import { openDeviceLocationSettings } from "@/lib/precise-location-for-tracking"

/**
 * Isolated GPS → backend loop for Accepted / In Progress pickup orders.
 * Requires allowLiveTracking (precise location OK) before polling starts.
 */
export function useActiveOrderLocationPolling(args: {
  orderId: string | undefined
  order: PlacedOrder | null
  toast: ReturnType<typeof useToast>["toast"]
  userPaused: boolean
  allowLiveTracking: boolean
}): void {
  const { orderId, order, toast, userPaused, allowLiveTracking } = args
  const orderRef = React.useRef(order)
  orderRef.current = order
  const userPausedRef = React.useRef(userPaused)
  userPausedRef.current = userPaused
  const allowRef = React.useRef(allowLiveTracking)
  allowRef.current = allowLiveTracking

  const controllerRef = React.useRef<ActiveOrderLocationPollController | null>(null)

  React.useEffect(() => {
    if (!orderId) return

    const controller = new ActiveOrderLocationPollController({
      orderId,
      getOrder: () => orderRef.current,
      isUserPaused: () => userPausedRef.current,
      allowLiveTracking: () => allowRef.current,
      onPermissionLost: () => {
        toast({
          variant: "destructive",
          title: "Live location paused",
          description: "Please re-enable location so we can keep updating your position for this order.",
          action: (
            <ToastAction altText="Open settings" onClick={() => void openDeviceLocationSettings()}>
              Settings
            </ToastAction>
          ),
        })
      },
    })

    controllerRef.current = controller
    controller.sync()

    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [orderId, toast])

  React.useEffect(() => {
    controllerRef.current?.sync()
  }, [order, userPaused, allowLiveTracking])
}
