import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login";
import VerifyOtp from "../pages/Auth/VerifyOtp";
import Dashboard from "../pages/Dashboard";
import Profiles from "../pages/Profiles";
import Medications from "../pages/Medications";
import Appointments from "../pages/Appointments";
import ProtectedRoute from "./ProtectedRoute";
import ProtectedLayout from "../layouts/ProtectedLayout";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<VerifyOtp />} />

      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/appointments" element={<Appointments />} />
      </Route>
    </Routes>
  );
}