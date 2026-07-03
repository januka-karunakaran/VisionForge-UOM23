"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOTP() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "OTP verification failed");
        return;
      }

      // ✅ Save token
      localStorage.setItem("crms_token", data.token);
      localStorage.setItem("crms_user", JSON.stringify(data));

      // ✅ Redirect
      router.push("/client/dashboard");
    } catch (err) {
      setError("Something went wrong");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Verify OTP
        </h2>

        {error && (
          <p className="text-red-500 mb-3 text-sm">{error}</p>
        )}

        <input
          type="email"
          placeholder="Enter your email"
          className="w-full mb-3 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Enter OTP"
          className="w-full mb-4 p-2 border rounded"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        <button
          onClick={handleVerify}
          className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700"
        >
          Verify
        </button>
      </div>
    </div>
  );
}