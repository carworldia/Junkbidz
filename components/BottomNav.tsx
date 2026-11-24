"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BoxIcon, ChatIcon, HomeIcon, PlusIcon, UserIcon } from "./Icons";
import { useInboxCount } from "./useInboxCount";

// Phone-only tab bar (hidden ≥860px, where the header nav is used).
const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/post", label: "Post job", Icon: PlusIcon, match: (p: string) => p.startsWith("/post") },
  { href: "/jobs", label: "My jobs", Icon: BoxIcon, match: (p: string) => p.startsWith("/jobs") || p.startsWith("/hauler") },
  { href: "/messages", label: "Inbox", Icon: ChatIcon, match: (p: string) => p.startsWith("/messages") },
  { href: "/account", label: "Account", Icon: UserIcon, match: (p: string) => /^\/(account|become-|admin|login|signup)/.test(p) },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const unread = useInboxCount(pathname);

  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (unread > 0) nav.setAppBadge?.(unread).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [unread]);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map(({ href, label, Icon, match }) => {
        const on = match(pathname);
        return (
          <Link key={href} href={href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            <Icon /><span>{label}</span>
            {href === "/messages" && unread > 0 && (
              <span className="badge-count notify" aria-label={`${unread} need your attention`}>{unread > 99 ? "99+" : unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
