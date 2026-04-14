type PlannerRow = {
  device_id: string;
  crop_name?: string;
  sowing_date?: string;
  harvest_date?: string;
  optimal_temperature?: string;
  optimal_humidity?: string;
  optimal_co2?: string;
};

type GrowthStage = {
  stage: string;
  days: string;
  ideal_height_cm?: string;
  notes?: string;
  min_days?: number;
  max_days?: number | null;
  climate_day_temperature?: string;
  climate_night_temperature?: string;
  climate_humidity?: string;
  climate_co2?: string;
  nutrition_ec?: string;
  nutrition_ph?: string;
  nutrition_water_temperature?: string;
  light_ppfd?: string;
  light_uva?: string;
  light_uvb?: string;
};

export type SopConditions = {
  optimal_temperature?: string;
  optimal_humidity?: string;
  optimal_co2?: string;
  optimal_nutrition_ec?: string;
  optimal_nutrition_ph?: string;
  optimal_nutrition_water_temperature?: string;
  optimal_light_ppfd?: string;
  optimal_light_uva?: string;
  optimal_light_uvb?: string;
  growth_stages?: GrowthStage[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeRange(value: unknown) {
  const obj = readObject(value);
  if (!obj) return undefined;
  const min = asNumber(obj.min);
  const max = asNumber(obj.max);
  const unit = asString(obj.unit);
  if (min === undefined || max === undefined) return undefined;
  return `${min}-${max}${unit ? ` ${unit}` : ""}`;
}

function normalizeRows(source: unknown): PlannerRow[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const optimal = readObject(row.optimal_conditions);
      const deviceId = asString(row.device_id) ?? asString(row.Device_Id) ?? asString(row.deviceId);
      if (!deviceId) return null;
      return {
        device_id: deviceId,
        crop_name: asString(row.crop_name) ?? asString(row.Crop_Name) ?? asString(row.cropName),
        sowing_date: asString(row.sowing_date) ?? asString(row.Sowing_Date) ?? asString(row.sowingDate),
        harvest_date: asString(row.harvest_date) ?? asString(row.Harvest_Date) ?? asString(row.harvestDate),
        optimal_temperature: normalizeRange(optimal?.temperature),
        optimal_humidity: normalizeRange(optimal?.humidity),
        optimal_co2: normalizeRange(optimal?.co2),
      } satisfies PlannerRow;
    })
    .filter((item): item is PlannerRow => Boolean(item));
}

function normalizeCropKey(value: string) {
  return value.trim().toLowerCase();
}

function parseStageDays(daysText: string | undefined) {
  if (!daysText) return { min_days: undefined, max_days: undefined as number | undefined };
  const text = daysText.trim();
  const rangeMatch = /^(\d+)\s*[–—-]\s*(\d+)$/.exec(text);
  if (rangeMatch) {
    return { min_days: Number(rangeMatch[1]), max_days: Number(rangeMatch[2]) };
  }
  const plusMatch = /^(\d+)\s*\+$/.exec(text);
  if (plusMatch) {
    return { min_days: Number(plusMatch[1]), max_days: null };
  }
  const singleMatch = /^(\d+)$/.exec(text);
  if (singleMatch) {
    const day = Number(singleMatch[1]);
    return { min_days: day, max_days: day };
  }
  return { min_days: undefined, max_days: undefined as number | undefined };
}

function normalizeGrowthStages(source: unknown): GrowthStage[] | undefined {
  if (!Array.isArray(source)) return undefined;
  const stages = source
    .map((item) => {
      const row = readObject(item);
      if (!row) return null;
      const stage = asString(row.stage) ?? asString(row.name);
      const dayRange = readObject(row.day_range);
      const dayStart = asNumber(dayRange?.start);
      const dayEnd = asNumber(dayRange?.end);
      const dayRangeLabel =
        dayStart !== undefined
          ? dayEnd !== undefined
            ? `${dayStart}-${dayEnd}`
            : `${dayStart}+`
          : undefined;
      const days = asString(row.days) ?? dayRangeLabel;
      if (!stage || !days) return null;
      const parsed =
        dayStart !== undefined
          ? { min_days: dayStart, max_days: dayEnd === undefined ? null : dayEnd }
          : parseStageDays(days);
      const climate = readObject(row.climate);
      const nutrition = readObject(row.nutrition);
      const light = readObject(row.light);
      const height = readObject(readObject(row.plant_metrics)?.height_cm);
      const heightLabel =
        height && asNumber(height.min) !== undefined && asNumber(height.max) !== undefined
          ? `${asNumber(height.min)}-${asNumber(height.max)} cm`
          : asString(row.ideal_height_cm);
      return {
        stage,
        days,
        ideal_height_cm: heightLabel,
        notes: asString(row.notes) ?? asString(row.observation),
        min_days: parsed.min_days,
        max_days: parsed.max_days,
        climate_day_temperature: normalizeRange(climate?.day_temperature),
        climate_night_temperature: normalizeRange(climate?.night_temperature),
        climate_humidity: normalizeRange(climate?.humidity),
        climate_co2: normalizeRange(climate?.co2),
        nutrition_ec: normalizeRange(nutrition?.ec),
        nutrition_ph: normalizeRange(nutrition?.ph),
        nutrition_water_temperature: normalizeRange(nutrition?.water_temperature),
        light_ppfd: normalizeRange(light?.ppfd),
        light_uva: normalizeRange(light?.uva),
        light_uvb: normalizeRange(light?.uvb),
      } satisfies GrowthStage;
    })
    .filter((item): item is GrowthStage => Boolean(item));
  return stages.length > 0 ? stages : undefined;
}

