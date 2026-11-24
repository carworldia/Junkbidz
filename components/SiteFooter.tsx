import Link from "next/link";
import LogoMark from "./LogoMark";
import ThemeSwitch from "./ThemeSwitch";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const COLS = [
  { h: "Customers", links: [["/post", "Post a job"], ["/jobs", "My jobs"], ["/messages", "Inbox"]] },
  { h: "Companies", links: [["/become-hauler", "Join as a company"], ["/hauler", "Company dashboard"]] },
  { h: SITE_NAME, links: [["/how-it-works", "How it works"], ["/terms", "Terms"], ["/privacy", "Privacy"], [`mailto:${CONTACT_EMAIL}`, "Contact"]] },
];

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-brand">
          <Link href="/" className="logo" aria-label={`${SITE_NAME} home`}>
            <span className="logo-default"><LogoMark size={30} /><span className="jk-word">{SITE_NAME}</span></span>
          </Link>
          <p>Post your junk once. Local junk removal companies send you quotes. Pick the one you like and chat in the app.</p>
        </div>
        <nav className="foot-cols" aria-label="Footer">
          {COLS.map((c) => (
            <div key={c.h}>
              <h2>{c.h}</h2>
              <ul>{c.links.map(([href, label]) => <li key={href}>{href.startsWith("mailto:") ? <a href={href}>{label}</a> : <Link href={href}>{label}</Link>}</li>)}</ul>
            </div>
          ))}
        </nav>
        <div className="foot-base">
          <span>© {new Date().getFullYear()} {SITE_NAME} · Free for customers</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <ThemeSwitch className="ts-foot" />
        </div>
      </div>
    </footer>
  );
}
