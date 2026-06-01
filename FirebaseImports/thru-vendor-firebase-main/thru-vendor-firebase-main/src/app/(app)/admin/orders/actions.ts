'use server';

import { getSession } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  userName: string;
  vendorName: string;
  category: string;
  amount: number;
  platformFee: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  hasIssue: boolean;
  isMedicine: boolean;
};

async function assertAdmin() {
  const s = await getSession();
  if (!s.isAuthenticated || s.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

export async function adminListOrders(searchQuery = ''): Promise<AdminOrderRow[]> {
  await assertAdmin();
  const sb = createServiceSupabaseClient();
  const { data, error } = await sb
    .from('placed_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const q = searchQuery.trim().toLowerCase();
  const rows: AdminOrderRow[] = (data ?? []).map((row) => {
    const portions = (row.vendor_portions as {
      vendorName?: string;
      vendorType?: string;
      orderType?: string;
      prescription?: unknown;
    }[]) ?? [];
    const first = portions[0];
    const isMedicine =
      first?.orderType === 'medicine' ||
      Boolean(first?.prescription) ||
      ['medical', 'pharmacy'].includes((first?.vendorType ?? '').toLowerCase());

    const vendorNames = portions.map((p) => p.vendorName).filter(Boolean).join(', ');
    const category = isMedicine
      ? 'Medicine'
      : first?.orderType ?? first?.vendorType ?? 'General';

    return {
      id: row.order_id as string,
      orderNumber: row.order_id as string,
      userName: (row.customer_info as { name?: string })?.name ?? 'Customer',
      vendorName: vendorNames || '—',
      category,
      amount: parseFloat(String(row.grand_total ?? 0)),
      platformFee: parseFloat(String(row.platform_fee ?? 0)),
      paymentStatus: String(row.payment_status ?? 'Pending'),
      status: String(row.overall_status ?? 'Unknown'),
      createdAt: String(row.created_at ?? ''),
      hasIssue: row.overall_status === 'Cancelled',
      isMedicine,
    };
  });

  if (!q) return rows;
  return rows.filter((r) => {
    const blob = `${r.orderNumber} ${r.userName} ${r.vendorName} ${r.category} ${r.status}`.toLowerCase();
    return blob.includes(q);
  });
}

export async function adminGetOrderDetail(orderId: string) {
  await assertAdmin();
  const sb = createServiceSupabaseClient();
  const { data, error } = await sb.from('placed_orders').select('*').eq('order_id', orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
