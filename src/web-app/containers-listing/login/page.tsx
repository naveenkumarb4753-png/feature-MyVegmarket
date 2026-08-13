import Link from "next/link";

export default function BuyerLoginPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 sm:px-6 lg:px-12 pt-8 pb-20">
      <div className="max-w-[700px] mx-auto">
        <div className="flex items-center justify-between">
          <Link
            href="/containers-listing/view"
            className="w-11 h-11 rounded-full bg-white border border-[#e0e8e3] flex items-center justify-center font-black"
          >
            ←
          </Link>
          <div className="w-11 h-11 rounded-full bg-white border border-[#e0e8e3] flex items-center justify-center">
            📱
          </div>
        </div>

        <div className="mt-8 bg-white border border-[#e0e8e3] rounded-[36px] p-8 sm:p-12 shadow-[0_20px_60px_rgba(17,23,19,0.08)] text-center">
          <div className="w-20 h-20 rounded-full bg-[#eaf7ef] mx-auto flex items-center justify-center text-3xl">
            🔐
          </div>

          <h1 className="mt-6 text-4xl font-black text-[#111713]">Login (Mobile OTP)</h1>
          <p className="mt-3 text-[#648770] font-medium text-lg">
            OTP login will be integrated later. For now this is UI only.
          </p>

          <div className="mt-7 text-left">
            <div className="text-sm font-black text-[#111713]">Mobile Number</div>
            <input
              placeholder="+91 XXXXX XXXXX"
              className="mt-2 w-full rounded-[22px] border border-[#e0e8e3] px-5 py-4 outline-none font-semibold"
            />
          </div>

          <button className="mt-6 w-full rounded-full px-6 py-5 bg-[#1db954] text-white font-black text-xl">
            Send OTP
          </button>
        </div>
      </div>
    </main>
  );
}
