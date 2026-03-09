import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp } from "../../api/auth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    try {
      if (!phone) {
        alert("Please enter phone number");
        return;
      }

      setLoading(true);

      const data = await requestOtp(phone);

      navigate("/verify", {
        state: { requestId: data.requestId }
      });

    } catch (err) {
      console.error(err);
      alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
      />

      <button onClick={handleSendOtp} disabled={loading}>
        {loading ? "Sending..." : "Send OTP"}
      </button>
    </div>
  );
}