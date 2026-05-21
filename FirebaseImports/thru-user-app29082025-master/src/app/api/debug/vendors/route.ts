import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin not initialized'
      }, { status: 500 });
    }

    // Get all vendors
    const vendorsSnapshot = await db.collection('vendors').get();
    const allVendors = vendorsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter grocery vendors
    const groceryVendors = allVendors.filter((vendor: any) => 
      vendor.groceryEnabled === true || vendor.storeCategory === 'grocery'
    );

    // Check vendors in Pune area (around NIBM Road)
    const puneVendors = allVendors.filter((vendor: any) => {
      if (!vendor.location || !vendor.location.latitude || !vendor.location.longitude) {
        return false;
      }
      
      // Pune coordinates: roughly 18.4-18.6 lat, 73.7-73.9 lng
      const lat = vendor.location.latitude;
      const lng = vendor.location.longitude;
      
      return lat >= 18.4 && lat <= 18.6 && lng >= 73.7 && lng <= 73.9;
    });

    return NextResponse.json({
      success: true,
      totalVendors: allVendors.length,
      groceryVendors: groceryVendors.length,
      puneVendors: puneVendors.length,
      allVendors: allVendors.map((v: any) => ({
        id: v.id,
        name: v.name || 'No name',
        storeCategory: v.storeCategory || 'No category',
        groceryEnabled: v.groceryEnabled || false,
        location: v.location || 'No location',
        status: v.status || 'No status'
      })),
      groceryVendors: groceryVendors.map((v: any) => ({
        id: v.id,
        name: v.name || 'No name',
        storeCategory: v.storeCategory || 'No category',
        groceryEnabled: v.groceryEnabled || false,
        location: v.location || 'No location',
        status: v.status || 'No status'
      })),
      puneVendors: puneVendors.map((v: any) => ({
        id: v.id,
        name: v.name || 'No name',
        storeCategory: v.storeCategory || 'No category',
        groceryEnabled: v.groceryEnabled || false,
        location: v.location || 'No location',
        status: v.status || 'No status'
      }))
    });

  } catch (error) {
    console.error('Debug vendors error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