function readArrayCandidates(data: unknown) {
  if (Array.isArray(data)) return [data];
  const objectData = readObject(data);
  if (!objectData) return [];
  return [
    objectData.data,
    objectData.records,
    objectData.devices,
    objectData.items,
    objectData.crops,
    objectData.found_crops,
  ].filter(Array.isArray) as unknown[][];
}

function normalizeSopMap(data: unknown): Record<string, SopConditions> {
  const map: Record<string, SopConditions> = {};
  const arrays = readArrayCandidates(data);

  for (const arraySource of arrays) {
    for (const item of arraySource) {
      const row = readObject(item);
      if (!row) continue;
      const cropName = asString(row.crop_name) ?? asString(row.Crop_Name) ?? asString(row.cropName) ?? asString(row.name);
      if (!cropName) continue;
      const nestedData = readObject(row.data);
      const optimalContainer = readObject(nestedData?.optimal_conditions) ?? readObject(row.optimal_conditions);
      const flatContainer = nestedData ?? row;
      const nutritionContainer = readObject(nestedData?.optimal_nutrition) ?? readObject(row.optimal_nutrition);
      const lightContainer = readObject(nestedData?.optimal_light) ?? readObject(row.optimal_light);
      const conditions: SopConditions = {
        optimal_temperature: normalizeRange(optimalContainer?.temperature) ?? asString(flatContainer?.optimal_temperature),
        optimal_humidity: normalizeRange(optimalContainer?.humidity) ?? asString(flatContainer?.optimal_humidity),
        optimal_co2: normalizeRange(optimalContainer?.co2) ?? asString(flatContainer?.optimal_co2),
        optimal_nutrition_ec: normalizeRange(nutritionContainer?.ec) ?? asString(flatContainer?.optimal_nutrition_ec),
        optimal_nutrition_ph: normalizeRange(nutritionContainer?.ph) ?? asString(flatContainer?.optimal_nutrition_ph),
        optimal_nutrition_water_temperature:
          normalizeRange(nutritionContainer?.water_temperature) ?? asString(flatContainer?.optimal_nutrition_water_temperature),
        optimal_light_ppfd: normalizeRange(lightContainer?.ppfd) ?? asString(flatContainer?.optimal_light_ppfd),
        optimal_light_uva: normalizeRange(lightContainer?.uva) ?? asString(flatContainer?.optimal_light_uva),
        optimal_light_uvb: normalizeRange(lightContainer?.uvb) ?? asString(flatContainer?.optimal_light_uvb),
        growth_stages: normalizeGrowthStages(nestedData?.growth_stages ?? row.growth_stages),
      };
      map[normalizeCropKey(cropName)] = conditions;
    }
  }

  return map;
}

function resolveSopApiBase() {
  const candidates = [
    import.meta.env.VITE_SOP_API_BASE_URL,
    import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL,
    import.meta.env.VITE_PLANNER_API_URL,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        return new URL(value).origin;
      }
      return value;
    } catch {
      continue;
    }
  }
  return "";
}

function resolvePlannerUpdateEndpoint() {
  const explicit = import.meta.env.VITE_PLANNER_UPDATE_API_URL?.trim();
  if (explicit) return explicit;

  const plannerUrl = import.meta.env.VITE_PLANNER_API_URL?.trim();
  if (plannerUrl) {
    try {
      const origin = new URL(plannerUrl).origin;
      return `${origin}/planner/update-device`;
    } catch {
      // ignore and fallback
    }
  }

  const fallbackBase = resolveSopApiBase();
  if (fallbackBase) return `${fallbackBase.replace(/\/$/, "")}/planner/update-device`;
  return "";
}

