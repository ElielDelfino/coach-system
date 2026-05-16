import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let accessToken = null;
let onUnauthorized = () => {};
let onTokenRefreshed = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setAuthHandlers({ onUnauthorized: u, onTokenRefreshed: r }) {
  if (u) onUnauthorized = u;
  if (r) onTokenRefreshed = r;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing = null;

async function doRefresh() {
  if (!refreshing) {
    refreshing = axios
      .post(BASE_URL + '/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.accessToken;
        onTokenRefreshed(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const newToken = await doRefresh();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        accessToken = null;
        onUnauthorized();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
