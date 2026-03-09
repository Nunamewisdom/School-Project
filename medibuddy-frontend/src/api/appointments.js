import api from "./api";

export const getAppointments = async () => {
  const res = await api.get("/appointments");
  return res.data.data;
};

export const createAppointment = async (payload) => {
  const res = await api.post("/appointments", payload);
  return res.data.data;
};

export const updateAppointment = async (id, payload) => {
  const res = await api.put(`/appointments/${id}`, payload);
  return res.data.data;
};

export const deleteAppointment = async (id) => {
  await api.delete(`/appointments/${id}`);
};