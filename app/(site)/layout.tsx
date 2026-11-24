import SiteHeader from "@/components/SiteHeader";
import BottomNav from "@/components/BottomNav";
import LiveRefresh from "@/components/LiveRefresh";
import SiteFooter from "@/components/SiteFooter";

export const runtime = "edge";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main><div className="app-page" hidden /><div className="wrap">{children}</div></main>
      <SiteFooter />
      <BottomNav />
      <LiveRefresh />
    </>
  );
}
