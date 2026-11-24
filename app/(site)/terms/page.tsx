import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const runtime = "edge";
export const metadata: Metadata = { title: "Terms" };

// Starter text. Have it reviewed before launch.
export default function Terms() {
  return (
    <div className="card prose" style={{ maxWidth: 760 }}>
      <h1>Terms of use</h1>
      <p>{SITE_NAME} connects people who need junk removed with independent junk removal companies. {SITE_NAME} does not perform the work and is not a party to the agreement between a customer and a company.</p>
      <h2>Customers</h2>
      <p>Describe your job honestly, including any hazardous items. Prices are agreed directly between you and the company you hire.</p>
      <h2>Companies</h2>
      <p>You must be licensed and insured as required where you work, dispose of items legally, and honor the quotes you send.</p>
      <h2>Conduct</h2>
      <p>No spam, harassment or misleading listings. We may remove content or accounts that break these rules.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </div>
  );
}
