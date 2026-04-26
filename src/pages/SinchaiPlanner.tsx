import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Save, Trash2, FlaskConical, Play, Square, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { applySeo } from "@/lib/seo";
import { fetchSinchaiPlanner, saveSinchaiPlanner, updateSinchaiPlannerMode, type SinchaiSchedule } from "@/lib/plannerApi";
import {
  resetManualLog,
  startManualFertigation,
  startManualIrrigation,
  triggerEStop,
  updateFertigationSettings,
} from "@/lib/dashboardControlApi";
import { buildDefaultSinchaiSchedule, sinchaiDayOptions, sinchaiValveOptions } from "@/data/sinchaiPlannerDefaults";
import { useLanguage } from "@/lib/language";

type PlannerMode = "Auto" | "Manual";
type EcCalibrationPoint = {
  concentration_solution_liquid_quantity_ml: number | null;
  ro_water_liter: number | null;
  ec_increased_by: number | null;
};
type PhCalibrationLeg = {
  concentration_solution_liquid_quantity_ml: number | null;
  ro_water_liter: number | null;
  ph_increased_by?: number | null;
  ph_decreased_by?: number | null;
};
type PhCalibrationPoint = {
  ph_up_basic_solution: PhCalibrationLeg;
  ph_down_acidic_solution: PhCalibrationLeg;
};

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeMode(value: string): PlannerMode {
  return value.trim().toLowerCase() === "manual" ? "Manual" : "Auto";
}

function resolveApiBase(...candidates: Array<string | undefined>) {
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

function normalizeScheduleNumbers(schedules: SinchaiSchedule[]) {
  return schedules.map((schedule, index) => ({
    ...schedule,
    schedule_no: index + 1,
    schedule_name: schedule.schedule_name?.trim() ? schedule.schedule_name : `Schedule ${index + 1}`,
    nutrition_tanks: schedule.nutrition_tanks ?? {},
    refill_duration_min: typeof schedule.refill_duration_min === "number" ? schedule.refill_duration_min : null,
    fertigation_enabled: typeof schedule.fertigation_enabled === "boolean" ? schedule.fertigation_enabled : schedule.enabled ?? true,
    refill_enabled: typeof schedule.refill_enabled === "boolean" ? schedule.refill_enabled : true,
    ec_lower_limit: typeof schedule.ec_lower_limit === "number" ? schedule.ec_lower_limit : null,
    ec_upper_limit: typeof schedule.ec_upper_limit === "number" ? schedule.ec_upper_limit : null,
    ph_lower_limit: typeof schedule.ph_lower_limit === "number" ? schedule.ph_lower_limit : null,
    ph_upper_limit: typeof schedule.ph_upper_limit === "number" ? schedule.ph_upper_limit : null,
  }));
}

function parseTimeToMinutes(value: string) {
  const text = value.trim();
  if (!text) return null;

  // 24-hour format: HH:mm or H:mm
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  // 12-hour format: h:mm AM/PM
  const match12 = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(text);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridiem = match12[3].toLowerCase();
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (hours === 12) hours = 0;
    if (meridiem === "pm") hours += 12;
    return hours * 60 + minutes;
  }

  return null;
}

function findOverlappingSchedules(schedules: SinchaiSchedule[], fertigationTimeMin: number | null) {
  const normalized = normalizeScheduleNumbers(schedules);
  const fertigationWindow = Math.max(0, Math.trunc(fertigationTimeMin ?? 0));
  const preStartBuffer = 5;
  const postEndBuffer = 10;

  for (let i = 0; i < normalized.length; i += 1) {
    const first = normalized[i];
    const firstStart = parseTimeToMinutes(first.start_time);
    const firstRefillDuration = typeof first.refill_duration_min === "number" ? first.refill_duration_min : null;
    const firstDuration = typeof first.irrigation_duration_min === "number" ? first.irrigation_duration_min : null;
    if (firstStart === null || !firstDuration || firstDuration <= 0 || !firstRefillDuration || firstRefillDuration <= 0 || first.days.length === 0) continue;
    const firstWindowStart = Math.max(0, firstStart - preStartBuffer);
    const firstWindowEnd = firstStart + firstRefillDuration + fertigationWindow + firstDuration + postEndBuffer;

    for (let j = i + 1; j < normalized.length; j += 1) {
      const second = normalized[j];
      const secondStart = parseTimeToMinutes(second.start_time);
      const secondRefillDuration = typeof second.refill_duration_min === "number" ? second.refill_duration_min : null;
      const secondDuration = typeof second.irrigation_duration_min === "number" ? second.irrigation_duration_min : null;
      if (secondStart === null || !secondDuration || secondDuration <= 0 || !secondRefillDuration || secondRefillDuration <= 0 || second.days.length === 0) continue;
      const secondWindowStart = Math.max(0, secondStart - preStartBuffer);
      const secondWindowEnd = secondStart + secondRefillDuration + fertigationWindow + secondDuration + postEndBuffer;

      const commonDays = first.days.filter((day) => second.days.includes(day));
      if (commonDays.length === 0) continue;

      const overlaps = firstWindowStart < secondWindowEnd && secondWindowStart < firstWindowEnd;
      if (!overlaps) continue;

      return {
        first,
        second,
        commonDays,
      };
    }
  }
  return null;
}

function getPlannerSnapshot(noOfValves: number, schedules: SinchaiSchedule[]) {
  return JSON.stringify({
    no_of_valves: noOfValves,
    schedules: normalizeScheduleNumbers(schedules),
  });
}

function getFertigationSnapshot(
  fertigationTimeMin: number | null,
  noOfNutritionTank: number | null,
  ecCalibrationPoint: EcCalibrationPoint,
  phCalibrationPoint: PhCalibrationPoint,
) {
  return JSON.stringify({
    fertigation_time_min: fertigationTimeMin,
    no_of_nutrition_tank: noOfNutritionTank,
    ec_calibration_point: ecCalibrationPoint,
    ph_calibration_point: phCalibrationPoint,
  });
}

function parseNullableNumber(value: string) {
  const text = value.trim();
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function toAlphabetIndex(index: number) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function buildNutritionTankLabels(count: number | null) {
  const total = count && Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return Array.from({ length: total }, (_, index) => `${toAlphabetIndex(index)}`);
}

function isManualLogRunning(timestamp: string, durationMin: number) {
  const start = new Date(timestamp);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + Math.max(0, durationMin) * 60 * 1000);
  return end.getTime() >= Date.now();
}

function getFertigationEndTime(timestamp: string, fertigationTimeMin: number) {
  const start = new Date(timestamp);
  if (Number.isNaN(start.getTime())) return null;
  return start.getTime() + Math.max(0, fertigationTimeMin) * 60 * 1000;
}

function getManualLogEndTime(timestamp: string, durationMin: number) {
  const start = new Date(timestamp);
  if (Number.isNaN(start.getTime())) return null;
  return start.getTime() + Math.max(0, durationMin) * 60 * 1000;
}

function formatRemainingMs(remainingMs: number) {
  if (remainingMs <= 0) return "00:00";
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTodayShortName() {
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return shortDays[new Date().getDay()];
}

function isAutoScheduleRunningNow(schedules: SinchaiSchedule[], fertigationTimeMin: number | null) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getTodayShortName();
  const fertigationWindow = Math.max(0, Math.trunc(fertigationTimeMin ?? 0));
  const preStartBuffer = 5;
  const postEndBuffer = 10;

  return schedules.some((schedule) => {
    if (!(schedule.fertigation_enabled ?? schedule.enabled)) return false;
    if (!schedule.days.includes(today)) return false;
    const startMin = parseTimeToMinutes(schedule.start_time);
    const refillDuration = typeof schedule.refill_duration_min === "number" ? schedule.refill_duration_min : null;
    const duration = schedule.irrigation_duration_min;
    if (startMin === null || !duration || duration <= 0 || !refillDuration || refillDuration <= 0) return false;
    const activityStart = Math.max(0, startMin - preStartBuffer);
    const activityEnd = startMin + refillDuration + fertigationWindow + duration + postEndBuffer;
    return nowMinutes >= activityStart && nowMinutes <= activityEnd;
  });
}

