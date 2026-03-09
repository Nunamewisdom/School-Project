import { useEffect, useState } from "react";
import {
  getProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../api/profiles";

export default function Profiles() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({ name: "", age: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProfiles = async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load profiles");
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name) {
  alert("Name is required");
  return;
}

    try {
      setLoading(true);

      if (editingId) {
        await updateProfile(editingId, form);
        setEditingId(null);
      } else {
        await createProfile(form);
      }

      setForm({ name: "", age: "" });
      await loadProfiles();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (profile) => {
    setForm({
      name: profile.name,
      age: profile.age,
    });
    setEditingId(profile._id);
  };

  const handleDelete = async (id) => {
    try {
      await deleteProfile(id);
      await loadProfiles();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div>
      <h1>Profiles</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
        />
        <input
          name="age"
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {editingId ? "Update" : "Create"}
        </button>
      </div>

      <ul>
  {profiles.map((profile) => (
    <li key={profile._id} style={{ marginBottom: "10px" }}>
      <strong>{profile.name}</strong>
      {profile.age && (
        <span style={{ marginLeft: "5px", color: "#555" }}>
          ({profile.age})
        </span>
      )}

      <div style={{ marginTop: "5px" }}>
        <button onClick={() => handleEdit(profile)}>Edit</button>
        <button onClick={() => handleDelete(profile._id)}>Delete</button>
      </div>
    </li>
  ))}
</ul>
    </div>
  );
}