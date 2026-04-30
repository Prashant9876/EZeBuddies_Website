export const sinchaiValveOptions = ["Valve 1", "Valve 2", "Valve 3", "Valve 4", "Valve 5", "Valve 6"] as const;

export const sinchaiDayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type SinchaiDay = (typeof sinchaiDayOptions)[number];

export type SinchaiValve = (typeof sinchaiValveOptions)[number];

export function buildDefaultSinchaiSchedule(scheduleNo: number) {
  return {
    schedule_no: scheduleNo,
    schedule_name: `Schedule ${scheduleNo}`,
    start_time: "",
    refill_duration_min: 10,
    water_level_liters: null,
    irrigation_duration_min: 15,
    valves: [sinchaiValveOptions[0]],
    days: ["Mon", "Wed", "Fri"] as SinchaiDay[],
    enabled: true,
    fertigation_enabled: true,
    refill_enabled: true,
    nutrition_tanks: {},
    ec_lower_limit: null,
    ec_upper_limit: null,
    ph_lower_limit: null,
    ph_upper_limit: null,
  };
}
