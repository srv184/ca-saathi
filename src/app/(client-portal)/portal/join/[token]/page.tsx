"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "otp" | "pin" | "done";

export default function PortalJoinPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [phoneHash, setPhoneHash] = useState("");

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, inviteToken: params.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMaskedPhone(data.data.maskedPhone);
      setStep("otp");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setSetupToken(data.data.setupToken);
      setPhoneHash(data.data.phoneHash ?? "");
      if (data.data.clientName) setClientName(data.data.clientName);
      setStep("pin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          setupToken,
          phoneHash,
          inviteToken: params.token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }

      // Save device token in localStorage
      if (data.data.deviceToken) {
        localStorage.setItem("portal_device_token", data.data.deviceToken);
        localStorage.setItem("portal_client_id", data.data.clientId);
        localStorage.setItem("portal_client_name", data.data.clientName);
      }

      setClientName(data.data.clientName);
      setStep("done");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  // PIN pad component
  function PinDots({ value }: { value: string }) {
    return (
      <div className="flex gap-3 justify-center my-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < value.length
                ? "bg-blue-600 border-blue-600"
                : "border-gray-300"
            }`}
          />
        ))}
      </div>
    );
  }

  function NumberPad({
    value,
    onChange,
    maxLength = 6,
  }: {
    value: string;
    onChange: (v: string) => void;
    maxLength?: number;
  }) {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return (
      <div className="grid grid-cols-3 gap-3 mt-4">
        {keys.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === ""}
            onClick={() => {
              if (key === "⌫") {
                onChange(value.slice(0, -1));
              } else if (key !== "" && value.length < maxLength) {
                onChange(value + key);
              }
            }}
            className={`h-14 rounded-xl text-lg font-medium transition-colors ${
              key === ""
                ? "invisible"
                : key === "⌫"
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-900 hover:bg-blue-50 active:bg-blue-100"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">CA Saathi</h1>
          <p className="text-blue-300 text-sm mt-1">Secure client portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Step: Phone */}
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="text-center">
                <p className="text-2xl mb-2">📱</p>
                <h2 className="text-lg font-semibold text-gray-900">
                  Enter your mobile number
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Your CA has invited you to their secure portal
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Mobile number</label>
                <div className="flex gap-2">
                  <span className="input w-16 text-center text-gray-500 shrink-0">
                    +91
                  </span>
                  <input
                    className="input flex-1"
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || phone.length !== 10}
              >
                {loading ? "Sending OTP…" : "Get OTP"}
              </button>
            </form>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center">
                <p className="text-2xl mb-2">🔐</p>
                <h2 className="text-lg font-semibold text-gray-900">
                  Enter OTP
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Sent to {maskedPhone}
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <input
                  className="input text-center text-2xl tracking-widest font-mono"
                  type="tel"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-blue-600 hover:underline"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                }}
              >
                Change number
              </button>
            </form>
          )}

          {/* Step: Set PIN */}
          {step === "pin" && (
            <form onSubmit={handleSetPin} className="space-y-2">
              <div className="text-center">
                <p className="text-2xl mb-2">🔑</p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {pin.length < 6 ? "Create your PIN" : "Confirm your PIN"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {pin.length < 6
                    ? "Enter a 6-digit PIN to secure your portal"
                    : "Enter the same PIN again to confirm"}
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <PinDots value={pin.length < 6 ? pin : confirmPin} />
              <NumberPad
                value={pin.length < 6 ? pin : confirmPin}
                onChange={(v) => {
                  if (pin.length < 6) setPin(v);
                  else setConfirmPin(v);
                }}
              />
              {pin.length === 6 && confirmPin.length === 6 && (
                <button
                  type="submit"
                  className="btn-primary w-full mt-4"
                  disabled={loading}
                >
                  {loading ? "Setting PIN…" : "Set PIN"}
                </button>
              )}
              {pin.length === 6 && confirmPin.length === 0 && (
                <p className="text-center text-sm text-gray-500 mt-2">
                  Now confirm your PIN
                </p>
              )}
            </form>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <p className="text-4xl">🎉</p>
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome, {clientName}!
              </h2>
              <p className="text-sm text-gray-500">
                Your portal is ready. You can now securely share documents with
                your CA.
              </p>
              <button
                className="btn-primary w-full"
                onClick={() => {
                  const clientId = localStorage.getItem("portal_client_id");
                  router.push(`/portal/dashboard/${clientId}`);
                }}
              >
                Go to my portal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
