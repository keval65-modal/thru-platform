'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Options step removed — redirect legacy URLs to checkout. */
export default function OrderOptimizeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/order/review');
  }, [router]);

  return null;
}
