import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Save, Trash2, FlaskConical, Play, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { applySeo } from "@/lib/seo";
import { fetchSinchaiPlanner, saveSinchaiPlanner, type SinchaiSchedule } from "@/lib/plannerApi";
import { resetManualLog, startManualIrrigation, triggerEStop } from "@/lib/dashboardControlApi";
import { buildDefaultSinchaiSchedule, sinchaiDayOptions, sinchaiValveOptions } from "@/data/sinchaiPlannerDefaults";
import { useLanguage } from "@/lib/language";

type PlannerMode = "Auto" | "Manual";

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

function getPlannerSnapshot(mode: PlannerMode, fertigationTimeMin: number | null, schedules: SinchaiSchedule[]) {
  return JSON.stringify({
    mode,
    fertigation_time_min: fertigationTimeMin,
    schedules: normalizeScheduleNumbers(schedules),
  });
}

function parseNullableNumber(value: string) {
  const text = value.trim();
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function isManualLogRunning(timestamp: string, durationMin: number) {
  const start = new Date(timestamp);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + Math.max(0, durationMin) * 60 * 1000);
  return end.getTime() >= Date.now();
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualDurationMin, setManualDurationMin] = useState<number | null>(null);
  const [manualSelectedValves, setManualSelectedValves] = useState<string[]>([]);
  const [manualRunning, setManualRunning] = useState(false);
  const [isManualStartSubmitting, setIsManualStartSubmitting] = useState(false);
  const [isManualStopSubmitting, setIsManualStopSubmitting] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(getPlannerSnapshot("Auto", null, [buildDefaultSinchaiSchedule(1)]));
  const controlApiBase = useMemo(
    () => resolveApiBase(import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL, import.meta.env.VITE_PLANNER_API_URL),
    [],
  );

  const isDirty = useMemo(
    () => getPlannerSnapshot(mode, fertigationTimeMin, schedules) !== initialSnapshot,
    [mode, fertigationTimeMin, schedules, initialSnapshot],
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
        const manualLog = data?.manual_log;
        const manualRunningFromApi =
          manualLog?.timestamp && typeof manualLog.duration_min === "number"
            ? isManualLogRunning(manualLog.timestamp, manualLog.duration_min)
            : false;

        setMode(loadedMode);
        setSchedules(loadedSchedules);
        setNoOfValves(loadedNoOfValves);
        setFertigationTimeMin(loadedFertigationTime);
        if (loadedMode === "Manual" && manualLog) {
          setManualDurationMin(typeof manualLog.duration_min === "number" ? manualLog.duration_min : null);
          setManualSelectedValves(Array.isArray(manualLog.valves) ? manualLog.valves : []);
        }
        setManualRunning(manualRunningFromApi);
        setInitialSnapshot(getPlannerSnapshot(loadedMode, loadedFertigationTime, loadedSchedules));
      } catch (error) {
        console.error("Sinchai planner load failed:", error);
        if (!mounted) return;
        const fallback = [buildDefaultSinchaiSchedule(1)];
        setMode("Auto");
        setSchedules(fallback);
        setNoOfValves(sinchaiValveOptions.length);
        setFertigationTimeMin(null);
        setManualDurationMin(null);
        setManualSelectedValves([]);
        setManualRunning(false);
        setInitialSnapshot(getPlannerSnapshot("Auto", null, fallback));
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
        schedules: normalized,
      });
      setSchedules(normalized);
      setInitialSnapshot(getPlannerSnapshot(mode, fertigationTimeMin, normalized));
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
              onChange={(event) => setMode(normalizeMode(event.target.value))}
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

      {mode === "Auto" ? (
        <Card className="border-emerald-200/70 shadow-[0_14px_34px_-26px_rgba(15,120,90,0.55)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <FlaskConical className="h-5 w-5" />
              {t("sinchaiPlanner.fertigationTitle")}
            </CardTitle>
            <CardDescription>{t("sinchaiPlanner.fertigationDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label>{t("sinchaiPlanner.fertigationTimeMin")}</Label>
              <Input
                type="number"
                min={0}
                value={fertigationTimeMin ?? ""}
                placeholder={t("sinchaiPlanner.fertigationPlaceholder")}
                onChange={(event) => setFertigationTimeMin(parseNullableNumber(event.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(validationError)} onOpenChange={(open) => !open && setValidationError(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sinchaiPlanner.validationTitle")}</DialogTitle>
            <DialogDescription>{validationError ?? ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">{t("planner.loading")}</CardContent>
        </Card>
      ) : mode === "Manual" ? (
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
              <Button type="button" onClick={handleManualStart} disabled={manualRunning || isManualStartSubmitting}>
                <Play className="mr-2 h-4 w-4" />
                {t("sinchaiPlanner.startButton")}
              </Button>
              <Button type="button" variant="destructive" onClick={handleManualStop} disabled={!manualRunning || isManualStopSubmitting}>
                <Square className="mr-2 h-4 w-4" />
                {t("sinchaiPlanner.stopButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
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
                      <Label>{t("sinchaiPlanner.status")}</Label>
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
