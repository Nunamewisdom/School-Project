import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleVerify = async () => {
    try {
      if (!location.state?.requestId) {
        alert("Session expired. Please request OTP again.");
        navigate("/login");
        return;
      }

      await login(location.state.requestId, otp);

      alert("Login successful!");
      navigate("/");

    } catch (err) {
      console.error(err);
      alert("Invalid OTP");
    }
  };

  return (
    <div>
      <h1>Verify OTP</h1>

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />

      <button onClick={handleVerify}>Verify</button>
    </div>
  );
}