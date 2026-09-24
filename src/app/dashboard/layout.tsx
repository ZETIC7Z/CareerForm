import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserOrNull } from '@/lib/account';

/**
 * The dashboard's door, checked on the server.
 *
 * The page itself is a client component, so its own guard only ran after the HTML had
 * already been delivered — anyone could load /dashboard, and a signed-out visitor would
 * briefly see the shell before being bounced. Running the check in the layout means the
 * redirect happens while rendering, so a signed-out request never receives dashboard
 * markup at all.
 *
 * Two things are checked, not one:
 *   1. the session cookie's HMAC signature (a forged or expired token is "no session");
 *   2. the account it points at still exists. A cookie is valid for 30 days, so an
 *      account deleted on request would otherwise keep opening a dashboard that has
 *      nothing behind it.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect('/?action=signin');

  const account = await getUserOrNull(session.email);
  if (!account) redirect('/?action=signin');

  return <>{children}</>;
}

export const dynamic = 'force-dynamic';
