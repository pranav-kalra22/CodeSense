// Centralized API configuration
// Uses environment variables at build time (Vite injects VITE_ prefixed vars)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8083';
const CODE_INTEL_BASE = import.meta.env.VITE_CODE_INTEL_URL || 'http://localhost:8082';

// Derive WebSocket URL from API_BASE (http→ws, https→wss)
const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const API = {
  BASE: API_BASE,
  CODE_INTEL: CODE_INTEL_BASE,
  WS: `${WS_BASE}/ws/live`,
};

export default API;
