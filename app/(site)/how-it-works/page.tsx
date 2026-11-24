import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const metadata: Metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <div className="card prose" style={{ maxWidth: 760 }}>
      <h1>How {SITE_NAME} works</h1>
      <h2>For customers</h2>
      <ol>
        <li><b>Post your job.</b> Choose what needs to go, about how much there is, add photos, your ZIP and the pickup address. Your address stays private until you hire someone.</li>
        <li><b>Get quotes.</b> Every approved junk removal company whose service area covers your ZIP sees the job and can send a price.</li>
        <li><b>Compare and ask.</b> See each company’s price, rating and distance. Message them in the app, or counter their price.</li>
        <li><b>Hire one.</b> Tap “Hire”. The other quotes close, the company gets your address, and you get their phone number.</li>
        <li><b>Mark it done and review.</b> When the junk is gone, mark the job done and leave a review for the next customer.</li>
      </ol>
      <h2>For junk removal companies</h2>
      <ol>
        <li><b>Join.</b> Tell us your company name, ZIP, how far you travel and what you haul. We review every company.</li>
        <li><b>Get jobs.</b> Once approved, new jobs in your area show up on your dashboard.</li>
        <li><b>Quote and chat.</b> Send your all-in price and a note. Answer questions in the app.</li>
        <li><b>Win the job.</b> When the customer hires you, you see the address and can call them.</li>
      </ol>
      <p><Link className="btn" href="/post">Post a job</Link> <Link className="btn ghost" href="/become-hauler">Join as a company</Link></p>
    </div>
  );
}
