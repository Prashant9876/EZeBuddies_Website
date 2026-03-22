type PlannerRow = {
  device_id: string;
  crop_name?: string;
  sowing_date?: string;
  harvest_date?: string;
  optimal_temperature?: string;
  optimal_humidity?: string;
  optimal_co2?: string;
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
