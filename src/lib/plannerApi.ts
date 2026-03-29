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
