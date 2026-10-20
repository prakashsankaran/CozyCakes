import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "Your account" };

/** Placeholder until accounts land with US6 (tasks T071–T073). */
export default function MePage() {
  return (
    <ComingSoon
      emoji="🧁"
      title="Your cozy corner is on its way"
      body="Soon you'll see your orders, favourite cakes and saved addresses right here."
    />
  );
}
