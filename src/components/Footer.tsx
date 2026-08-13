import Link from "next/link";
import FooterActions from "./FooterActions";

export default function Footer() {
  const phoneDisplay = "+971 56 333 7535";
  const phoneE164 = "+971563337535";
  const waLink = "https://wa.me/971563337535";

  return (
    <footer className="border-t border-[#e7efe9] bg-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-12 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="lg:pr-6">
            <div className="flex items-center gap-2 font-black text-lg mb-4">
              <span className="w-8 h-8 rounded-full bg-[#0B5D1E] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">eco</span>
              </span>
              <span className="text-[#0B5D1E]">MyVegmarket</span>
            </div>

            <p className="text-sm text-[#648770] leading-6 max-w-sm">
              MyVegmarket provides approved Al Aweer reference rates and bulk sourcing support
              for UAE groceries, restaurants, and exporters. Track daily movement, compare
              categories, and source confidently.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black text-[#111713] mb-4">QUICK LINKS</h4>
            <div className="flex flex-col gap-3 text-sm text-[#648770] font-medium">
              <Link href="/al-aweer-prices" className="hover:text-[#1db954]">
                Al Aweer Prices
              </Link>
              <Link href="/bulk-supply" className="hover:text-[#1db954]">
                Bulk Supply
              </Link>
              <Link href="/services" className="hover:text-[#1db954]">
                Services
              </Link>
              <Link href="/containers-listing/list" className="hover:text-[#1db954]">
                Containers Listing
              </Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-black text-[#111713] mb-4">SUPPORT</h4>
            <div className="flex flex-col gap-3 text-sm text-[#648770] font-medium">
              <Link href="/terms" className="hover:text-[#1db954]">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-[#1db954]">
                Privacy Policy
              </Link>
              <Link href="/services" className="hover:text-[#1db954]">
                Help & Services
              </Link>
              <Link href="/delete-account" className="hover:text-[#1db954]">
                Delete Account
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-black text-[#111713] mb-4">CONTACT US</h4>
            <div className="flex flex-col gap-3 text-sm text-[#648770] font-medium">
              <p className="text-[#111713] font-semibold">S &amp; Y Global Trading L.L.C</p>

              <a href={`tel:${phoneE164}`} className="hover:text-[#1db954]">
                {phoneDisplay}
              </a>

              <a href={waLink} target="_blank" rel="noopener noreferrer" className="hover:text-[#1db954]">
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-[#e7efe9] text-xs text-[#648770] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} MyVegmarket. All rights reserved.</p>
          <FooterActions />
        </div>
      </div>
    </footer>
  );
}