function validatePlannerBeforeSave(
  mode: PlannerMode,
  fertigationTimeMin: number | null,
  schedules: SinchaiSchedule[],
  t: (key: string) => string,
) {
  if (fertigationTimeMin === null) {
    return t("sinchaiPlanner.validationFertigation");
  }

  if (mode === "Manual") {
    return null;
  }

  for (const schedule of schedules) {
    if (!schedule.schedule_name?.trim()) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.scheduleName")}`;
    }
    if (!schedule.start_time?.trim()) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.startTime")}`;
    }
    if (schedule.refill_duration_min === null || schedule.refill_duration_min <= 0) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.refillDuration")}`;
    }
    if (schedule.irrigation_duration_min === null || schedule.irrigation_duration_min <= 0) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.duration")}`;
    }
    if (!schedule.valves || schedule.valves.length === 0) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.selectValves")}`;
    }
    if (!schedule.days || schedule.days.length === 0) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.repeatDays")}`;
    }
    if (schedule.ec_lower_limit === null || schedule.ec_upper_limit === null) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.ecLimits")}`;
    }
    if (schedule.ph_lower_limit === null || schedule.ph_upper_limit === null) {
      return `${t("sinchaiPlanner.validationSchedulePrefix")} ${schedule.schedule_no}: ${t("sinchaiPlanner.phLimits")}`;
    }
  }

  return null;
}