export async function fetchPlannerRows(args: {
  token: string;
  userId: string;
  section: string;
}) {
  const endpoint = import.meta.env.VITE_PLANNER_API_URL;
  if (!endpoint) {
    throw new Error("Missing VITE_PLANNER_API_URL");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      token_type: "bearer",
      user_id: args.userId,
      section: args.section,
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`Planner API failed (${response.status})`);
  }

  const objectData = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const candidates = [
    normalizeRows(data),
    normalizeRows(objectData?.rows),
    normalizeRows(objectData?.records),
    normalizeRows(objectData?.devices),
    normalizeRows(objectData?.data),
  ];
  return candidates.find((rows) => rows.length > 0) ?? [];
}

export async function fetchSopConditions(args: {
  token: string;
  userId: string;
  cropNames: string[];
}) {
  const apiBase = resolveSopApiBase();
  if (!apiBase) {
    throw new Error("Missing SOP API base URL");
  }

  const uniqueCropNames = Array.from(
    new Set(args.cropNames.map((item) => item.trim()).filter(Boolean)),
  );

  if (uniqueCropNames.length === 0) {
    return {} as Record<string, SopConditions>;
  }

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/SOP_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify({
      user_id: args.userId,
      crop_names: uniqueCropNames,
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`SOP API failed (${response.status})`);
  }

  return normalizeSopMap(data);
}

export async function updatePlannerDevice(args: {
  token: string;
  userId: string;
  deviceId: string;
  payload: Partial<Pick<PlannerRow, "crop_name" | "sowing_date" | "harvest_date">>;
}) {
  const endpoint = resolvePlannerUpdateEndpoint();
  if (!endpoint) {
    throw new Error("Missing planner update API endpoint");
  }

  const body: Record<string, unknown> = {
    user_id: args.userId,
    device_id: args.deviceId,
  };

  if (typeof args.payload.crop_name === "string") body.crop_name = args.payload.crop_name;
  if (typeof args.payload.sowing_date === "string") body.sowing_date = args.payload.sowing_date;
  if (typeof args.payload.harvest_date === "string") body.harvest_date = args.payload.harvest_date;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`Planner update API failed (${response.status})`);
  }

  return data;
}

export type SinchaiSchedule = {
  schedule_no: number;
  schedule_name: string;
  start_time: string;
  irrigation_duration_min: number | null;
  valves: string[];
  days: string[];
  enabled: boolean;
  ec_lower_limit?: number | null;
  ec_upper_limit?: number | null;
  ph_lower_limit?: number | null;
  ph_upper_limit?: number | null;
};

export type SinchaiPlannerDocument = {
  user_id: string;
  mode: string;
  no_of_valves: number;
  fertigation_time_min: number | null;
  schedules: SinchaiSchedule[];
};

function asBooleanLoose(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "enabled" || normalized === "auto") return true;
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "disabled" || normalized === "manual") return false;
  }
  return null;
}

function asNumberLoose(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item?.trim())).map((item) => item.trim());
}

function normalizeSinchaiSchedules(source: unknown) {
  if (!Array.isArray(source)) return [];
  return source
    .map((item, index) => {
      const row = readObject(item);
      if (!row) return null;
      const numberValue = asNumberLoose(row.schedule_no ?? row.scheduleNo ?? row.id);
      const scheduleNo = numberValue !== null ? Math.max(1, Math.trunc(numberValue)) : index + 1;
      const duration = asNumberLoose(row.irrigation_duration_min ?? row.duration_min ?? row.duration);
      const enabled = asBooleanLoose(row.enabled ?? row.is_enabled ?? row.status) ?? true;
      return {
        schedule_no: scheduleNo,
        schedule_name: asString(row.schedule_name) ?? asString(row.name) ?? `Schedule ${index + 1}`,
        start_time: asString(row.start_time) ?? asString(row.time) ?? "",
        irrigation_duration_min: duration !== null ? Math.max(0, Math.trunc(duration)) : null,
        valves: asStringArray(row.valves ?? row.zones ?? row.lines),
        days: asStringArray(row.days ?? row.repeat_days ?? row.weekdays),
        enabled,
        ec_lower_limit: asNumberLoose(row.ec_lower_limit ?? row.ecLowerLimit ?? row.ec_min ?? row.ecMin),
        ec_upper_limit: asNumberLoose(row.ec_upper_limit ?? row.ecUpperLimit ?? row.ec_max ?? row.ecMax),
        ph_lower_limit: asNumberLoose(row.ph_lower_limit ?? row.phLowerLimit ?? row.ph_min ?? row.phMin),
        ph_upper_limit: asNumberLoose(row.ph_upper_limit ?? row.phUpperLimit ?? row.ph_max ?? row.phMax),
      } satisfies SinchaiSchedule;
    })
    .filter((item): item is SinchaiSchedule => Boolean(item));
}

