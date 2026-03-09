import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <div
      style={{
        width: "220px",
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        padding: "20px"
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <NavLink to="/" style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/profiles" style={linkStyle}>Profiles</NavLink>
        <NavLink to="/medications" style={linkStyle}>Medications</NavLink>
        <NavLink to="/appointments" style={linkStyle}>Appointments</NavLink>
      </nav>
    </div>
  );
}

const linkStyle = ({ isActive }) => ({
  textDecoration: "none",
  color: isActive ? "#16a34a" : "#111827",
  fontWeight: isActive ? "700" : "500"
});