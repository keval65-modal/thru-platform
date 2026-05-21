import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const responseData = await request.json();
    console.log('📨 Received vendor response in user app:', responseData);

    const { 
      orderId, 
      vendorId, 
      vendorName, 
      status, 
      totalPrice, 
      estimatedReadyTime, 
      notes,
      counterOffer
    } = responseData;

    // Validate required fields
    if (!orderId || !vendorId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: orderId, vendorId, status'
      }, { status: 400 });
    }

    const db = adminDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin not initialized'
      }, { status: 500 });
    }

    // Create vendor response document with correct structure for enhanced-order-service
    const vendorResponse = {
      shopId: vendorId, // Use vendorId as shopId for compatibility
      orderId,
      responseTime: Math.floor(Date.now() / 1000), // in seconds
      status, // 'accepted', 'rejected', 'counter_offer'
      availableItems: [
        // For now, create a simple available items structure
        // This could be enhanced to parse actual order items
        {
          productId: 'item-1',
          quantity: 1,
          price: totalPrice || 0
        }
      ],
      missingItems: [], // No missing items for now
      estimatedPreparationTime: 30, // Default 30 minutes
      notes: notes || null,
      respondedAt: Timestamp.now(), // Use Firestore Timestamp for proper ordering
      // Additional fields for compatibility
      vendorName: vendorName || 'Unknown Vendor',
      totalPrice: totalPrice || 0,
      estimatedReadyTime: estimatedReadyTime || null,
      counterOffer: counterOffer || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save vendor response to Firestore
    const responseRef = await db.collection('vendor-responses').add(vendorResponse);
    console.log(`✅ Vendor response saved with ID: ${responseRef.id}`);

    // Update the grocery order with vendor response
    const orderRef = db.collection('groceryOrders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (orderDoc.exists) {
      const orderData = orderDoc.data();
      let orderStatus = 'pending';

      switch (status) {
        case 'accepted':
          orderStatus = 'vendor_accepted';
          break;
        case 'rejected':
          orderStatus = 'vendor_rejected';
          break;
        case 'counter_offer':
          orderStatus = 'counter_offer_received';
          break;
        default:
          orderStatus = 'pending';
      }

      // Update order with vendor response
      await orderRef.update({
        status: orderStatus,
        updatedAt: new Date(),
        [`vendorResponses.${vendorId}`]: {
          status,
          totalPrice,
          estimatedReadyTime,
          notes,
          respondedAt: new Date(),
          vendorName
        }
      });

      console.log(`✅ Order ${orderId} updated with vendor response from ${vendorName}`);
    } else {
      console.warn(`⚠️ Order ${orderId} not found in groceryOrders collection`);
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor response processed successfully',
      responseId: responseRef.id,
      orderStatus: orderDoc.exists ? 'updated' : 'not_found'
    });

  } catch (error) {
    console.error('❌ Error processing vendor response in user app:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve vendor responses for an order
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/vendor-responses called');
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    console.log('📋 OrderId parameter:', orderId);

    const db = adminDb();
    if (!db) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    console.log('✅ Firebase Admin initialized successfully');

    let responsesSnapshot;
    
    if (orderId) {
      // Get responses for specific order
      console.log(`🔍 Fetching vendor responses for order: ${orderId}`);
      responsesSnapshot = await db.collection('vendor-responses')
        .where('orderId', '==', orderId)
        .get();
    } else {
      // Get all responses (for debugging)
      console.log('🔍 Fetching all vendor responses');
      responsesSnapshot = await db.collection('vendor-responses')
        .limit(10)
        .get();
    }

    console.log(`📊 Query executed, found ${responsesSnapshot.size} documents`);

    const responses = responsesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Processed ${responses.length} vendor responses`);

    return NextResponse.json({
      success: true,
      responses,
      count: responses.length
    });

  } catch (error) {
    console.error('❌ Error getting vendor responses:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
