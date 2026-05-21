
# Project Brief: Thru Vendor Application

## 1. Project Overview

The "Thru Vendor" application is a comprehensive web platform for businesses (vendors) to manage their presence on the "Thru" marketplace. It allows vendors to sign up, manage their inventory and product listings, process customer orders in real-time, and update their shop profiles. The application includes specialized features for different types of vendors (e.g., restaurants, grocery stores, standard retail) and leverages AI for advanced inventory management tasks. It also includes a separate, protected admin panel for platform administrators to manage vendors.

## 2. Technology Stack

*   **Framework**: Next.js 15+ with App Router
*   **Language**: TypeScript
*   **UI Library**: React with ShadCN UI components
*   **Styling**: Tailwind CSS
*   **Backend & Database**: Firebase (Authentication, Firestore, Storage)
*   **AI/Generative Features**: Google's Genkit with Gemini models

## 3. Core Features

*   **Vendor Authentication**: Secure signup and login for vendors.
*   **Order Dashboard**: A real-time view of incoming orders with status tabs.
*   **Order Management**: Ability to view order details and update status (e.g., Accepted, Preparing, Ready).
*   **Inventory Management**: A flexible interface to manage product listings, which adapts to the vendor's category (e.g., AI menu extraction for restaurants, global catalog linking for groceries, custom items for retail).
*   **Pickup Confirmation**: Functionality to confirm customer pickups, potentially using QR codes.
*   **AI Stock Alerting**: An AI-powered tool to predict low-stock items and suggest restocking based on historical data.

## 4. Style Guidelines

*   **Primary Color**: `#F6675E` (to be used for key interactive elements like buttons).
*   **Background Color**: Light gray `#F0F0F0` (for the main app background).
*   **Accent Color**: Orange `#FFA500` (for highlighting important actions and notifications).
*   **Font**: DM Sans (for a modern, neutral look).
*   **Icons**: Use clean, easily recognizable icons (e.g., from `lucide-react`).
*   **Layout**: Responsive and optimized for tablet and desktop use.

## 5. Key Implementation Details

### 5.1. Authentication

*   **Vendor Signup (`/signup`)**: A multi-field form submitting to a Server Action (`handleSignup`) that creates a Firebase Auth user, a Firestore `vendors` document (with the UID as the ID), and uploads a shop image to Storage.
*   **Vendor Login (`/login`)**: A simple form submitting to a Server Action (`handleLogin`) that validates credentials and sets a session cookie.
*   **Session Management**: A simple, secure, HTTP-only cookie (`thru_vendor_auth_token`) containing the Firebase Auth UID. Middleware protects routes.

### 5.2. Inventory Management (`/inventory`)

*   The UI/UX adapts based on the vendor's `storeCategory`.
*   **Restaurants**: Feature for uploading a PDF menu, processed by an AI flow (`extractMenuData`) to populate the inventory.
*   **Grocery/Pharmacy**: Feature to search and link items from a `global_items` collection.
*   **General Retail**: A straightforward interface for adding and managing custom products.
*   All vendor-specific items are stored in a `vendors/{vendorId}/inventory` subcollection.

### 5.3. Order Management (`/orders`)

*   The main orders page (`/orders`) listens for real-time order updates from Firestore using `onSnapshot`.
*   It queries the `orders` collection where `vendorIds` array-contains the current vendor's UID.
*   Vendors can update their portion of an order's status via a server action (`updateVendorOrderStatus`).

### 5.4. Admin Panel (`/admin`)

*   A protected area for platform administrators.
*   Login is handled via a hardcoded UID for simplicity (`ADMIN_UID`).
*   The admin panel allows viewing all vendors, editing their core details (name, category, active status), and deleting them (which also deletes their inventory).
