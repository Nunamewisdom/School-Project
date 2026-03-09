import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProfiles } from "../../api/profiles";

export default function Navbar() {
  const { logout } = useAuth();
  const { activeProfile, setActiveProfile } = useProfile();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);

  // Load profiles on mount
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const data = await getProfiles();
        setProfiles(data);
      } catch (err) {
        console.error("Failed to load profiles", err);
      }
    };

    loadProfiles();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleProfileChange = (e) => {
    const selected = profiles.find(
      (profile) => profile._id === e.target.value
    );
    setActiveProfile(selected);
  };

  return (
    <div
      
  style={{
    background: "#16a34a",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "white",
    height: "70px"
  }}
>
    
      <h2>MediBuddy</h2>

      <div style={{ display: "flex", alignItems: "center" }}>
        {/* Profile Dropdown */}
        <select
          value={activeProfile?._id || ""}
          onChange={handleProfileChange}
          style={{
            marginRight: "15px",
            padding: "6px",
            borderRadius: "4px",
            border: "none"
          }}
        >
          <option value="">Select Profile</option>
          {profiles.map((profile) => (
            <option key={profile._id} value={profile._id}>
              {profile.name}
            </option>
          ))}
        </select>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            background: "white",
            color: "#16a34a",
            border: "none",
            padding: "8px 12px",
            cursor: "pointer",
            borderRadius: "4px"
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}