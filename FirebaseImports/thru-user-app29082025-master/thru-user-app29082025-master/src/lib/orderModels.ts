import type { Timestamp } from 'firebase/firestore';

// This is the data structure for a document in the 'orders' collection.
export interface PlacedOrder {
  id?: string; // Optional because it's the doc ID
  orderId: string;
  customerInfo?: {
    id?: string;
    name?: string;
    phoneNumber?: string;
  };
  tripStartLocation?: string;
  tripDestination?: string;
  createdAt: string | Timestamp; // Allow both for flexibility
  overallStatus: "Pending Confirmation" | "Accepted" | "Confirmed" | "In Progress" | "Ready for Pickup" | "Completed" | "Cancelled" | "New" | "Expired";
  paymentStatus: "Paid" | "Pending" | "Failed";
  grandTotal: number;
  platformFee: number;
  paymentGatewayFee: number;
  vendorPortions: VendorOrderPortion[];
  vendorIds: string[]; // NEW: Used for efficient querying.
  /** Populated from Supabase travel tracking columns when present */
  currentEtaMinutes?: number;
  currentEtaRange?: string;
  customerTrackingStatus?: string;
  manuallyConfirmedTravel?: boolean;
}

// This describes a single item within a vendor's portion of the order.
export interface OrderItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  pricePerItem: number;
  totalPrice: number;
  imageUrl?: string;
  dataAiHint?: string;
  details?: string;
  /** Medicine: alternative suggested by pharmacy */
  alternativeName?: string;
  available?: boolean;
  vendorNote?: string;
}

/** Prescription attached to pharmacy orders (stored in vendor_portions JSON). */
export interface PrescriptionMetadata {
  imageDataUri?: string;
  prescriptionDate?: string;
  dateValid?: boolean;
  doctorName?: string;
  aiRawNotes?: string;
  medicines?: {
    id: string;
    name: string;
    dosage?: string;
    quantity: number;
    available?: boolean;
    alternativeName?: string;
    pricePerItem?: number;
    totalPrice?: number;
    vendorNote?: string;
  }[];
}

// Each order document contains an array of these portions, one for each vendor involved.
export interface VendorOrderPortion {
  vendorId: string; 
  vendorName: string;
  vendorAddress?: string;
  vendorType?: string;
  vendorLocation?: { latitude: number; longitude: number }; // For map display
  status: "New" | "Preparing" | "Ready for Pickup" | "Picked Up" | "Cancelled" | "Pending Vendor Confirmation"; 
  rejectionReason?: string; // Reason for cancellation/rejection 
  items: OrderItemDetail[];
  vendorSubtotal: number;
  /** medicine | grocery | food */
  orderType?: string;
  prescription?: PrescriptionMetadata;
}
