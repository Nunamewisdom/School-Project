import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { Outlet } from "react-router-dom";

export default function ProtectedLayout() {
  return (
    <div style={{ background: "#f0fdf4", minHeight: "100vh" }}>
      <Navbar />

      <div style={{ display: "flex" }}>
        <Sidebar />

        <div
          style={{
            flex: 1,
            padding: "30px",
            background: "#ffffff",
            minHeight: "calc(100vh - 70px)"
          }}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}