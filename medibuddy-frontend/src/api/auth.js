import api from "./api";

export const requestOtp = async (phone) => {
  const res = await api.post("/auth/otp", { phone });
  return res.data.data; // unwrap
};