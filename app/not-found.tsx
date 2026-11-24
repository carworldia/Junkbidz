import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main><div className="wrap"><div className="card narrow" style={{ textAlign: "center" }}>
        <h1>Page not found</h1>
        <p className="mute">This page doesn’t exist, or you don’t have access to it.</p>
        <Link className="btn" href="/">Go home</Link>
      </div></div></main>
    </>
  );
}