export default function SinchaiPlanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const loginResponse = useMemo(() => getStoredLoginResponse(), []);
  const token = useMemo(() => getStoredAuthToken(), []);
  const userId = useMemo(() => {
    const userObj = readObject(loginResponse?.user);
    const value = loginResponse?.user_id ?? userObj?.user_id ?? userObj?.id;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }, [loginResponse]);
  const displayName = useMemo(() => {
    const userObj = readObject(loginResponse?.user);
    return asString(loginResponse?.name) || asString(userObj?.name) || userId || "User";
  }, [loginResponse, userId]);
  const farmId = useMemo(() => {
    const userObj = readObject(loginResponse?.user);
    const dataObj = readObject(loginResponse?.data);
    const fromResponse =
      asString(loginResponse?.farmid) ||
      asString(loginResponse?.farm_id) ||
      asString(loginResponse?.FarmId) ||
      asString(loginResponse?.FarmID) ||
      asString(dataObj?.farmid) ||
      asString(dataObj?.farm_id) ||
      asString(dataObj?.FarmId) ||
      asString(dataObj?.FarmID) ||
      asString(userObj?.farmid) ||
      asString(userObj?.farm_id) ||
      asString(userObj?.FarmId) ||
      asString(userObj?.FarmID);
    return fromResponse || import.meta.env.VITE_MANUAL_LOG_FARM_ID || "1";
  }, [loginResponse]);

  const [mode, setMode] = useState<PlannerMode>("Auto");
  const [schedules, setSchedules] = useState<SinchaiSchedule[]>([buildDefaultSinchaiSchedule(1)]);
  const [selectedScheduleNo, setSelectedScheduleNo] = useState<number>(1);
  const [noOfValves, setNoOfValves] = useState<number>(sinchaiValveOptions.length);
  const [fertigationTimeMin, setFertigationTimeMin] = useState<number | null>(null);
  const [noOfNutritionTank, setNoOfNutritionTank] = useState<number | null>(2);
  const [ecCalibrationPoint, setEcCalibrationPoint] = useState<EcCalibrationPoint>({
    concentration_solution_liquid_quantity_ml: null,
    ro_water_liter: null,
    ec_increased_by: null,
  });
  const [phCalibrationPoint, setPhCalibrationPoint] = useState<PhCalibrationPoint>({
    ph_up_basic_solution: {
      concentration_solution_liquid_quantity_ml: null,
      ro_water_liter: null,
      ph_increased_by: null,
    },
    ph_down_acidic_solution: {
      concentration_solution_liquid_quantity_ml: null,
      ro_water_liter: null,
      ph_decreased_by: null,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualDurationMin, setManualDurationMin] = useState<number | null>(null);
  const [manualSelectedValves, setManualSelectedValves] = useState<string[]>([]);
  const [manualRunning, setManualRunning] = useState(false);
  const [manualRunningEndsAt, setManualRunningEndsAt] = useState<number | null>(null);
  const [manualRunningCountdownSec, setManualRunningCountdownSec] = useState<number>(0);
  const [manualFertigationEcLower, setManualFertigationEcLower] = useState<number | null>(null);
  const [manualFertigationEcUpper, setManualFertigationEcUpper] = useState<number | null>(null);
  const [manualFertigationPhLower, setManualFertigationPhLower] = useState<number | null>(null);
  const [manualFertigationPhUpper, setManualFertigationPhUpper] = useState<number | null>(null);
  const [manualFertigationNutritionTanks, setManualFertigationNutritionTanks] = useState<Record<string, string>>({});
  const [manualFertigationRunning, setManualFertigationRunning] = useState(false);
  const [manualFertigationEndsAt, setManualFertigationEndsAt] = useState<number | null>(null);
  const [manualFertigationCountdownSec, setManualFertigationCountdownSec] = useState<number>(0);
  const [isManualFertigationStartSubmitting, setIsManualFertigationStartSubmitting] = useState(false);
  const [isManualStartSubmitting, setIsManualStartSubmitting] = useState(false);
  const [isManualStopSubmitting, setIsManualStopSubmitting] = useState(false);
  const [isModeUpdating, setIsModeUpdating] = useState(false);
  const [savedMode, setSavedMode] = useState<PlannerMode>("Auto");
  const [pendingModeAfterEStop, setPendingModeAfterEStop] = useState<PlannerMode | null>(null);
  const [isModeSwitchEStopDialogOpen, setIsModeSwitchEStopDialogOpen] = useState(false);
  const [isModeSwitchEStopSubmitting, setIsModeSwitchEStopSubmitting] = useState(false);
  const [isManualModeBlockDialogOpen, setIsManualModeBlockDialogOpen] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(
    getPlannerSnapshot(sinchaiValveOptions.length, [buildDefaultSinchaiSchedule(1)]),
  );
  const [initialFertigationSnapshot, setInitialFertigationSnapshot] = useState(
    getFertigationSnapshot(
      null,
      2,
      { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ec_increased_by: null },
      {
        ph_up_basic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_increased_by: null },
        ph_down_acidic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_decreased_by: null },
      },
    ),
  );
  const controlApiBase = useMemo(
    () => resolveApiBase(import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL, import.meta.env.VITE_PLANNER_API_URL),
    [],
  );

  const isDirty = useMemo(
    () => getPlannerSnapshot(noOfValves, schedules) !== initialSnapshot,
    [noOfValves, schedules, initialSnapshot],
  );
  const isModeDirty = useMemo(
    () => mode !== savedMode,
    [mode, savedMode],
  );
  const isFertigationDirty = useMemo(
    () => getFertigationSnapshot(fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint) !== initialFertigationSnapshot,
    [fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint, initialFertigationSnapshot],
  );
  const valveOptions = useMemo(() => {
    const baseCount = Math.max(1, Math.trunc(noOfValves));
    const generated = Array.from({ length: baseCount }, (_, i) => `Valve ${i + 1}`);
    const extraFromSchedules = Array.from(
      new Set(
        schedules
          .flatMap((schedule) => schedule.valves)
          .filter((valve) => !generated.includes(valve)),
      ),
    );
    return [...generated, ...extraFromSchedules];
  }, [noOfValves, schedules]);
  const nutritionTankLabels = useMemo(() => buildNutritionTankLabels(noOfNutritionTank), [noOfNutritionTank]);
  const autoModeActivityRunning = useMemo(
    () => mode === "Auto" && isAutoScheduleRunningNow(schedules, fertigationTimeMin),
    [mode, schedules, fertigationTimeMin],
  );
  const manualControlsLocked = mode === "Manual" && savedMode !== "Manual";
  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.schedule_no === selectedScheduleNo) ?? schedules[0] ?? null,
    [schedules, selectedScheduleNo],
  );

  useEffect(() => {
    if (schedules.length === 0) {
      setSelectedScheduleNo(1);
      return;
    }
    if (!schedules.some((schedule) => schedule.schedule_no === selectedScheduleNo)) {
      setSelectedScheduleNo(schedules[0].schedule_no);
    }
  }, [schedules, selectedScheduleNo]);

  useEffect(() => {
    if (!manualRunning || !manualRunningEndsAt) {
      setManualRunningCountdownSec(0);
      return;
    }
    const update = () => {
      const remainingMs = manualRunningEndsAt - Date.now();
      if (remainingMs <= 0) {
        setManualRunning(false);
        setManualRunningEndsAt(null);
        setManualRunningCountdownSec(0);
        toast({
          title: t("sinchaiPlanner.manualCompletedTitle"),
          description: t("sinchaiPlanner.manualCompletedDescription"),
        });
        return;
      }
      setManualRunningCountdownSec(Math.ceil(remainingMs / 1000));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [manualRunning, manualRunningEndsAt, toast, t]);

  useEffect(() => {
    if (!manualFertigationRunning || !manualFertigationEndsAt) {
      setManualFertigationCountdownSec(0);
      return;
    }
    const update = () => {
      const remainingMs = manualFertigationEndsAt - Date.now();
      if (remainingMs <= 0) {
        setManualFertigationRunning(false);
        setManualFertigationEndsAt(null);
        setManualFertigationCountdownSec(0);
        toast({
          title: t("sinchaiPlanner.manualFertigationCompletedTitle"),
          description: t("sinchaiPlanner.manualFertigationCompletedDescription"),
        });
        return;
      }
      setManualFertigationCountdownSec(Math.ceil(remainingMs / 1000));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [manualFertigationRunning, manualFertigationEndsAt, toast, t]);

  useEffect(() => {
    if (!token || !loginResponse) {
      navigate("/");
    }
  }, [token, loginResponse, navigate]);

  useEffect(() => {
    applySeo({
      title: "Sinchai Planner | EzeBuddies",
      description: "Irrigation schedule planner for Smart_Sinchai users.",
      path: "/dashboard/sinchai-planner",
      robots: "noindex, nofollow",
    });
  }, []);

  useEffect(() => {
    if (!token || !userId) return;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSinchaiPlanner({
          token,
          userId,
          section: "user_sinchai_planner",
        });

        if (!mounted) return;

        const loadedMode = normalizeMode(data?.mode ?? "Auto");
        const loadedSchedules =
          data?.schedules && data.schedules.length > 0 ? normalizeScheduleNumbers(data.schedules) : [buildDefaultSinchaiSchedule(1)];
        const loadedNoOfValves =
          typeof data?.no_of_valves === "number" && Number.isFinite(data.no_of_valves)
            ? Math.max(1, Math.trunc(data.no_of_valves))
            : sinchaiValveOptions.length;
        const loadedFertigationTime =
          typeof data?.fertigation_time_min === "number" && Number.isFinite(data.fertigation_time_min)
            ? Math.max(0, data.fertigation_time_min)
            : null;
        const loadedNoOfNutritionTank =
          typeof data?.no_of_nutrition_tank === "number" && Number.isFinite(data.no_of_nutrition_tank)
            ? Math.max(0, Math.trunc(data.no_of_nutrition_tank))
            : 2;
        const loadedEcCalibrationPoint: EcCalibrationPoint = {
          concentration_solution_liquid_quantity_ml:
            typeof data?.ec_calibration_point?.concentration_solution_liquid_quantity_ml === "number"
              ? data.ec_calibration_point.concentration_solution_liquid_quantity_ml
              : null,
          ro_water_liter: typeof data?.ec_calibration_point?.ro_water_liter === "number" ? data.ec_calibration_point.ro_water_liter : null,
          ec_increased_by: typeof data?.ec_calibration_point?.ec_increased_by === "number" ? data.ec_calibration_point.ec_increased_by : null,
        };
        const loadedPhCalibrationPoint: PhCalibrationPoint = {
          ph_up_basic_solution: {
            concentration_solution_liquid_quantity_ml:
              typeof data?.ph_calibration_point?.ph_up_basic_solution?.concentration_solution_liquid_quantity_ml === "number"
                ? data.ph_calibration_point.ph_up_basic_solution.concentration_solution_liquid_quantity_ml
                : null,
            ro_water_liter:
              typeof data?.ph_calibration_point?.ph_up_basic_solution?.ro_water_liter === "number"
                ? data.ph_calibration_point.ph_up_basic_solution.ro_water_liter
                : null,
            ph_increased_by:
              typeof data?.ph_calibration_point?.ph_up_basic_solution?.ph_increased_by === "number"
                ? data.ph_calibration_point.ph_up_basic_solution.ph_increased_by
                : null,
          },
          ph_down_acidic_solution: {
            concentration_solution_liquid_quantity_ml:
              typeof data?.ph_calibration_point?.ph_down_acidic_solution?.concentration_solution_liquid_quantity_ml === "number"
                ? data.ph_calibration_point.ph_down_acidic_solution.concentration_solution_liquid_quantity_ml
                : null,
            ro_water_liter:
              typeof data?.ph_calibration_point?.ph_down_acidic_solution?.ro_water_liter === "number"
                ? data.ph_calibration_point.ph_down_acidic_solution.ro_water_liter
                : null,
            ph_decreased_by:
              typeof data?.ph_calibration_point?.ph_down_acidic_solution?.ph_decreased_by === "number"
                ? data.ph_calibration_point.ph_down_acidic_solution.ph_decreased_by
                : null,
          },
        };
        const manualLog = data?.manual_log;
        const manualFertigationLog = data?.manual_fertigation_log;
        const manualRunningFromApi =
          manualLog?.timestamp && typeof manualLog.duration_min === "number"
            ? isManualLogRunning(manualLog.timestamp, manualLog.duration_min)
            : false;
        const manualEndTime =
          manualLog?.timestamp && typeof manualLog.duration_min === "number"
            ? getManualLogEndTime(manualLog.timestamp, manualLog.duration_min)
            : null;
        const manualFertigationEndTime =
          manualFertigationLog?.timestamp && typeof loadedFertigationTime === "number" && loadedFertigationTime > 0
            ? getFertigationEndTime(manualFertigationLog.timestamp, loadedFertigationTime)
            : null;
        const manualFertigationRunningFromApi =
          typeof manualFertigationEndTime === "number" ? manualFertigationEndTime >= Date.now() : false;

        setMode(loadedMode);
        setSavedMode(loadedMode);
        setSchedules(loadedSchedules);
        setSelectedScheduleNo(loadedSchedules[0]?.schedule_no ?? 1);
        setNoOfValves(loadedNoOfValves);
        setFertigationTimeMin(loadedFertigationTime);
        setNoOfNutritionTank(loadedNoOfNutritionTank);
        setEcCalibrationPoint(loadedEcCalibrationPoint);
        setPhCalibrationPoint(loadedPhCalibrationPoint);
        if (loadedMode === "Manual" && manualLog) {
          setManualDurationMin(typeof manualLog.duration_min === "number" ? manualLog.duration_min : null);
          setManualSelectedValves(Array.isArray(manualLog.valves) ? manualLog.valves : []);
        }
        setManualRunning(manualRunningFromApi);
        setManualRunningEndsAt(manualRunningFromApi ? manualEndTime : null);
        setManualRunningCountdownSec(
          manualRunningFromApi && manualEndTime ? Math.max(0, Math.ceil((manualEndTime - Date.now()) / 1000)) : 0,
        );
        if (loadedMode === "Manual" && manualFertigationLog) {
          setManualFertigationEcLower(
            typeof manualFertigationLog.eC?.LL === "number" ? manualFertigationLog.eC.LL : null,
          );
          setManualFertigationEcUpper(
            typeof manualFertigationLog.eC?.HL === "number" ? manualFertigationLog.eC.HL : null,
          );
          setManualFertigationPhLower(
            typeof manualFertigationLog.pH?.LL === "number" ? manualFertigationLog.pH.LL : null,
          );
          setManualFertigationPhUpper(
            typeof manualFertigationLog.pH?.HL === "number" ? manualFertigationLog.pH.HL : null,
          );
          setManualFertigationNutritionTanks(manualFertigationLog.nutrition_tanks ?? {});
        } else {
          setManualFertigationEcLower(null);
          setManualFertigationEcUpper(null);
          setManualFertigationPhLower(null);
          setManualFertigationPhUpper(null);
          setManualFertigationNutritionTanks({});
        }
        setManualFertigationRunning(manualFertigationRunningFromApi);
        setManualFertigationEndsAt(manualFertigationRunningFromApi ? manualFertigationEndTime : null);
        setManualFertigationCountdownSec(
          manualFertigationRunningFromApi && manualFertigationEndTime
            ? Math.max(0, Math.ceil((manualFertigationEndTime - Date.now()) / 1000))
            : 0,
        );
        setInitialSnapshot(getPlannerSnapshot(loadedNoOfValves, loadedSchedules));
        setInitialFertigationSnapshot(
          getFertigationSnapshot(loadedFertigationTime, loadedNoOfNutritionTank, loadedEcCalibrationPoint, loadedPhCalibrationPoint),
        );
      } catch (error) {
        console.error("Sinchai planner load failed:", error);
        if (!mounted) return;
        const fallback = [buildDefaultSinchaiSchedule(1)];
        setMode("Auto");
        setSavedMode("Auto");
        setSchedules(fallback);
        setSelectedScheduleNo(fallback[0]?.schedule_no ?? 1);
        setNoOfValves(sinchaiValveOptions.length);
        setFertigationTimeMin(null);
        setNoOfNutritionTank(2);
        setEcCalibrationPoint({ concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ec_increased_by: null });
        setPhCalibrationPoint({
          ph_up_basic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_increased_by: null },
          ph_down_acidic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_decreased_by: null },
        });
        setManualDurationMin(null);
        setManualSelectedValves([]);
        setManualRunning(false);
        setManualRunningEndsAt(null);
        setManualRunningCountdownSec(0);
        setManualFertigationEcLower(null);
        setManualFertigationEcUpper(null);
        setManualFertigationPhLower(null);
        setManualFertigationPhUpper(null);
        setManualFertigationNutritionTanks({});
        setManualFertigationRunning(false);
        setManualFertigationEndsAt(null);
        setManualFertigationCountdownSec(0);
        setInitialSnapshot(getPlannerSnapshot(sinchaiValveOptions.length, fallback));
        setInitialFertigationSnapshot(
          getFertigationSnapshot(
            null,
            2,
            { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ec_increased_by: null },
            {
              ph_up_basic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_increased_by: null },
              ph_down_acidic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_decreased_by: null },
            },
          ),
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [token, userId]);

  const updateSchedule = (scheduleNo: number, updater: (schedule: SinchaiSchedule) => SinchaiSchedule) => {
    setSchedules((prev) =>
      normalizeScheduleNumbers(
        prev.map((schedule) => (schedule.schedule_no === scheduleNo ? updater(schedule) : schedule)),
      ),
    );
  };

  const toggleListValue = (values: string[], value: string, checked: boolean, ordering: readonly string[]) => {
    const next = checked ? Array.from(new Set([...values, value])) : values.filter((item) => item !== value);
    return next.sort((a, b) => ordering.indexOf(a) - ordering.indexOf(b));
  };

  const addSchedule = () => {
    setSchedules((prev) => {
      const next = normalizeScheduleNumbers([...prev, buildDefaultSinchaiSchedule(prev.length + 1)]);
      setSelectedScheduleNo(next[next.length - 1]?.schedule_no ?? next[0]?.schedule_no ?? 1);
      return next;
    });
  };

  const deleteSchedule = (scheduleNo: number) => {
    setSchedules((prev) => {
      const next = prev.filter((schedule) => schedule.schedule_no !== scheduleNo);
      const normalized = normalizeScheduleNumbers(next.length > 0 ? next : [buildDefaultSinchaiSchedule(1)]);
      setSelectedScheduleNo((current) => {
        if (normalized.some((schedule) => schedule.schedule_no === current)) return current;
        return normalized[0]?.schedule_no ?? 1;
      });
      return normalized;
    });
  };

  const handleSave = async () => {
    if (!token || !userId) return;
    const normalized = normalizeScheduleNumbers(schedules);
    const validationMessage = validatePlannerBeforeSave(mode, fertigationTimeMin, normalized, t);
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    const overlap = findOverlappingSchedules(normalized, fertigationTimeMin);
    if (overlap) {
      toast({
        title: t("sinchaiPlanner.overlapTitle"),
        description: t("sinchaiPlanner.overlapDescription", {
          first: overlap.first.schedule_name || `${t("sinchaiPlanner.schedule")} ${overlap.first.schedule_no}`,
          second: overlap.second.schedule_name || `${t("sinchaiPlanner.schedule")} ${overlap.second.schedule_no}`,
          days: overlap.commonDays.join(", "),
        }),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      await saveSinchaiPlanner({
        token,
        userId,
        noOfValves,
        schedules: normalized,
      });
      setSchedules(normalized);
      setInitialSnapshot(getPlannerSnapshot(noOfValves, normalized));
      toast({
        title: t("sinchaiPlanner.savedTitle"),
        description: t("sinchaiPlanner.savedDescription"),
      });
    } catch (error) {
      console.error("Sinchai planner save failed:", error);
      toast({
        title: t("sinchaiPlanner.saveFailedTitle"),
        description: t("sinchaiPlanner.saveFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFertigationApplyChanges = async () => {
    if (!token || !userId || !controlApiBase) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    if (fertigationTimeMin === null || fertigationTimeMin <= 0) {
      setValidationError(t("sinchaiPlanner.validationFertigation"));
      return;
    }
    if (noOfNutritionTank === null || noOfNutritionTank < 0) {
      setValidationError(t("sinchaiPlanner.validationNutritionTankCount"));
      return;
    }

    try {
      setIsSaving(true);
      await updateFertigationSettings({
        apiBase: controlApiBase,
        token,
        userId,
        fertigationTimeMin,
        noOfNutritionTank,
        ecCalibrationPoint: {
          concentration_solution_liquid_quantity_ml: ecCalibrationPoint.concentration_solution_liquid_quantity_ml,
          ro_water_liter: ecCalibrationPoint.ro_water_liter,
          ec_increased_by: ecCalibrationPoint.ec_increased_by,
        },
        phCalibrationPoint: {
          ph_up_basic_solution: {
            concentration_solution_liquid_quantity_ml: phCalibrationPoint.ph_up_basic_solution.concentration_solution_liquid_quantity_ml,
            ro_water_liter: phCalibrationPoint.ph_up_basic_solution.ro_water_liter,
            ph_increased_by: phCalibrationPoint.ph_up_basic_solution.ph_increased_by ?? null,
          },
          ph_down_acidic_solution: {
            concentration_solution_liquid_quantity_ml: phCalibrationPoint.ph_down_acidic_solution.concentration_solution_liquid_quantity_ml,
            ro_water_liter: phCalibrationPoint.ph_down_acidic_solution.ro_water_liter,
            ph_decreased_by: phCalibrationPoint.ph_down_acidic_solution.ph_decreased_by ?? null,
          },
        },
      });
      setInitialFertigationSnapshot(getFertigationSnapshot(fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint));
      toast({
        title: t("sinchaiPlanner.fertigationUpdatedTitle"),
        description: t("sinchaiPlanner.fertigationUpdatedDescription"),
      });
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      console.error("Fertigation settings update failed:", error);
      setValidationError(t("sinchaiPlanner.fertigationUpdateFailedDescription"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeUpdate = async () => {
    if (!token || !userId) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    if (!isModeDirty) return;

    try {
      setIsModeUpdating(true);
      await updateSinchaiPlannerMode({
        token,
        userId,
        mode,
      });
      setSavedMode(mode);
      toast({
        title: t("sinchaiPlanner.modeUpdatedTitle"),
        description: t("sinchaiPlanner.modeUpdatedDescription"),
      });
    } catch (error) {
      console.error("Planner mode update failed:", error);
      setValidationError(t("sinchaiPlanner.modeUpdateFailedDescription"));
    } finally {
      setIsModeUpdating(false);
    }
  };

  const handleManualStart = async () => {
    if (manualControlsLocked) {
      setValidationError(t("sinchaiPlanner.manualSaveRequiredBeforeRun"));
      return;
    }
    if (manualFertigationRunning) {
      setValidationError(t("sinchaiPlanner.manualIrrigationBlockedByFertigation"));
      return;
    }
    if (!token || !userId || !controlApiBase) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    if (manualDurationMin === null || manualDurationMin <= 0) {
      setValidationError(t("sinchaiPlanner.validationManualDuration"));
      return;
    }
    if (manualSelectedValves.length === 0) {
      setValidationError(t("sinchaiPlanner.validationManualValves"));
      return;
    }
    try {
      setIsManualStartSubmitting(true);
      const timestamp = new Date().toISOString();
      await startManualIrrigation({
        apiBase: controlApiBase,
        token,
        userId,
        farmId,
        timestamp,
        durationMin: manualDurationMin,
        valves: manualSelectedValves,
      });
      setManualRunning(true);
      setManualRunningEndsAt(Date.now() + manualDurationMin * 60 * 1000);
      setManualRunningCountdownSec(Math.ceil(manualDurationMin * 60));
      toast({
        title: t("sinchaiPlanner.manualStartedTitle"),
        description: t("sinchaiPlanner.manualStartedDescription"),
      });
    } catch (error) {
      console.error("Manual start API failed:", error);
      setValidationError(t("sinchaiPlanner.manualStartFailedDescription"));
    } finally {
      setIsManualStartSubmitting(false);
    }
  };

  const handleManualStop = async () => {
    if (manualControlsLocked) {
      setValidationError(t("sinchaiPlanner.manualSaveRequiredBeforeRun"));
      return;
    }
    if (!token || !userId || !controlApiBase) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    try {
      setIsManualStopSubmitting(true);
      await triggerEStop({
        apiBase: controlApiBase,
        token,
        userId,
        solutionName: "Smart_Sinchai",
      });
      await resetManualLog({
        apiBase: controlApiBase,
        token,
        userId,
        farmId,
      });
      setManualRunning(false);
      setManualRunningEndsAt(null);
      setManualRunningCountdownSec(0);
      toast({
        title: t("sinchaiPlanner.manualStoppedTitle"),
        description: t("sinchaiPlanner.manualStoppedDescription"),
      });
    } catch (error) {
      console.error("Manual stop E-Stop API failed:", error);
      setValidationError(t("dashboard.estopFailedDescription"));
    } finally {
      setIsManualStopSubmitting(false);
    }
  };

  const handleManualFertigationStart = async () => {
    if (manualControlsLocked) {
      setValidationError(t("sinchaiPlanner.manualSaveRequiredBeforeRun"));
      return;
    }
    if (!token || !userId || !controlApiBase) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    if (manualRunning) {
      setValidationError(t("sinchaiPlanner.manualFertigationBlockedByIrrigation"));
      return;
    }
    if (manualFertigationRunning) {
      return;
    }
    if (fertigationTimeMin === null || fertigationTimeMin <= 0) {
      setValidationError(t("sinchaiPlanner.validationFertigation"));
      return;
    }
    if (
      manualFertigationEcLower === null ||
      manualFertigationEcUpper === null ||
      manualFertigationPhLower === null ||
      manualFertigationPhUpper === null
    ) {
      setValidationError(t("sinchaiPlanner.manualFertigationValidationLimits"));
      return;
    }
    const missingTank = nutritionTankLabels.find((label) => {
      const value = manualFertigationNutritionTanks[label];
      return !value || !value.toString().trim();
    });
    if (missingTank) {
      setValidationError(t("sinchaiPlanner.manualFertigationValidationTank", { tank: missingTank }));
      return;
    }
    const nutritionTankPayload: Record<string, number> = {};
    for (const label of nutritionTankLabels) {
      const rawValue = manualFertigationNutritionTanks[label];
      const numericValue = parseNullableNumber(rawValue ?? "");
      if (numericValue === null) {
        setValidationError(t("sinchaiPlanner.manualFertigationValidationTankNumeric", { tank: label }));
        return;
      }
      nutritionTankPayload[label] = numericValue;
    }

    try {
      setIsManualFertigationStartSubmitting(true);
      const timestamp = new Date().toISOString();
      await startManualFertigation({
        apiBase: controlApiBase,
        token,
        userId,
        farmId,
        timestamp,
        ecLowerLimit: manualFertigationEcLower,
        ecUpperLimit: manualFertigationEcUpper,
        phLowerLimit: manualFertigationPhLower,
        phUpperLimit: manualFertigationPhUpper,
        nutritionTanks: nutritionTankPayload,
      });
      const endAt = Date.now() + fertigationTimeMin * 60 * 1000;
      setManualFertigationEndsAt(endAt);
      setManualFertigationRunning(true);
      setManualFertigationCountdownSec(Math.ceil(fertigationTimeMin * 60));
      toast({
        title: t("sinchaiPlanner.manualFertigationStartedTitle"),
        description: t("sinchaiPlanner.manualFertigationStartedDescription", { minutes: fertigationTimeMin }),
      });
    } catch (error) {
      console.error("Manual fertigation start API failed:", error);
      setValidationError(t("sinchaiPlanner.manualFertigationStartFailedDescription"));
    } finally {
      setIsManualFertigationStartSubmitting(false);
    }
  };

  const manualFertigationCountdownLabel = useMemo(() => {
    if (!manualFertigationRunning || manualFertigationCountdownSec <= 0) return "--:--";
    const min = Math.floor(manualFertigationCountdownSec / 60);
    const sec = manualFertigationCountdownSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [manualFertigationRunning, manualFertigationCountdownSec]);

  const manualRunningCountdownLabel = useMemo(() => {
    if (!manualRunning || manualRunningCountdownSec <= 0) return "--:--";
    const min = Math.floor(manualRunningCountdownSec / 60);
    const sec = manualRunningCountdownSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [manualRunning, manualRunningCountdownSec]);

  const manualModeBlockLabels = useMemo(
    () => ({
      irrigation: manualRunning ? t("sinchaiPlanner.manualModeAutoBlockedIrrigation", { time: manualRunningCountdownLabel }) : null,
      fertigation: manualFertigationRunning
        ? t("sinchaiPlanner.manualModeAutoBlockedFertigation", { time: manualFertigationCountdownLabel })
        : null,
    }),
    [manualRunning, manualRunningCountdownLabel, manualFertigationRunning, manualFertigationCountdownLabel, t],
  );

  const handleModeChange = (nextMode: PlannerMode) => {
    if (nextMode === mode) return;
    if (mode === "Manual" && nextMode === "Auto" && (manualRunning || manualFertigationRunning)) {
      setIsManualModeBlockDialogOpen(true);
      return;
    }
    if (mode === "Auto" && nextMode === "Manual" && autoModeActivityRunning) {
      setPendingModeAfterEStop(nextMode);
      setIsModeSwitchEStopDialogOpen(true);
      return;
    }
    setMode(nextMode);
  };

  const handleModeSwitchEStop = async () => {
    if (!token || !userId || !controlApiBase) {
      setValidationError(t("dashboard.estopConfigMissingDescription"));
      return;
    }
    try {
      setIsModeSwitchEStopSubmitting(true);
      await triggerEStop({
        apiBase: controlApiBase,
        token,
        userId,
        solutionName: "Smart_Sinchai",
      });
      setIsModeSwitchEStopDialogOpen(false);
      if (pendingModeAfterEStop) {
        setMode(pendingModeAfterEStop);
      }
      setPendingModeAfterEStop(null);
      toast({
        title: t("dashboard.estopEnabledTitle"),
        description: t("dashboard.estopEnabledDescription", { solution: "Smart_Sinchai" }),
        variant: "destructive",
      });
    } catch (error) {
      console.error("Mode switch E-Stop API failed:", error);
      setValidationError(t("dashboard.estopFailedDescription"));
    } finally {
      setIsModeSwitchEStopSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-2xl border border-cyan-200/70 bg-gradient-to-r from-white via-cyan-50/70 to-emerald-50/70 p-5 shadow-[0_18px_42px_-28px_rgba(10,130,120,0.55)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700/80">Smart_Sinchai</p>
            <h1 className="font-display text-3xl font-bold text-slate-900">{t("dashboard.sinchaiPlanner")}</h1>
            <p className="mt-1 text-sm text-slate-600">{t("sinchaiPlanner.subtitle")}</p>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-sm shadow-sm">
            <p className="font-semibold text-slate-800">{displayName}</p>
            <p className="text-slate-500">{userId ?? "--"}</p>
          </div>
        </div>
      </motion.div>

      <Card className="border-cyan-200/60">
        <CardHeader>
          <CardTitle>{t("sinchaiPlanner.configurationTitle")}</CardTitle>
          <CardDescription>{t("sinchaiPlanner.configurationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("sinchaiPlanner.userNameLabel")}</Label>
            <Input value={displayName} readOnly />
          </div>
          <div className="space-y-2">
            <Label>{t("sinchaiPlanner.modeLabel")}</Label>
            <select
              value={mode}
              onChange={(event) => handleModeChange(normalizeMode(event.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Auto">{t("dashboard.auto")}</option>
              <option value="Manual">{t("dashboard.manual")}</option>
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              type="button"
              onClick={handleModeUpdate}
              disabled={!isModeDirty || isModeUpdating}
              className={isModeDirty ? "shadow-md shadow-cyan-200/60 ring-1 ring-cyan-300/60" : ""}
            >
              <Save className="mr-2 h-4 w-4" />
              {isModeUpdating ? t("sinchaiPlanner.updatingMode") : t("sinchaiPlanner.updateMode")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 text-slate-900 shadow-[0_18px_40px_-24px_rgba(70,140,95,0.35)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <FlaskConical className="h-5 w-5" />
              {t("sinchaiPlanner.fertigationTitle")}
            </CardTitle>
            <Button type="button" onClick={handleFertigationApplyChanges} disabled={!isFertigationDirty || isSaving} className="shrink-0">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? t("sinchaiPlanner.applyingChanges") : t("sinchaiPlanner.applyChanges")}
            </Button>
          </div>
          <CardDescription className="text-slate-600">{t("sinchaiPlanner.fertigationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 [&_input]:border-emerald-200/80 [&_input]:bg-white [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 [&_input]:shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-emerald-900">{t("sinchaiPlanner.fertigationTimeMin")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={fertigationTimeMin ?? ""}
                  placeholder={t("sinchaiPlanner.fertigationPlaceholder")}
                  onChange={(event) => setFertigationTimeMin(parseNullableNumber(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-emerald-900">{t("sinchaiPlanner.noOfNutritionTank")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={noOfNutritionTank ?? ""}
                  placeholder={t("sinchaiPlanner.noOfNutritionTankPlaceholder")}
                  readOnly
                  aria-readonly="true"
                  className="cursor-not-allowed bg-white text-slate-900 opacity-100"
                />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-white/70 p-4">
              <p className="mb-3 text-sm font-bold text-emerald-900">{t("sinchaiPlanner.ecCalibrationTitle")}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs text-violet-800">{t("sinchaiPlanner.concentrationSolutionQtyMl")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={ecCalibrationPoint.concentration_solution_liquid_quantity_ml ?? ""}
                    onChange={(event) =>
                      setEcCalibrationPoint((prev) => ({
                        ...prev,
                        concentration_solution_liquid_quantity_ml: parseNullableNumber(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-violet-800">{t("sinchaiPlanner.roWaterLiter")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={ecCalibrationPoint.ro_water_liter ?? ""}
                    onChange={(event) =>
                      setEcCalibrationPoint((prev) => ({
                        ...prev,
                        ro_water_liter: parseNullableNumber(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-violet-800">{t("sinchaiPlanner.ecIncreasedBy")}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={ecCalibrationPoint.ec_increased_by ?? ""}
                    onChange={(event) =>
                      setEcCalibrationPoint((prev) => ({
                        ...prev,
                        ec_increased_by: parseNullableNumber(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200/80 bg-white/70 p-4">
              <p className="mb-3 text-sm font-bold text-amber-900">{t("sinchaiPlanner.phCalibrationTitle")}</p>
              <div className="space-y-4">
                <div className="rounded-lg border border-sky-200/70 bg-white/80 p-3">
                  <p className="mb-2 text-xs font-bold text-sky-800">{t("sinchaiPlanner.phUpBasicSolution")}</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.concentrationSolutionQtyMl")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={phCalibrationPoint.ph_up_basic_solution.concentration_solution_liquid_quantity_ml ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_up_basic_solution: {
                              ...prev.ph_up_basic_solution,
                              concentration_solution_liquid_quantity_ml: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.roWaterLiter")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={phCalibrationPoint.ph_up_basic_solution.ro_water_liter ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_up_basic_solution: {
                              ...prev.ph_up_basic_solution,
                              ro_water_liter: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.phIncreasedBy")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={phCalibrationPoint.ph_up_basic_solution.ph_increased_by ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_up_basic_solution: {
                              ...prev.ph_up_basic_solution,
                              ph_increased_by: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-sky-200/70 bg-white/80 p-3">
                  <p className="mb-2 text-xs font-bold text-sky-800">{t("sinchaiPlanner.phDownAcidicSolution")}</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.concentrationSolutionQtyMl")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={phCalibrationPoint.ph_down_acidic_solution.concentration_solution_liquid_quantity_ml ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_down_acidic_solution: {
                              ...prev.ph_down_acidic_solution,
                              concentration_solution_liquid_quantity_ml: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.roWaterLiter")}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={phCalibrationPoint.ph_down_acidic_solution.ro_water_liter ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_down_acidic_solution: {
                              ...prev.ph_down_acidic_solution,
                              ro_water_liter: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-sky-800">{t("sinchaiPlanner.phDecreasedBy")}</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={phCalibrationPoint.ph_down_acidic_solution.ph_decreased_by ?? ""}
                        onChange={(event) =>
                          setPhCalibrationPoint((prev) => ({
                            ...prev,
                            ph_down_acidic_solution: {
                              ...prev.ph_down_acidic_solution,
                              ph_decreased_by: parseNullableNumber(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(validationError)} onOpenChange={(open) => !open && setValidationError(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sinchaiPlanner.validationTitle")}</DialogTitle>
            <DialogDescription>{validationError ?? ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={isModeSwitchEStopDialogOpen} onOpenChange={setIsModeSwitchEStopDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sinchaiPlanner.modeSwitchRunningTitle")}</DialogTitle>
            <DialogDescription>{t("sinchaiPlanner.modeSwitchRunningDescription")}</DialogDescription>
          </DialogHeader>
          <Button type="button" variant="destructive" onClick={handleModeSwitchEStop} disabled={isModeSwitchEStopSubmitting}>
            {t("dashboard.stop")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualModeBlockDialogOpen} onOpenChange={setIsManualModeBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sinchaiPlanner.manualModeAutoBlockedTitle")}</DialogTitle>
            <DialogDescription>{t("sinchaiPlanner.manualModeAutoBlockedDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
            {manualModeBlockLabels.irrigation ? <p>{manualModeBlockLabels.irrigation}</p> : null}
            {manualModeBlockLabels.fertigation ? <p>{manualModeBlockLabels.fertigation}</p> : null}
            <p className="font-semibold text-amber-900">{t("sinchaiPlanner.manualModeAutoBlockedFooter")}</p>
          </div>
          <Button type="button" onClick={() => setIsManualModeBlockDialogOpen(false)}>
            OK
          </Button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">{t("planner.loading")}</CardContent>
        </Card>
      ) : mode === "Manual" ? (
        <div className="space-y-4">
          <Card className="border-cyan-200/70 shadow-[0_14px_34px_-26px_rgba(20,95,170,0.65)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t("sinchaiPlanner.manualCardTitle")}</CardTitle>
                  <CardDescription>{t("sinchaiPlanner.manualCardDescription")}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full border px-4 py-1.5 font-extrabold shadow-sm transition-all duration-300 ${
                      manualRunning
                        ? "scale-105 border-emerald-300 bg-emerald-50 text-emerald-800 text-lg"
                        : "scale-100 border-slate-300 bg-slate-50 text-slate-700 text-sm"
                    }`}
                  >
                    {manualRunning ? t("sinchaiPlanner.manualRunning") : t("sinchaiPlanner.manualIdle")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("sinchaiPlanner.duration")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={manualDurationMin ?? ""}
                    onChange={(event) => setManualDurationMin(event.target.value ? Number(event.target.value) : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">{t("sinchaiPlanner.selectValves")}</p>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {valveOptions.map((valve) => {
                    const checked = manualSelectedValves.includes(valve);
                    return (
                      <label key={`manual-${valve}`} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) =>
                            setManualSelectedValves((prev) => toggleListValue(prev, valve, state === true, valveOptions))
                          }
                        />
                        <span>{valve}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleManualStart}
                  disabled={manualControlsLocked || manualRunning || isManualStartSubmitting || manualFertigationRunning}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t("sinchaiPlanner.startButton")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleManualStop}
                  disabled={manualControlsLocked || !manualRunning || isManualStopSubmitting}
                >
                  <Square className="mr-2 h-4 w-4" />
                  {t("sinchaiPlanner.stopButton")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-violet-200/70 shadow-[0_14px_34px_-26px_rgba(118,78,187,0.6)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t("sinchaiPlanner.manualFertigationTitle")}</CardTitle>
                  <CardDescription>{t("sinchaiPlanner.manualFertigationDescription")}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full border px-4 py-1.5 font-extrabold shadow-sm transition-all duration-300 ${
                      manualFertigationRunning
                        ? "scale-105 border-violet-300 bg-violet-50 text-violet-800 text-lg"
                        : "scale-100 border-slate-300 bg-slate-50 text-slate-700 text-sm"
                    }`}
                  >
                    {manualFertigationRunning ? t("sinchaiPlanner.manualFertigationRunning") : t("sinchaiPlanner.manualFertigationIdle")}
                  </span>
                  <p className="text-xs font-semibold text-violet-700">
                    {t("sinchaiPlanner.remainingTime")}: {manualFertigationCountdownLabel}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                  <p className="text-sm font-semibold text-violet-800">{t("sinchaiPlanner.ecLimits")}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-violet-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={manualFertigationEcLower ?? ""}
                        onChange={(event) => setManualFertigationEcLower(parseNullableNumber(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-violet-700">{t("sinchaiPlanner.upperLimit")}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={manualFertigationEcUpper ?? ""}
                        onChange={(event) => setManualFertigationEcUpper(parseNullableNumber(event.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
                  <p className="text-sm font-semibold text-fuchsia-800">{t("sinchaiPlanner.phLimits")}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-fuchsia-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={manualFertigationPhLower ?? ""}
                        onChange={(event) => setManualFertigationPhLower(parseNullableNumber(event.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-fuchsia-700">{t("sinchaiPlanner.upperLimit")}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={manualFertigationPhUpper ?? ""}
                        onChange={(event) => setManualFertigationPhUpper(parseNullableNumber(event.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-700">{t("sinchaiPlanner.nutritionTanks")}</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 bg-white text-violet-700 transition hover:bg-violet-100"
                        aria-label={t("sinchaiPlanner.nutritionTanksInfoLabel")}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 border-violet-200 bg-white/95 text-sm text-slate-700">
                      {t("sinchaiPlanner.nutritionTanksInfo")}
                    </PopoverContent>
                  </Popover>
                </div>
                {nutritionTankLabels.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {nutritionTankLabels.map((tankLabel) => (
                      <div key={`manual-fertigation-tank-${tankLabel}`} className="space-y-1">
                        <Label className="text-xs text-violet-700">
                          {t("sinchaiPlanner.nutritionTank")} {tankLabel}
                        </Label>
                        <Input
                          value={manualFertigationNutritionTanks[tankLabel] ?? ""}
                          placeholder={`${t("sinchaiPlanner.nutritionTank")} ${tankLabel}`}
                          onChange={(event) =>
                            setManualFertigationNutritionTanks((prev) => ({
                              ...prev,
                              [tankLabel]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-violet-700/80">{t("sinchaiPlanner.noNutritionTanksHint")}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleManualFertigationStart}
                  disabled={manualControlsLocked || manualFertigationRunning || manualRunning || isManualFertigationStartSubmitting}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t("sinchaiPlanner.startButton")}
                </Button>
                <p className="text-xs text-slate-600">
                  {t("sinchaiPlanner.manualFertigationUsesTime", { minutes: fertigationTimeMin ?? "--" })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{t("sinchaiPlanner.schedulesTitle")}</h2>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={addSchedule}>
                <Plus className="mr-2 h-4 w-4" />
                {t("sinchaiPlanner.addSchedule")}
              </Button>
              <Button type="button" onClick={handleSave} disabled={isSaving || !isDirty}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t("sinchaiPlanner.saving") : t("sinchaiPlanner.saveAll")}
              </Button>
            </div>
          </div>
          {schedules.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {schedules.map((schedule, index) => {
                  const active = schedule.schedule_no === selectedScheduleNo;
                  return (
                    <motion.div
                      key={schedule.schedule_no}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => setSelectedScheduleNo(schedule.schedule_no)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedScheduleNo(schedule.schedule_no);
                        }
                      }}
                      className={`group flex min-w-[220px] cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-[0_12px_30px_-22px_rgba(20,95,170,0.45)] transition-all duration-200 ${
                        active
                          ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-200"
                          : "border-cyan-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/70"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                          {t("sinchaiPlanner.schedule")} {schedule.schedule_no}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900">{schedule.schedule_name || `Schedule ${schedule.schedule_no}`}</p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteSchedule(schedule.schedule_no);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {selectedSchedule ? (
                <motion.div
                  key={selectedSchedule.schedule_no}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Card className="border-cyan-200/60 shadow-[0_14px_34px_-26px_rgba(20,95,170,0.65)]">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">
                          {t("sinchaiPlanner.schedule")} {selectedSchedule.schedule_no}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div
                        className={`rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 p-4 shadow-[0_12px_28px_-20px_rgba(16,110,200,0.45)] transition-all duration-300 ${
                          selectedSchedule.refill_enabled ?? true ? "opacity-100" : "opacity-75"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-cyan-800">
                            {t("sinchaiPlanner.refillSectionTitle")}
                          </p>
                          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/90 px-3 py-1.5 shadow-sm">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-700">
                              {t("sinchaiPlanner.refillSectionTitle")}
                            </span>
                            <Switch
                              checked={selectedSchedule.refill_enabled ?? true}
                              onCheckedChange={(checked) =>
                                updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                  ...prev,
                                  refill_enabled: checked,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>{t("sinchaiPlanner.scheduleName")}</Label>
                            <Input
                              value={selectedSchedule.schedule_name}
                              disabled={!(selectedSchedule.refill_enabled ?? true)}
                              onChange={(event) =>
                                updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                  ...prev,
                                  schedule_name: event.target.value,
                                }))
                              }
                              placeholder={`${t("sinchaiPlanner.schedule")} ${selectedSchedule.schedule_no}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("sinchaiPlanner.startTime")}</Label>
                            <Input
                              type="time"
                              value={selectedSchedule.start_time}
                              disabled={!(selectedSchedule.refill_enabled ?? true)}
                              onChange={(event) =>
                                updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                  ...prev,
                                  start_time: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("sinchaiPlanner.refillDuration")}</Label>
                            <Input
                              type="number"
                              min={1}
                              value={selectedSchedule.refill_duration_min ?? ""}
                              disabled={!(selectedSchedule.refill_enabled ?? true)}
                              onChange={(event) =>
                                updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                  ...prev,
                                  refill_duration_min: event.target.value ? Number(event.target.value) : null,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-purple-50 p-4 shadow-[0_12px_28px_-20px_rgba(120,75,210,0.55)]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-800">{t("sinchaiPlanner.fertigateSectionTitle")}</p>
                          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/90 px-3 py-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-violet-700">
                              {t("sinchaiPlanner.fertigationStatus")}
                            </span>
                            <Switch
                              checked={selectedSchedule.fertigation_enabled ?? selectedSchedule.enabled}
                              onCheckedChange={(checked) =>
                                updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                  ...prev,
                                  enabled: checked,
                                  fertigation_enabled: checked,
                                }))
                              }
                            />
                            <span className="text-xs font-semibold text-slate-700">
                              {(selectedSchedule.fertigation_enabled ?? selectedSchedule.enabled)
                                ? t("sinchaiPlanner.enabled")
                                : t("sinchaiPlanner.disabled")}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-violet-200/80 bg-white/75 p-3 shadow-sm">
                            <p className="text-sm font-semibold text-violet-800">{t("sinchaiPlanner.ecLimits")}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-violet-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={selectedSchedule.ec_lower_limit ?? ""}
                                  onChange={(event) =>
                                    updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                      ...prev,
                                      ec_lower_limit: parseNullableNumber(event.target.value),
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-violet-700">{t("sinchaiPlanner.upperLimit")}</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={selectedSchedule.ec_upper_limit ?? ""}
                                  onChange={(event) =>
                                    updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                      ...prev,
                                      ec_upper_limit: parseNullableNumber(event.target.value),
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-fuchsia-200/80 bg-white/75 p-3 shadow-sm">
                            <p className="text-sm font-semibold text-fuchsia-800">{t("sinchaiPlanner.phLimits")}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-fuchsia-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={selectedSchedule.ph_lower_limit ?? ""}
                                  onChange={(event) =>
                                    updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                      ...prev,
                                      ph_lower_limit: parseNullableNumber(event.target.value),
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-fuchsia-700">{t("sinchaiPlanner.upperLimit")}</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={selectedSchedule.ph_upper_limit ?? ""}
                                  onChange={(event) =>
                                    updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                      ...prev,
                                      ph_upper_limit: parseNullableNumber(event.target.value),
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 rounded-xl border border-violet-200/80 bg-white/75 p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-700">
                              {t("sinchaiPlanner.nutritionTanks")}
                            </p>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-violet-300 bg-white text-violet-700 transition hover:bg-violet-100"
                                  aria-label={t("sinchaiPlanner.nutritionTanksInfoLabel")}
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-72 border-violet-200 bg-white/95 text-sm text-slate-700">
                                {t("sinchaiPlanner.nutritionTanksInfo")}
                              </PopoverContent>
                            </Popover>
                          </div>
                          {nutritionTankLabels.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {nutritionTankLabels.map((tankLabel) => (
                                <div key={`${selectedSchedule.schedule_no}-nutrition-tank-${tankLabel}`} className="space-y-1">
                                  <Label className="text-xs text-violet-700">
                                    {t("sinchaiPlanner.nutritionTank")} {tankLabel}
                                  </Label>
                                  <Input
                                    value={selectedSchedule.nutrition_tanks?.[tankLabel] ?? ""}
                                    placeholder={`${t("sinchaiPlanner.nutritionTank")} ${tankLabel}`}
                                    className="bg-white/90 text-violet-800 placeholder:text-violet-400"
                                    onChange={(event) =>
                                      updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                        ...prev,
                                        nutrition_tanks: {
                                          ...(prev.nutrition_tanks ?? {}),
                                          [tankLabel]: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-violet-700/80">{t("sinchaiPlanner.noNutritionTanksHint")}</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 shadow-[0_12px_28px_-20px_rgba(14,135,95,0.45)]">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800">{t("sinchaiPlanner.irrigateSectionTitle")}</p>
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2 md:col-span-1">
                              <Label>{t("sinchaiPlanner.duration")}</Label>
                              <Input
                                type="number"
                                min={1}
                                value={selectedSchedule.irrigation_duration_min ?? ""}
                                onChange={(event) =>
                                  updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                    ...prev,
                                    irrigation_duration_min: event.target.value ? Number(event.target.value) : null,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-800">{t("sinchaiPlanner.selectValves")}</p>
                            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                              {valveOptions.map((valve) => {
                                const checked = selectedSchedule.valves.includes(valve);
                                return (
                                  <label
                                    key={`${selectedSchedule.schedule_no}-${valve}`}
                                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow-sm"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(state) =>
                                        updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                          ...prev,
                                          valves: toggleListValue(prev.valves, valve, state === true, valveOptions),
                                        }))
                                      }
                                    />
                                    <span>{valve}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-800">{t("sinchaiPlanner.repeatDays")}</p>
                            <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
                              {sinchaiDayOptions.map((day) => {
                                const checked = selectedSchedule.days.includes(day);
                                return (
                                  <label
                                    key={`${selectedSchedule.schedule_no}-${day}`}
                                    className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white/90 px-3 py-2 text-sm shadow-sm"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(state) =>
                                        updateSchedule(selectedSchedule.schedule_no, (prev) => ({
                                          ...prev,
                                          days: toggleListValue(prev.days, day, state === true, sinchaiDayOptions),
                                        }))
                                      }
                                    />
                                    <span>{day}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : null}
            </div>
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">{t("sinchaiPlanner.noSchedules")}</CardContent>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}
