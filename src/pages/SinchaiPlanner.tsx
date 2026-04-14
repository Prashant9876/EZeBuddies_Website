import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { applySeo } from "@/lib/seo";
import { fetchSinchaiPlanner, saveSinchaiPlanner, type SinchaiSchedule } from "@/lib/plannerApi";
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

function normalizeScheduleNumbers(schedules: SinchaiSchedule[]) {
  return schedules.map((schedule, index) => ({
    ...schedule,
    schedule_no: index + 1,
    schedule_name: schedule.schedule_name?.trim() ? schedule.schedule_name : `Schedule ${index + 1}`,
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

function findOverlappingSchedules(schedules: SinchaiSchedule[]) {
  const normalized = normalizeScheduleNumbers(schedules);
  for (let i = 0; i < normalized.length; i += 1) {
    const first = normalized[i];
    const firstStart = parseTimeToMinutes(first.start_time);
    const firstDuration = typeof first.irrigation_duration_min === "number" ? first.irrigation_duration_min : null;
    if (firstStart === null || !firstDuration || firstDuration <= 0 || first.days.length === 0) continue;
    const firstEnd = firstStart + firstDuration;

    for (let j = i + 1; j < normalized.length; j += 1) {
      const second = normalized[j];
      const secondStart = parseTimeToMinutes(second.start_time);
      const secondDuration = typeof second.irrigation_duration_min === "number" ? second.irrigation_duration_min : null;
      if (secondStart === null || !secondDuration || secondDuration <= 0 || second.days.length === 0) continue;
      const secondEnd = secondStart + secondDuration;

      const commonDays = first.days.filter((day) => second.days.includes(day));
      if (commonDays.length === 0) continue;

      const overlaps = firstStart < secondEnd && secondStart < firstEnd;
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

function getSnapshot(mode: PlannerMode, schedules: SinchaiSchedule[]) {
  return JSON.stringify({
    mode,
    schedules: normalizeScheduleNumbers(schedules),
  });
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

  const [mode, setMode] = useState<PlannerMode>("Auto");
  const [schedules, setSchedules] = useState<SinchaiSchedule[]>([buildDefaultSinchaiSchedule(1)]);
  const [noOfValves, setNoOfValves] = useState<number>(sinchaiValveOptions.length);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState(getSnapshot("Auto", [buildDefaultSinchaiSchedule(1)]));

  const isDirty = useMemo(() => getSnapshot(mode, schedules) !== initialSnapshot, [mode, schedules, initialSnapshot]);
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

        setMode(loadedMode);
        setSchedules(loadedSchedules);
        setNoOfValves(loadedNoOfValves);
        setInitialSnapshot(getSnapshot(loadedMode, loadedSchedules));
      } catch (error) {
        console.error("Sinchai planner load failed:", error);
        if (!mounted) return;
        const fallback = [buildDefaultSinchaiSchedule(1)];
        setMode("Auto");
        setSchedules(fallback);
        setNoOfValves(sinchaiValveOptions.length);
        setInitialSnapshot(getSnapshot("Auto", fallback));
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
    const overlap = findOverlappingSchedules(normalized);
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
        schedules: normalized,
      });
      setSchedules(normalized);
      setInitialSnapshot(getSnapshot(mode, normalized));
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

      {isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">{t("planner.loading")}</CardContent>
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