function extractSinchaiObject(data: unknown) {
  const direct = readObject(data);
  if (!direct) return null;

  const candidates = [
    direct,
    readObject(direct.data),
    readObject(direct.record),
    readObject(direct.payload),
    readObject(direct.planner),
    readObject(direct.result),
    readObject(direct.document),
  ].filter((item): item is Record<string, unknown> => Boolean(item));

  return candidates.find((item) => {
    if (Array.isArray(item.schedules)) return true;
    if (Array.isArray(item.schedule)) return true;
    if (Array.isArray(item.items)) return true;
    return false;
  }) ?? candidates[0];
}

function normalizeSinchaiPlanner(data: unknown, userId: string): SinchaiPlannerDocument | null {
  const obj = extractSinchaiObject(data);
  if (!obj) return null;

  const schedules = normalizeSinchaiSchedules(obj.schedules ?? obj.schedule ?? obj.items);
  const mode = asString(obj.mode) ?? asString(obj.irrigation_mode) ?? asString(obj.control_mode) ?? "Auto";
  const payloadUserId = asString(obj.user_id) ?? asString(obj.userId) ?? userId;
  const noOfValves = asNumberLoose(obj.No_of_valves ?? obj.no_of_valves ?? obj.valves_count) ?? 6;
  const fertigationTime = asNumberLoose(obj.fertigation_time_min ?? obj.fertigationTimeMin ?? obj.fertigation_time);

  if (schedules.length === 0 && !Array.isArray(obj.schedules) && !Array.isArray(obj.schedule) && !Array.isArray(obj.items)) {
    return null;
  }

  return {
    user_id: payloadUserId,
    mode,
    no_of_valves: Math.max(1, Math.trunc(noOfValves)),
    fertigation_time_min: fertigationTime !== null ? Math.max(0, fertigationTime) : null,
    schedules,
  };
}

function resolveSinchaiPlannerFetchEndpoint() {
  const explicit = import.meta.env.VITE_SINCHAI_PLANNER_GET_API_URL?.trim();
  if (explicit) return explicit;

  const apiBase = resolveSopApiBase();
  if (apiBase) return `${apiBase.replace(/\/$/, "")}/get_sinchai_planer`;

  return "";
}

function resolveSinchaiPlannerSaveEndpoint() {
  const explicit = import.meta.env.VITE_SINCHAI_PLANNER_SAVE_API_URL?.trim();
  if (explicit) return explicit;

  const apiBase = resolveSopApiBase();
  if (apiBase) return `${apiBase.replace(/\/$/, "")}/update_sinchai_planer`;

  return "";
}

export async function fetchSinchaiPlanner(args: {
  token: string;
  userId: string;
  section?: string;
}) {
  const endpoint = resolveSinchaiPlannerFetchEndpoint();
  if (!endpoint) {
    throw new Error("Missing Sinchai planner API endpoint");
  }

  const url = new URL(endpoint);
  url.searchParams.set("token_type", "bearer");
  url.searchParams.set("user_id", args.userId);
  url.searchParams.set("section", args.section ?? "user_sinchai_planner");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.token}`,
    },
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`Sinchai planner API failed (${response.status})`);
  }

  return normalizeSinchaiPlanner(data, args.userId);
}

export async function saveSinchaiPlanner(args: {
  token: string;
  userId: string;
  mode: string;
  noOfValves: number;
  fertigationTimeMin: number | null;
  schedules: SinchaiSchedule[];
}) {
  const endpoint = resolveSinchaiPlannerSaveEndpoint();
  if (!endpoint) {
    throw new Error("Missing Sinchai planner save API endpoint");
  }

  const body: Record<string, unknown> = {
    user_id: args.userId,
    mode: args.mode,
    No_of_valves: Math.max(1, Math.trunc(args.noOfValves)),
    fertigation_time_min: args.fertigationTimeMin,
    schedules: args.schedules,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.token}`,
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(`Sinchai planner save API failed (${response.status})`);
  }

  return data;
}
