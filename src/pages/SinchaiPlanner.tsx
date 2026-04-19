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
import { fetchSinchaiPlanner, saveSinchaiPlanner, type SinchaiSchedule } from "@/lib/plannerApi";
import { resetManualLog, startManualFertigation, startManualIrrigation, triggerEStop } from "@/lib/dashboardControlApi";
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
  const preWindowBuffer = Math.max(0, Math.trunc(fertigationTimeMin ?? 0)) + 5;

  for (let i = 0; i < normalized.length; i += 1) {
    const first = normalized[i];
    const firstStart = parseTimeToMinutes(first.start_time);
    const firstDuration = typeof first.irrigation_duration_min === "number" ? first.irrigation_duration_min : null;
    if (firstStart === null || !firstDuration || firstDuration <= 0 || first.days.length === 0) continue;
    const firstWindowStart = Math.max(0, firstStart - preWindowBuffer);
    const firstWindowEnd = firstStart + firstDuration;

    for (let j = i + 1; j < normalized.length; j += 1) {
      const second = normalized[j];
      const secondStart = parseTimeToMinutes(second.start_time);
      const secondDuration = typeof second.irrigation_duration_min === "number" ? second.irrigation_duration_min : null;
      if (secondStart === null || !secondDuration || secondDuration <= 0 || second.days.length === 0) continue;
      const secondWindowStart = Math.max(0, secondStart - preWindowBuffer);
      const secondWindowEnd = secondStart + secondDuration;

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

function getPlannerSnapshot(
  mode: PlannerMode,
  fertigationTimeMin: number | null,
  noOfNutritionTank: number | null,
  ecCalibrationPoint: EcCalibrationPoint,
  phCalibrationPoint: PhCalibrationPoint,
  schedules: SinchaiSchedule[],
) {
  return JSON.stringify({
    mode,
    fertigation_time_min: fertigationTimeMin,
    no_of_nutrition_tank: noOfNutritionTank,
    ec_calibration_point: ecCalibrationPoint,
    ph_calibration_point: phCalibrationPoint,
    schedules: normalizeScheduleNumbers(schedules),
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

function getTodayShortName() {
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return shortDays[new Date().getDay()];
}

function isAutoScheduleRunningNow(schedules: SinchaiSchedule[], fertigationTimeMin: number | null) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = getTodayShortName();
  const fertigationLead = Math.max(0, Math.trunc(fertigationTimeMin ?? 0));

  return schedules.some((schedule) => {
    if (!schedule.enabled) return false;
    if (!schedule.days.includes(today)) return false;
    const startMin = parseTimeToMinutes(schedule.start_time);
    const duration = schedule.irrigation_duration_min;
    if (startMin === null || !duration || duration <= 0) return false;
    const activityStart = Math.max(0, startMin - fertigationLead);
    const activityEnd = startMin + duration;
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
  const [savedMode, setSavedMode] = useState<PlannerMode>("Auto");
  const [pendingModeAfterEStop, setPendingModeAfterEStop] = useState<PlannerMode | null>(null);
  const [isModeSwitchEStopDialogOpen, setIsModeSwitchEStopDialogOpen] = useState(false);
  const [isModeSwitchEStopSubmitting, setIsModeSwitchEStopSubmitting] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(
    getPlannerSnapshot(
      "Auto",
      null,
      2,
      { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ec_increased_by: null },
      {
        ph_up_basic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_increased_by: null },
        ph_down_acidic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_decreased_by: null },
      },
      [buildDefaultSinchaiSchedule(1)],
    ),
  );
  const controlApiBase = useMemo(
    () => resolveApiBase(import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL, import.meta.env.VITE_PLANNER_API_URL),
    [],
  );

  const isDirty = useMemo(
    () => getPlannerSnapshot(mode, fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint, schedules) !== initialSnapshot,
    [mode, fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint, schedules, initialSnapshot],
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
        const manualFertigationEndTime =
          manualFertigationLog?.timestamp && typeof loadedFertigationTime === "number" && loadedFertigationTime > 0
            ? getFertigationEndTime(manualFertigationLog.timestamp, loadedFertigationTime)
            : null;
        const manualFertigationRunningFromApi =
          typeof manualFertigationEndTime === "number" ? manualFertigationEndTime >= Date.now() : false;

        setMode(loadedMode);
        setSavedMode(loadedMode);
        setSchedules(loadedSchedules);
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
        setInitialSnapshot(
          getPlannerSnapshot(
            loadedMode,
            loadedFertigationTime,
            loadedNoOfNutritionTank,
            loadedEcCalibrationPoint,
            loadedPhCalibrationPoint,
            loadedSchedules,
          ),
        );
      } catch (error) {
        console.error("Sinchai planner load failed:", error);
        if (!mounted) return;
        const fallback = [buildDefaultSinchaiSchedule(1)];
        setMode("Auto");
        setSavedMode("Auto");
        setSchedules(fallback);
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
        setManualFertigationEcLower(null);
        setManualFertigationEcUpper(null);
        setManualFertigationPhLower(null);
        setManualFertigationPhUpper(null);
        setManualFertigationNutritionTanks({});
        setManualFertigationRunning(false);
        setManualFertigationEndsAt(null);
        setManualFertigationCountdownSec(0);
        setInitialSnapshot(
          getPlannerSnapshot(
            "Auto",
            null,
            2,
            { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ec_increased_by: null },
            {
              ph_up_basic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_increased_by: null },
              ph_down_acidic_solution: { concentration_solution_liquid_quantity_ml: null, ro_water_liter: null, ph_decreased_by: null },
            },
            fallback,
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
    setSchedules((prev) => normalizeScheduleNumbers([...prev, buildDefaultSinchaiSchedule(prev.length + 1)]));
  };

  const deleteSchedule = (scheduleNo: number) => {
    setSchedules((prev) => {
      const next = prev.filter((schedule) => schedule.schedule_no !== scheduleNo);
      return normalizeScheduleNumbers(next.length > 0 ? next : [buildDefaultSinchaiSchedule(1)]);
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
        mode,
        noOfValves,
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
        schedules: normalized,
      });
      setSchedules(normalized);
      setSavedMode(mode);
      setInitialSnapshot(getPlannerSnapshot(mode, fertigationTimeMin, noOfNutritionTank, ecCalibrationPoint, phCalibrationPoint, normalized));
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
      const numericValue = parseNullableNumber(manualFertigationNutritionTanks[label] ?? "");
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

  const handleModeChange = (nextMode: PlannerMode) => {
    if (nextMode === mode) return;
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
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-900">
          {mode === "Manual" ? t("sinchaiPlanner.manualCardTitle") : t("sinchaiPlanner.schedulesTitle")}
        </h2>
        <div className="flex items-center gap-2">
          {mode === "Auto" ? (
            <Button type="button" variant="outline" onClick={addSchedule}>
              <Plus className="mr-2 h-4 w-4" />
              {t("sinchaiPlanner.addSchedule")}
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={isSaving || !isDirty}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? t("sinchaiPlanner.saving") : t("sinchaiPlanner.saveAll")}
          </Button>
        </div>
      </div>

      <Card className="border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/80 text-slate-100 shadow-[0_18px_42px_-24px_rgba(4,12,28,0.8)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-200">
            <FlaskConical className="h-5 w-5" />
            {t("sinchaiPlanner.fertigationTitle")}
          </CardTitle>
          <CardDescription className="text-slate-300">{t("sinchaiPlanner.fertigationDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 [&_input]:bg-white/95 [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-200">{t("sinchaiPlanner.fertigationTimeMin")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={fertigationTimeMin ?? ""}
                  placeholder={t("sinchaiPlanner.fertigationPlaceholder")}
                  onChange={(event) => setFertigationTimeMin(parseNullableNumber(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">{t("sinchaiPlanner.noOfNutritionTank")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={noOfNutritionTank ?? ""}
                  placeholder={t("sinchaiPlanner.noOfNutritionTankPlaceholder")}
                  onChange={(event) => setNoOfNutritionTank(parseNullableNumber(event.target.value))}
                />
              </div>
            </div>

            <div className="rounded-xl border border-violet-300/40 bg-violet-950/30 p-4">
              <p className="mb-3 text-sm font-bold text-violet-900">{t("sinchaiPlanner.ecCalibrationTitle")}</p>
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

            <div className="rounded-xl border border-sky-300/40 bg-sky-950/25 p-4">
              <p className="mb-3 text-sm font-bold text-sky-900">{t("sinchaiPlanner.phCalibrationTitle")}</p>
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
          {schedules.map((schedule, index) => (
            <motion.div
              key={schedule.schedule_no}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <Card className="border-cyan-200/60 shadow-[0_14px_34px_-26px_rgba(20,95,170,0.65)]">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {t("sinchaiPlanner.schedule")} {schedule.schedule_no}
                    </CardTitle>
                    <Button type="button" variant="destructive" size="sm" onClick={() => deleteSchedule(schedule.schedule_no)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("sinchaiPlanner.delete")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>{t("sinchaiPlanner.scheduleName")}</Label>
                      <Input
                        value={schedule.schedule_name}
                        onChange={(event) =>
                          updateSchedule(schedule.schedule_no, (prev) => ({
                            ...prev,
                            schedule_name: event.target.value,
                          }))
                        }
                        placeholder={`${t("sinchaiPlanner.schedule")} ${schedule.schedule_no}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("sinchaiPlanner.startTime")}</Label>
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(event) =>
                          updateSchedule(schedule.schedule_no, (prev) => ({
                            ...prev,
                            start_time: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("sinchaiPlanner.duration")}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={schedule.irrigation_duration_min ?? ""}
                        onChange={(event) =>
                          updateSchedule(schedule.schedule_no, (prev) => ({
                            ...prev,
                            irrigation_duration_min: event.target.value ? Number(event.target.value) : null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("sinchaiPlanner.fertigationStatus")}</Label>
                      <div className="flex h-10 items-center justify-between rounded-md border border-input px-3">
                        <span className="text-sm text-slate-700">
                          {schedule.enabled ? t("sinchaiPlanner.enabled") : t("sinchaiPlanner.disabled")}
                        </span>
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) =>
                            updateSchedule(schedule.schedule_no, (prev) => ({
                              ...prev,
                              enabled: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                      <p className="text-sm font-semibold text-violet-800">{t("sinchaiPlanner.ecLimits")}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-violet-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={schedule.ec_lower_limit ?? ""}
                            onChange={(event) =>
                              updateSchedule(schedule.schedule_no, (prev) => ({
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
                            value={schedule.ec_upper_limit ?? ""}
                            onChange={(event) =>
                              updateSchedule(schedule.schedule_no, (prev) => ({
                                ...prev,
                                ec_upper_limit: parseNullableNumber(event.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
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
                              <div key={`${schedule.schedule_no}-nutrition-tank-${tankLabel}`} className="space-y-1">
                                <Label className="text-xs text-violet-700">
                                  {t("sinchaiPlanner.nutritionTank")} {tankLabel}
                                </Label>
                                <Input
                                  value={schedule.nutrition_tanks?.[tankLabel] ?? ""}
                                  placeholder={`${t("sinchaiPlanner.nutritionTank")} ${tankLabel}`}
                                  className="bg-white/80 text-violet-800 placeholder:text-violet-400"
                                  onChange={(event) =>
                                    updateSchedule(schedule.schedule_no, (prev) => ({
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
                    <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3">
                      <p className="text-sm font-semibold text-fuchsia-800">{t("sinchaiPlanner.phLimits")}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-fuchsia-700">{t("sinchaiPlanner.lowerLimit")}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={schedule.ph_lower_limit ?? ""}
                            onChange={(event) =>
                              updateSchedule(schedule.schedule_no, (prev) => ({
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
                            value={schedule.ph_upper_limit ?? ""}
                            onChange={(event) =>
                              updateSchedule(schedule.schedule_no, (prev) => ({
                                ...prev,
                                ph_upper_limit: parseNullableNumber(event.target.value),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800">{t("sinchaiPlanner.selectValves")}</p>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      {valveOptions.map((valve) => {
                        const checked = schedule.valves.includes(valve);
                        return (
                          <label
                            key={`${schedule.schedule_no}-${valve}`}
                            className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(state) =>
                                updateSchedule(schedule.schedule_no, (prev) => ({
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
                        const checked = schedule.days.includes(day);
                        return (
                          <label
                            key={`${schedule.schedule_no}-${day}`}
                            className="flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50/60 px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(state) =>
                                updateSchedule(schedule.schedule_no, (prev) => ({
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
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

    </div>
  );
}
