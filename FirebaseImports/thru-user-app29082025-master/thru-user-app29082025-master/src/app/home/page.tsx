import { redirect } from 'next/navigation';

/** Legacy home URL — order flow is the primary experience */
export default function HomeRedirectPage() {
  redirect('/order/destination');
}
