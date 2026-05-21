/**
 * V4 Test Vendors Configuration for Merchant App
 * Clean, comprehensive test vendor data for V4 deployment
 */

export interface TestVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  fcmToken: string;
  isActive: boolean;
  categories: string[];
  deliveryRadius: number;
  operatingHours: {
    open: string;
    close: string;
    days: string[];
  };
  capabilities: {
    fractionalSales: boolean;
    packSplitting: boolean;
    splitFeePercent?: number;
    minOrderValue: number;
  };
  rating: number;
  totalOrders: number;
  responseTime: number;
  groceryEnabled: boolean;
  storeCategory: string;
}

export const V4_MERCHANT_TEST_VENDORS: TestVendor[] = [
  {
    id: 'merchant_v4_demo_grocery_1',
    name: 'FreshMart V4 Grocery - Merchant',
    email: 'freshmart.v4@merchant.com',
    phone: '+919876543201',
    password: 'v4merchant123',
    location: {
      lat: 18.5204,
      lng: 73.8567,
      address: 'NIBM Road, Kondhwa, Pune - V4 Merchant Demo'
    },
    fcmToken: 'merchant_v4_fcm_token_grocery_1',
    isActive: true,
    categories: ['grocery'],
    deliveryRadius: 5,
    operatingHours: {
      open: '06:00',
      close: '22:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: true,
      packSplitting: true,
      splitFeePercent: 10,
      minOrderValue: 50
    },
    rating: 4.5,
    totalOrders: 150,
    responseTime: 15,
    groceryEnabled: true,
    storeCategory: 'grocery'
  },
  {
    id: 'merchant_v4_demo_grocery_2',
    name: 'QuickGrocery V4 Store - Merchant',
    email: 'quickgrocery.v4@merchant.com',
    phone: '+919876543202',
    password: 'v4merchant123',
    location: {
      lat: 18.5304,
      lng: 73.8667,
      address: 'Camp Area, Pune - V4 Merchant Demo'
    },
    fcmToken: 'merchant_v4_fcm_token_grocery_2',
    isActive: true,
    categories: ['grocery'],
    deliveryRadius: 3,
    operatingHours: {
      open: '07:00',
      close: '21:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    capabilities: {
      fractionalSales: false,
      packSplitting: false,
      minOrderValue: 100
    },
    rating: 4.2,
    totalOrders: 89,
    responseTime: 25,
    groceryEnabled: true,
    storeCategory: 'grocery'
  }
];

export class V4MerchantTestVendorService {
  /**
   * Get all V4 merchant test vendors
   */
  getAllV4MerchantTestVendors(): TestVendor[] {
    return V4_MERCHANT_TEST_VENDORS;
  }

  /**
   * Get V4 merchant test vendor by ID
   */
  getV4MerchantTestVendor(vendorId: string): TestVendor | undefined {
    return V4_MERCHANT_TEST_VENDORS.find(vendor => vendor.id === vendorId);
  }
}

export const v4MerchantTestVendorService = new V4MerchantTestVendorService();