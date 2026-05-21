import { redirect } from 'next/navigation';

/**
 * Marketing lives in the thru-landing project. This app (app.kiptech.in) is the
 * customer product; send users straight to the main experience.
 */
export default function RootPage() {
  redirect('/home');
}
