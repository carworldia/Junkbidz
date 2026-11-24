"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeSwitch from "./ThemeSwitch";
import SignOut from "./SignOut";
import { MenuIcon } from "./Icons";
import { useInboxCount } from "./useInboxCount";

export default function Nav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [hauler, setHauler] = useState(false);
  const [open, setOpen] = useState(false);
  const count = useInboxCount(pathname);
  const unread = signedIn ? count : 0;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setUserId(data.session?.user.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setSignedIn(!!session); setUserId(session?.user.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cosmetic only: /admin is blocked on the server and in the database.
  useEffect(() => {
    setAdmin(false); setHauler(false);
    if (!userId) return;
    let live = true;
    const supabase = createClient();
    supabase.rpc("is_admin").then(({ data }) => { if (live) setAdmin(data === true); });
    supabase.from("hauler_profiles").select("user_id").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (live) setHauler(!!data); });
    return () => { live = false; };
  }, [userId]);

  useEffect(() => { setOpen(false); }, [pathname]);
  if (signedIn === null) return null;

  const link = (href: string, label: React.ReactNode) => (
    <Link href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
  );
  const badge = unread > 0 && <span className="badge-count notify" aria-label={`${unread} need your attention`}>{unread > 99 ? "99+" : unread}</span>;

  return (
    <>
      <button type="button" className="menu-btn" aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
        <MenuIcon open={open} />
        {!open && badge}
      </button>
      <nav id="site-nav" className={`navlinks${open ? " open" : ""}`} aria-label="Main">
        {signedIn ? (
          <>
            {link("/post", "Post a job")}
            {link("/jobs", "My jobs")}
            {hauler ? link("/hauler", "Company dashboard") : link("/become-hauler", "For companies")}
            {link("/messages", <>Inbox{badge}</>)}
            {admin && link("/admin", "Admin")}
            {link("/account", "Account")}
            <SignOut />
          </>
        ) : (
          <>
            {link("/demo", "Try the demo")}
            {link("/how-it-works", "How it works")}
            {link("/become-hauler", "For companies")}
            {link("/login", "Log in")}
            <Link href="/signup" className="btn">Sign up</Link>
          </>
        )}
        <ThemeSwitch className="ts-menu" />
      </nav>
    </>
  );
}
