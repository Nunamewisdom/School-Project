import api from "./api";

export const getMedications = async (profileId) => {
  const res = await api.get(`/profiles/${profileId}/medications`);
  return res.data.data;
};

export const createMedication = async (profileId, payload) => {
  const res = await api.post(
    `/profiles/${profileId}/medications`,
    payload
  );
  return res.data.data;
};

export const deleteMedication = async (profileId, id) => {
  await api.delete(`/profiles/${profileId}/medications/${id}`);
};