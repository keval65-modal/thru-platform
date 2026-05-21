import { NextRequest, NextResponse } from 'next/server';
import { v4MerchantTestVendorService } from '@/lib/test-vendors-v4-merchant';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching V4 merchant test vendors...');
    
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const vendorId = url.searchParams.get('vendorId');

    let vendors;
    if (vendorId) {
      const vendor = v4MerchantTestVendorService.getV4MerchantTestVendor(vendorId);
      vendors = vendor ? [vendor] : [];
    } else {
      vendors = v4MerchantTestVendorService.getAllV4MerchantTestVendors();
    }

    return NextResponse.json({
      success: true,
      message: 'V4 merchant test vendors fetched successfully',
      count: vendors.length,
      vendors: vendors,
      timestamp: new Date().toISOString(),
      version: 'V4-MERCHANT-CLEAN-TEST-VENDORS',
      domain: 'merchant.kiptech.in'
    });

  } catch (error) {
    console.error('❌ Error fetching V4 merchant test vendors:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch V4 merchant test vendors',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}