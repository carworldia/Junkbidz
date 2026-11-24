"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onInboxActivity, useInboxCount } from "./useInboxCount";

// Pages that show messages, bids or quotes. When something new arrives, these re-load their data in place
// (no full page reload, nothing you're typing is lost). The open chat page updates itself, so it's not listed.
const LIVE = [/^\/messages$/, /^\/jobs/, /^\/hauler/];

export default function LiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const count = useInboxCount(pathname);
  const [toast, setToast] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => onInboxActivity(({ grew }) => {
    const p = path.current;
    if (LIVE.some((re) => re.test(p))) {
      // Several changes often land together; refresh once.
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => router.refresh(), 300);
    }
    // Pop a notice when there's something new for you, unless you're already looking at the Inbox list.
    if (grew && p !== "/messages") {
      setToast(true);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setToast(false), 7000);
    }
  }), [router]);

  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(hideTimer.current); }, []);
  useEffect(() => { setToast(false); }, [pathname]);

  if (!toast || count === 0) return null;
  return (
    <div className="live-toast" role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span>New message or quote in your Inbox</span>
      <Link href="/messages" className="btn">Open</Link>
      <button type="button" className="x" aria-label="Dismiss" onClick={() => setToast(false)}>×</button>
    </div>
  );
}
