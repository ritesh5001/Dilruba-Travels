import { SiteChrome } from "@/components/site-chrome";
import { ReferralCapture } from "@/components/referral-capture";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <SiteChrome>
      <ReferralCapture />
      {children}
    </SiteChrome>
  );
}
