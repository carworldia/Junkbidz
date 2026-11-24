import Link from "next/link";
import Nav from "./Nav";
import LogoMark from "./LogoMark";
import { SITE_NAME } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="logo" aria-label={`${SITE_NAME} home`}>
          <span className="logo-default"><LogoMark size={30} /><span className="jk-word">{SITE_NAME}</span></span>
        </Link>
        <span className="spacer" />
        <Nav />
      </div>
    </header>
  );
}
