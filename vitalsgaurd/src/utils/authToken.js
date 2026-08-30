import axios from 'axios';

const TOKEN_KEY = 'vg_token';

export function setAuthToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  delete axios.defaults.headers.common['Authorization'];
}

// Call once on app load to restore the Authorization header from a
// previous session (localStorage survives reloads, axios defaults don't).
export function restoreAuthToken() {
  const token = getAuthToken();
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  return token;
}
