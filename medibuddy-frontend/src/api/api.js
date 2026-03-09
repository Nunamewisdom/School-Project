import axios from "axios";
import { getTokens, setTokens, clearTokens } from "../utils/tokenStorage";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (!response.data.success) {
      return Promise.reject(response.data.error);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = await getTokens();

        const res = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          { refreshToken: tokens.refreshToken }
        );

        const newTokens = res.data.data;

        await setTokens(newTokens);

        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

        return api(originalRequest);
      } catch (err) {
        await clearTokens();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;