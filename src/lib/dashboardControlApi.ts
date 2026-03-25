type RelayState = "on" | "off";

type ApiError = Error & { status?: number; detail?: string };

function parseErrorDetail(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const obj = payload as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  return null;
}

async function postJson(url: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = parseErrorDetail(payload);
    const error = new Error(detail ?? `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.detail = detail ?? undefined;
    throw error;
  }

  return payload;
}

export async function changeRelayState(args: {
  apiBase: string;
  token: string;
  userId: string;
  deviceId: string;
  buttonName: string;
  state: RelayState;
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/change_relay_state`;
  return postJson(url, args.token, {
    user_id: args.userId,
    device_id: args.deviceId,
    button_name: args.buttonName,
    state: args.state,
  });
}

export async function triggerEStop(args: {
  apiBase: string;
  token: string;
  userId: string;
  solutionName: string;
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/Estop`;
  return postJson(url, args.token, {
    user_id: args.userId,
    solution_name: args.solutionName,
  });
}

