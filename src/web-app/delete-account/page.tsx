export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-6 py-16">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow">
        <h1 className="text-3xl font-bold text-[#111]">
          Delete Your Account
        </h1>

        <p className="mt-4 text-gray-600">
          If you would like to delete your MyVegMarket account and all associated
          data, please send a request to our support team.
        </p>

        <div className="mt-6 bg-[#f2f7f4] p-4 rounded-lg">
          <p className="font-medium text-gray-800">
            Email your request to:
          </p>

          <a
            href="mailto:support@myvegmarket.com"
            className="text-green-600 font-semibold underline"
          >
            support@myvegmarket.com
          </a>
        </div>

        <div className="mt-6 text-gray-600">
          <p>Please include:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>Your registered email address</li>
            <li>Company name (if applicable)</li>
          </ul>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          We will process your request within 3–5 working days.
        </p>
      </div>
    </main>
  );
}