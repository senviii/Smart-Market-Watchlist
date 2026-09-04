import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getWatchlist = (userId) => api.get(`/watchlist/${userId}`).then((r) => r.data);
export const markSeen = (userId) => api.post(`/watchlist/${userId}/mark-seen`);
export const addToWatchlist = (userId, symbol) =>
  api.post(`/watchlist/${userId}/add`, { symbol });
export const removeFromWatchlist = (userId, symbol) =>
  api.delete(`/watchlist/${userId}/${symbol}`);

export default api;
