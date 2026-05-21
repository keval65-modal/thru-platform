# ✅ Vendor Signup Fix - Dual Database Sync

## 🔴 **Problem:**
Vendors were signing up successfully in Firebase, but **NOT appearing in the user app** because the user app queries Supabase!

---

## ✅ **Solution: Dual Database Sync**

Now when a vendor signs up, they are automatically saved to **BOTH** databases:

### **1. Firebase (Legacy)**
- Used for vendor app authentication
- Used for existing order processing
- Vendor panel relies on this

### **2. Supabase (New)**
- Used by user app to find vendors
- Used for menu items
- Required for vendors to appear on `/home`

---

## 🔧 **What Was Changed:**

### **File: `src/lib/supabase.ts`**
Added `vendorService.upsertVendor()` to sync vendors to Supabase:

```typescript
export const vendorService = {
  async upsertVendor(vendorData: {
    id: string // Firebase UID
    name: string
    email: string
    phone: string
    address: string
    city: string
    latitude: number
    longitude: number
    store_type: string
    // ... more fields
  }): Promise<void> {
    await supabase.from('vendors').upsert({
      // ... vendor data with GeoJSON location
      is_active: true,
      is_active_on_thru: true,
      grocery_enabled: true
    })
  }
}
```

### **File: `src/app/signup/actions.ts`**
Updated `handleSignup()` to save to both databases:

```typescript
// 3. Create vendor document in Firestore
await db.collection('vendors').doc(uid).set(dataToSave);

// 3b. ALSO save to Supabase so user app can find this vendor!
try {
  await vendorService.upsertVendor({
    id: uid,
    name: vendorData.shopName,
    // ... all vendor fields
  });
  console.log(`✅ Successfully synced vendor to Supabase - visible to users!`);
} catch (supabaseError) {
  console.error(`⚠️ Warning: Supabase sync failed`);
  // Signup still succeeds even if Supabase fails
}
```

---

## 🧪 **Testing Instructions:**

### **1. Sign Up a New Vendor**
```
Go to: https://merchant.kiptech.in/signup
Fill in:
- Shop Name: "Test Cafe 123"
- Store Category: "Cafe"
- Email: test123@example.com
- Password: testpass123
- Phone: +91 9876543210
- Latitude: 18.520430
- Longitude: 73.856743
- Address: (fill in)
- Hours: (fill in)
Click "Register"
```

### **2. Check Firebase (Vendor App)**
```
Login to vendor dashboard → Should work ✅
```

### **3. Check Supabase (User App)**
```
Go to: https://thru-user-app29082025-master.vercel.app/home
Select route near the vendor's location
Click "Plan Route"
Search for "Food"
→ Your new vendor should appear! ✅
```

---

## 📊 **Database Structure:**

### **Firebase Firestore:**
```
vendors/
  └── {uid}/
      ├── shopName
      ├── storeCategory
      ├── latitude
      ├── longitude
      └── ... (all fields)
```

### **Supabase:**
```
vendors table:
  ├── id (UUID - same as Firebase UID)
  ├── name
  ├── store_type
  ├── location (GeoJSON Point)
  ├── is_active: true
  ├── is_active_on_thru: true
  ├── grocery_enabled: true
  └── ... (normalized fields)
```

---

## ⚠️ **Important Notes:**

1. **Existing vendors** (registered before this fix) are already in Supabase from previous manual sync
2. **New vendors** (after this deployment) will automatically appear in both
3. If Supabase save fails, signup still succeeds (fails gracefully)
4. Vendor location is stored as GeoJSON Point in Supabase for efficient geo queries

---

## 🚀 **Deployment:**

**Deployed:** ✅  
**URL:** https://thru-vendor-dashboard-69gmv88i4-keval65-modals-projects.vercel.app  
**Date:** November 4, 2025

---

## 🔍 **Troubleshooting:**

### **If vendor still doesn't appear in user app:**

1. **Check Supabase env vars are set** in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Check vendor's location is valid:**
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Not (0, 0)

3. **Check Supabase directly:**
   ```sql
   SELECT * FROM vendors WHERE email = 'test123@example.com';
   ```

4. **Check browser console** for errors during signup

---

## ✅ **Success Criteria:**

- [ ] Vendor can sign up without errors
- [ ] Vendor appears in Firebase Firestore
- [ ] Vendor appears in Supabase `vendors` table
- [ ] Vendor is visible on user app `/home` page
- [ ] Vendor's location is correct (not 0,0)
- [ ] `is_active` and `grocery_enabled` are `true`














