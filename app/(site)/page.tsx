import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ITEM_TYPES } from "@/lib/junk";
import { SITE_NAME } from "@/lib/site";
import { ChatIcon, CheckIcon, PostIcon, ShieldIcon, StarIcon, TruckIcon } from "@/components/Icons";

export const runtime = "edge";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="jk-home">
      <section className="jk-hero">
        <div>
          <span className="jk-kicker">Junk removal, made simple</span>
          <h1>Post your junk once.<br /><em>Get quotes from local haulers.</em></h1>
          <p>Tell us what needs to go. Junk removal companies near you send their best price. Compare, pick one, and chat right in the app.</p>
          <div className="row jk-cta">
            <Link className="btn big" href="/post">Post a job, it’s free</Link>
            {!user && <Link className="btn ghost big" href="/become-hauler">I run a junk removal company</Link>}
            {user && <Link className="btn ghost big" href="/jobs">My jobs</Link>}
          </div>
          <ul className="intro-points"><li><CheckIcon />Free for customers</li><li><ShieldIcon />Address stays private</li><li><StarIcon />Real reviews</li></ul>
        </div>
        <div className="jk-demo" aria-hidden="true">
          <div className="jk-demo-job"><b>Old couch + fridge</b><span>Furniture, Appliances · Half truck</span></div>
          {[["Bridge City Hauling", "★ 4.9 (112)", "$185", true], ["Greenline Removal", "★ 4.7 (64)", "$210", false], ["Northwest Junk Co.", "New", "$240", false]].map(([n, r, p, best]) => (
            <div key={String(n)} className={`jk-demo-q${best ? " best" : ""}`}><span><b>{n}</b><small>{r}</small></span><em>{p}</em></div>
          ))}
        </div>
      </section>

      <section className="jk-steps">
        <h2>How it works</h2>
        <ol>
          <li><span className="jk-step-ico"><PostIcon /></span><b>Post your job</b><p>Pick what needs to go, add a few photos and your ZIP. Takes two minutes.</p></li>
          <li><span className="jk-step-ico"><TruckIcon /></span><b>Get quotes</b><p>Approved junk removal companies near you see it and send their price.</p></li>
          <li><span className="jk-step-ico"><ChatIcon /></span><b>Choose and chat</b><p>Compare prices and reviews, ask questions in the app, and hire the one you like.</p></li>
        </ol>
      </section>

      <section className="jk-kinds">
        <h2>We haul</h2>
        <ul>{ITEM_TYPES.filter((x) => x.id !== "other").map((x) => <li key={x.id}><Link href="/post">{x.label}</Link></li>)}</ul>
      </section>

      <section className="card jk-pro">
        <div>
          <h2>Run a junk removal company?</h2>
          <p className="mute">Get local jobs sent to you. Quote the ones you want, chat with customers, and get hired. Free to join on {SITE_NAME}.</p>
        </div>
        <Link className="btn" href="/become-hauler">Join as a company</Link>
      </section>
    </div>
  );
}
