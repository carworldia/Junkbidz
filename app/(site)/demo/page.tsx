import type { Metadata } from "next";
import Demo from "@/components/Demo";

export const runtime = "edge";
export const metadata: Metadata = { title: "See how it works", description: "Try JunkBidz without an account: post an example job and watch quotes come in." };

export default function DemoPage() {
  return <Demo />;
}
