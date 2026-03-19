const AUTH_TOKEN_KEY = "ezb_auth_token";
const LOGIN_RESPONSE_KEY = "ezb_login_response";

type LoginResponse = Record<string, unknown>;

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickToken(response: LoginResponse): string | null {
  const candidates: unknown[] = [
    response.access_token,
    response.token,
    response.bearer_token,
    readObject(response.data)?.access_token,
    readObject(response.data)?.token,
    readObject(response.result)?.access_token,
    readObject(response.result)?.token,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function saveAuthFromLogin(response: LoginResponse) {
  sessionStorage.setItem(LOGIN_RESPONSE_KEY, JSON.stringify(response));

  const token = pickToken(response);
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  return token;
}

export function getStoredLoginResponse(): LoginResponse | null {
  const raw = sessionStorage.getItem(LOGIN_RESPONSE_KEY) ?? localStorage.getItem(LOGIN_RESPONSE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const safe = readObject(parsed);
    if (safe) {
      sessionStorage.setItem(LOGIN_RESPONSE_KEY, JSON.stringify(safe));
      localStorage.removeItem(LOGIN_RESPONSE_KEY);
    }
    return safe;
  } catch {
    return null;
  }
}

export function getStoredAuthToken() {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  return token;
}

export function clearStoredAuth() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(LOGIN_RESPONSE_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LOGIN_RESPONSE_KEY);
}
