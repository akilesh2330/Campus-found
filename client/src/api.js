import axios from 'axios';

const TOKEN_KEY = 'campus-found-session';
export const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers['X-Session-Token'] = token;
  return config;
});

export function saveSession(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
}
export function hasSession() {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.message || fallback;
}
