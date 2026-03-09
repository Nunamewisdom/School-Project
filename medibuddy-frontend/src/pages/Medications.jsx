import { useEffect, useState } from "react";
import { useProfile } from "../context/ProfileContext";
import {
  getMedications,
  createMedication,
  deleteMedication
} from "../api/medications";

export default function Medications() {
  const { activeProfile } = useProfile();
  const [medications, setMedications] = useState([]);
  const [form, setForm] = useState({ name: "", dosage: "" });
  const [error, setError] = useState("");

  const loadMedications = async () => {
    if (!activeProfile) return;
    const data = await getMedications(activeProfile._id);
    setMedications(data);
  };

  useEffect(() => {
    loadMedications();
  }, [activeProfile]);

  const handleSubmit = async () => {
    if (!activeProfile) {
      setError("Please select a profile first.");
      return;
    }

    if (!form.name) {
      setError("Medication name is required.");
      return;
    }

    await createMedication(activeProfile._id, form);
    setForm({ name: "", dosage: "" });
    setError("");
    loadMedications();
  };

  const handleDelete = async (id) => {
    await deleteMedication(activeProfile._id, id);
    loadMedications();
  };

  if (!activeProfile) {
    return <h3>Please select a profile first.</h3>;
  }

  return (
    <div>
      <h1>Medications for {activeProfile.name}</h1>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "15px"
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />

        <input
          placeholder="Dosage"
          value={form.dosage}
          onChange={(e) =>
            setForm({ ...form, dosage: e.target.value })
          }
        />

        <button onClick={handleSubmit}>Add</button>
      </div>

      <ul>
        {medications.map((med) => (
          <li key={med._id}>
            {med.name} - {med.dosage}
            <button onClick={() => handleDelete(med._id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}