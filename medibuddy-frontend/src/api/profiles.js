import api from "./api";

export const getProfiles = async () => {
  const res = await api.get("/profiles");
  return res.data.data;
};

export const createProfile = async (payload) => {
  const res = await api.post("/profiles", payload);
  return res.data.data;
};

export const updateProfile = async (id, payload) => {
  const res = await api.patch(`/profiles/${id}`, payload);
  return res.data.data;
};

export const deleteProfile = async (id) => {
  await api.delete(`/profiles/${id}`);
};