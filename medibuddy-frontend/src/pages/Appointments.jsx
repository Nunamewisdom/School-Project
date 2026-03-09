import { useEffect, useState } from "react";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from "../api/appointments";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ title: "", date: "" });
  const [editingId, setEditingId] = useState(null);

  const loadAppointments = async () => {
    const data = await getAppointments();
    setAppointments(data);
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleSubmit = async () => {
    if (!form.title) return;

    if (editingId) {
      await updateAppointment(editingId, form);
      setEditingId(null);
    } else {
      await createAppointment(form);
    }

    setForm({ title: "", date: "" });
    loadAppointments();
  };

  const handleEdit = (appt) => {
    setForm({ title: appt.title, date: appt.date });
    setEditingId(appt._id);
  };

  const handleDelete = async (id) => {
    await deleteAppointment(id);
    loadAppointments();
  };

  return (
    <div>
      <h1>Appointments</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm({ ...form, date: e.target.value })
          }
        />

        <button onClick={handleSubmit}>
          {editingId ? "Update" : "Add"}
        </button>
      </div>

      <ul>
        {appointments.map((appt) => (
          <li key={appt._id}>
            {appt.title} - {appt.date}
            <button onClick={() => handleEdit(appt)}>
              Edit
            </button>
            <button onClick={() => handleDelete(appt._id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}