import { useProfile } from "../context/ProfileContext";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";

export default function Dashboard() {
  const { activeProfile } = useProfile();
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ marginBottom: "25px" }}>Dashboard</h1>

      {activeProfile ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px"
          }}
        >
          <Card>
            <h3>Active Profile</h3>
            <p>{activeProfile.name}</p>
          </Card>

          <Card onClick={() => navigate("/medications")}>
            <h3>Medications</h3>
            <p>Manage medications</p>
          </Card>

          <Card onClick={() => navigate("/appointments")}>
            <h3>Appointments</h3>
            <p>View schedule</p>
          </Card>
        </div>
      ) : (
        <Card>
          <p>Please select a profile from the dropdown.</p>
        </Card>
      )}
    </div>
  );
}