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

export async function resetManualLog(args: {
  apiBase: string;
  token: string;
  userId: string;
  farmId: string;
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/reset_manual_log`;
  return postJson(url, args.token, {
    user_id: args.userId,
    farmid: args.farmId,
  });
}

export async function startManualIrrigation(args: {
  apiBase: string;
  token: string;
  userId: string;
  farmId: string;
  timestamp: string;
  durationMin: number;
  valves: string[];
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/start_manual_Irrigation`;
  return postJson(url, args.token, {
    user_id: args.userId,
    farmid: args.farmId,
    timestamp: args.timestamp,
    duration_min: args.durationMin,
    valves: args.valves,
  });
}

export async function startManualFertigation(args: {
  apiBase: string;
  token: string;
  userId: string;
  farmId: string;
  timestamp: string;
  ecLowerLimit: number;
  ecUpperLimit: number;
  phLowerLimit: number;
  phUpperLimit: number;
  nutritionTanks: Record<string, number>;
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/start_manual_fertigtion`;
  return postJson(url, args.token, {
    user_id: args.userId,
    farmid: args.farmId,
    timestamp: args.timestamp,
    eC: {
      LL: args.ecLowerLimit,
      HL: args.ecUpperLimit,
    },
    pH: {
      LL: args.phLowerLimit,
      HL: args.phUpperLimit,
    },
    nutrition_tanks: args.nutritionTanks,
  });
}

export async function fetchHistoricalData(args: {
  apiBase: string;
  token: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  rangeValue: 0.5 | 1 | 3;
}) {
  const url = `${args.apiBase.replace(/\/$/, "")}/historical_data`;
  return postJson(url, args.token, {
    user_id: args.userId,
    device_id: args.deviceId,
    device_name: args.deviceName,
    time_range: {
      value: args.rangeValue,
    },
  });
}
