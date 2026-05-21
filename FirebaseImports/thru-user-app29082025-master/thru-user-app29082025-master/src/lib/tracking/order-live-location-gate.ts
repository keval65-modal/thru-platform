/**
 * Shared rules for when the customer app may send live GPS pings.
 * Kept in sync with POST /api/orders/[orderId]/customer-location.
 */

export const LIVE_LOCATION_POLL_INTERVAL_MS = 10_000

export function isTerminalOrderForLiveLocation(
  overallStatus: string,
  paymentStatus: string
): boolean {
  if (paymentStatus === "Failed") return true
  if (
    overallStatus === "Completed" ||
    overallStatus === "Cancelled" ||
    overallStatus === "Expired"
  ) {
    return true
  }
  return false
}

const OVERALL_POLL_STATUSES = new Set(["Accepted", "In Progress"])

export function qualifiesForLiveLocationPing(args: {
  overallStatus: string
  paymentStatus: string
  vendorPortions?: Array<{ status?: string }>
}): boolean {
  if (isTerminalOrderForLiveLocation(args.overallStatus, args.paymentStatus)) {
    return false
  }
  return OVERALL_POLL_STATUSES.has(args.overallStatus)
}

/** UI actions (manual travel confirm, pause controls) match the same active travel window. */
export function qualifiesForPickupTravelActions(args: {
  overallStatus: string
  paymentStatus: string
}): boolean {
  return qualifiesForLiveLocationPing({
    overallStatus: args.overallStatus,
    paymentStatus: args.paymentStatus,
    vendorPortions: [],
  })
}
