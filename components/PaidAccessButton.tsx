"use client";

// TODO: Sets a client-side sessionStorage flag to grant onboarding access for this
// browser session. Sufficient for UX gating but NOT a security barrier.
// Replace with a server-signed Stripe session token before production.

import { useRouter } from "next/navigation";

interface PaidAccessButtonProps {
  sessionKey: string;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function PaidAccessButton({
  sessionKey,
  href,
  children,
  className,
}: PaidAccessButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    sessionStorage.setItem(sessionKey, "true");
    router.push(href);
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
