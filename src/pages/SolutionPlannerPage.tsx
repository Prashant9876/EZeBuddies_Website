import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, CalendarDays, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { fetchPlannerRows, fetchSopConditions, updatePlannerDevice, type SopConditions } from "@/lib/plannerApi";
import { applySeo } from "@/lib/seo";
import { cropsCatalog } from "@/data/cropsCatalog";
import { useLanguage } from "@/lib/language";
import { motion } from "framer-motion";
import logo from "@/assets/devices/logo.png";

type Device = {
  device_id: string;
  device_name: string;
  device_type: string;
  deployed_at?: string;
};

type PlannerCardState = {
  device_id: string;
  device_name: string;
  deployed_at?: string;
  crop_name: string;
  sowing_date: string;
  harvest_date: string;
  optimal_temperature?: string;
  optimal_humidity?: string;
  optimal_co2?: string;
  optimal_nutrition_ec?: string;
  optimal_nutrition_ph?: string;
  optimal_nutrition_water_temperature?: string;
  optimal_light_ppfd?: string;
  optimal_light_uva?: string;
  optimal_light_uvb?: string;
  growth_stages?: Array<{
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
  }>;
};

type PlannerEditableFields = Pick<PlannerCardState, "crop_name" | "sowing_date" | "harvest_date">;

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDevices(list: unknown): Device[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const deviceId = asString(row.device_id) ?? asString(row.Device_Id);
      const deviceName = asString(row.device_name) ?? asString(row.Device_Name);
      const deviceType = asString(row.device_type) ?? asString(row.Device_Type);
      if (!deviceId || !deviceName || !deviceType) return null;
      return {
        device_id: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        deployed_at: asString(row.deployed_at) ?? asString(row.Deployed_At) ?? asString(row.deployedAt),
      } satisfies Device;
    })
    .filter((item): item is Device => Boolean(item));
}

function normalizeDateForInput(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) return trimmed;
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!slashMatch) return trimmed;
  const dd = slashMatch[1].padStart(2, "0");
  const mm = slashMatch[2].padStart(2, "0");
  const yyyy = slashMatch[3];
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateForApi(value: string) {
  const trimmed = value.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!isoMatch) return trimmed;
  return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
}

function getDaysSinceSowing(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getCurrentStageIndex(card: PlannerCardState) {
  if (!card.growth_stages || card.growth_stages.length === 0) return -1;
  const daysAfterSowing = getDaysSinceSowing(card.sowing_date);
  if (daysAfterSowing === null) return -1;

  for (let index = 0; index < card.growth_stages.length; index += 1) {
    const stage = card.growth_stages[index];
    const min = typeof stage.min_days === "number" ? stage.min_days : null;
    const max = stage.max_days === null || typeof stage.max_days === "number" ? stage.max_days : null;
    if (min === null) continue;
    if (max === null && daysAfterSowing >= min) return index;
    if (max !== null && daysAfterSowing >= min && daysAfterSowing <= max) return index;
  }

  const indexedStages = card.growth_stages
    .map((stage, index) => ({ index, min: stage.min_days }))
    .filter((row): row is { index: number; min: number } => typeof row.min === "number")
    .sort((a, b) => a.min - b.min);

  if (indexedStages.length === 0) return -1;

  if (daysAfterSowing < indexedStages[0].min) {
    return indexedStages[0].index;
  }

  // If SOP has day-range gaps, stay on the latest stage that has started
  // instead of jumping to the last stage (e.g. Harvest).
  let fallbackIndex = indexedStages[0].index;
  for (const row of indexedStages) {
    if (row.min <= daysAfterSowing) {
      fallbackIndex = row.index;
    } else {
      break;
    }
  }
  return fallbackIndex;
}

function findSolutionDevices(loginResponse: Record<string, unknown> | null, targetSolution: string) {
  const solutions = loginResponse?.solutions;
  if (!Array.isArray(solutions)) return [];
  const target = normalizeName(targetSolution);
  const matched = solutions.find((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const name = asString((item as Record<string, unknown>).solution_name) ?? asString((item as Record<string, unknown>).solutionName);
    return name ? normalizeName(name) === target : false;
  });
  if (!matched || typeof matched !== "object" || Array.isArray(matched)) return [];
  return parseDevices((matched as Record<string, unknown>).devices);
}

type SolutionPlannerPageProps = {
  title: string;
  solutionName: string;
  plannerSection: string;
};

export function SolutionPlannerPage({ title, solutionName, plannerSection }: SolutionPlannerPageProps) {
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
  const [isLoading, setIsLoading] = useState(false);
  const [submittingByDevice, setSubmittingByDevice] = useState<Record<string, boolean>>({});
  const [initialByDevice, setInitialByDevice] = useState<Record<string, PlannerEditableFields>>({});
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sensorDevices = useMemo(
    () => findSolutionDevices(loginResponse, solutionName).filter((device) => device.device_type.toLowerCase() === "sensors"),
    [loginResponse, solutionName],
  );

  const [cards, setCards] = useState<PlannerCardState[]>([]);

  useEffect(() => {
    if (!token || !loginResponse) {
      navigate("/");
      return;
    }
  }, [token, loginResponse, navigate]);

  useEffect(() => {
    applySeo({
      title: `${title} | EzeBuddies`,
      description: `${title} private planner`,
      path: window.location.pathname,
      robots: "noindex, nofollow",
    });
  }, [title]);

  useEffect(() => {
    const baseCards = sensorDevices.map((device) => ({
      device_id: device.device_id,
      device_name: device.device_name,
      deployed_at: device.deployed_at,
      crop_name: "",
      sowing_date: "",
      harvest_date: "",
    }));
    setCards(baseCards);
    setInitialByDevice(
      Object.fromEntries(
        baseCards.map((card) => [
          card.device_id,
          { crop_name: card.crop_name, sowing_date: card.sowing_date, harvest_date: card.harvest_date },
        ]),
      ),
    );
  }, [sensorDevices]);

  useEffect(() => {
    if (!token || !userId || sensorDevices.length === 0) return;

    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchPlannerRows({
          token,
          userId,
          section: plannerSection,
        });
        if (!mounted || rows.length === 0) return;

        const uniqueCropNames = Array.from(
          new Set(rows.map((row) => row.crop_name?.trim()).filter((value): value is string => Boolean(value))),
        );
        let sopByCrop: Record<string, SopConditions> = {};
        if (uniqueCropNames.length > 0) {
          try {
            sopByCrop = await fetchSopConditions({
              token,
              userId,
              cropNames: uniqueCropNames,
            });
          } catch (error) {
            console.error("SOP API failed:", error);
          }
        }

        const rowByDevice = new Map(rows.map((row) => [row.device_id, row]));
        setCards((prev) => {
          const next = prev.map((card) => {
            const row = rowByDevice.get(card.device_id);
            if (!row) return card;
            const cropName = row.crop_name ?? card.crop_name;
            const sop = cropName ? sopByCrop[cropName.trim().toLowerCase()] : undefined;
            return {
              ...card,
              crop_name: cropName,
              sowing_date: normalizeDateForInput(row.sowing_date) || card.sowing_date,
              harvest_date: normalizeDateForInput(row.harvest_date) || card.harvest_date,
              optimal_temperature: sop?.optimal_temperature ?? row.optimal_temperature ?? card.optimal_temperature,
              optimal_humidity: sop?.optimal_humidity ?? row.optimal_humidity ?? card.optimal_humidity,
              optimal_co2: sop?.optimal_co2 ?? row.optimal_co2 ?? card.optimal_co2,
              optimal_nutrition_ec: sop?.optimal_nutrition_ec ?? card.optimal_nutrition_ec,
              optimal_nutrition_ph: sop?.optimal_nutrition_ph ?? card.optimal_nutrition_ph,
              optimal_nutrition_water_temperature:
                sop?.optimal_nutrition_water_temperature ?? card.optimal_nutrition_water_temperature,
              optimal_light_ppfd: sop?.optimal_light_ppfd ?? card.optimal_light_ppfd,
              optimal_light_uva: sop?.optimal_light_uva ?? card.optimal_light_uva,
              optimal_light_uvb: sop?.optimal_light_uvb ?? card.optimal_light_uvb,
              growth_stages: sop?.growth_stages ?? card.growth_stages,
            };
          });
          setInitialByDevice(
            Object.fromEntries(
              next.map((card) => [
                card.device_id,
                { crop_name: card.crop_name, sowing_date: card.sowing_date, harvest_date: card.harvest_date },
              ]),
            ),
          );
          return next;
        });
      } catch (error) {
        console.error("Planner API failed:", error);
        toast({
          title: t("planner.apiUnavailableTitle"),
          description: t("planner.apiUnavailableDescription"),
          variant: "destructive",
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [token, userId, sensorDevices.length, plannerSection, toast, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      cards.forEach((card) => {
        const currentStageIndex = getCurrentStageIndex(card);
        if (currentStageIndex < 0) return;
        const key = `${card.device_id}-${currentStageIndex}`;
        const element = stageRefs.current[key];
        if (!element) return;
        element.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cards]);

  const updateCard = (deviceId: string, key: "crop_name" | "sowing_date" | "harvest_date", value: string) => {
    setCards((prev) => prev.map((card) => (card.device_id === deviceId ? { ...card, [key]: value } : card)));
  };

  const getCropAgeDays = (card: PlannerCardState) => {
    if (!card.sowing_date) return null;
    const sow = new Date(card.sowing_date);
    if (Number.isNaN(sow.getTime())) return null;
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - sow.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getProgressRatio = (card: PlannerCardState) => {
    if (!card.sowing_date || !card.harvest_date) return null;
    const sow = new Date(card.sowing_date);
    const harvest = new Date(card.harvest_date);
    if (Number.isNaN(sow.getTime()) || Number.isNaN(harvest.getTime()) || harvest <= sow) return null;
    const now = new Date();
    const ratio = (now.getTime() - sow.getTime()) / (harvest.getTime() - sow.getTime());
    return Math.max(0, Math.min(1, ratio));
  };

  const getOptimalByAge = (card: PlannerCardState) => {
    const ratio = getProgressRatio(card);
    const ageDays = getCropAgeDays(card);
    let stage: "early" | "mid" | "late" = "mid";

    if (ratio !== null) {
      if (ratio < 0.33) stage = "early";
      else if (ratio < 0.75) stage = "mid";
      else stage = "late";
    } else if (ageDays !== null) {
      if (ageDays <= 20) stage = "early";
      else if (ageDays <= 60) stage = "mid";
      else stage = "late";
    }

    if (stage === "early") {
      return { temperature: "24-28°C", humidity: "70-85%", co2: "700-900 ppm" };
    }
    if (stage === "late") {
      return { temperature: "18-24°C", humidity: "50-65%", co2: "700-900 ppm" };
    }
    return { temperature: "20-26°C", humidity: "60-75%", co2: "800-1100 ppm" };
  };

  const isCardDirty = (card: PlannerCardState) => {
    const initial = initialByDevice[card.device_id];
    if (!initial) return false;
    return (
      initial.crop_name !== card.crop_name ||
      initial.sowing_date !== card.sowing_date ||
      initial.harvest_date !== card.harvest_date
    );
  };

  const handleCardSubmit = async (card: PlannerCardState) => {
    if (!isCardDirty(card)) return;
    if (!token || !userId) {
      toast({
        title: t("planner.updateFailedTitle"),
        description: t("planner.updateFailedDescription"),
        variant: "destructive",
      });
      return;
    }

    const initial = initialByDevice[card.device_id];
    if (!initial) return;

    const payload: Partial<Pick<PlannerCardState, "crop_name" | "sowing_date" | "harvest_date">> = {};
    if (initial.crop_name !== card.crop_name) payload.crop_name = card.crop_name;
    if (initial.sowing_date !== card.sowing_date) payload.sowing_date = formatDateForApi(card.sowing_date);
    if (initial.harvest_date !== card.harvest_date) payload.harvest_date = formatDateForApi(card.harvest_date);
    if (Object.keys(payload).length === 0) return;

    try {
      setSubmittingByDevice((prev) => ({ ...prev, [card.device_id]: true }));
      await updatePlannerDevice({
        token,
        userId,
        deviceId: card.device_id,
        payload,
      });
      toast({
        title: t("planner.updatedTitle"),
        description: t("planner.updatedDescription", { device: card.device_name }),
      });
      setInitialByDevice((prev) => ({
        ...prev,
        [card.device_id]: {
          crop_name: card.crop_name,
          sowing_date: card.sowing_date,
          harvest_date: card.harvest_date,
        },
      }));
    } catch (error) {
      console.error("Planner update API failed:", error);
      toast({
        title: t("planner.updateFailedTitle"),
        description: t("planner.updateFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setSubmittingByDevice((prev) => {
        const next = { ...prev };
        delete next[card.device_id];
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-white via-emerald-50/70 to-cyan-50/60 p-4 shadow-[0_18px_40px_-28px_rgba(15,130,96,0.55)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="EzeBuddies logo" className="h-10 w-10 rounded-xl border border-emerald-100 bg-white p-1 shadow-sm" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/80">Planner Workspace</p>
                <p className="text-sm text-slate-600">Configure crop cycle and receive AI-based optimal conditions.</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              Precision Planning
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
          {isLoading && <p className="text-sm text-muted-foreground">{t("planner.loading")}</p>}
        </div>

        {cards.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("planner.noSensorsTitle")}</CardTitle>
              <CardDescription>{t("planner.noSensorsDescription")}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card, index) => (
              <motion.div
                key={card.device_id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
              >
              <Card className="hover-lift border-emerald-200/60 shadow-[0_14px_35px_-24px_rgba(20,120,90,0.55)]">
                <CardHeader>
                  <CardTitle className="text-xl">{card.device_name}</CardTitle>
                  <CardDescription>
                    {t("planner.deviceId")}: {card.device_id}
                    {card.deployed_at ? ` | ${t("planner.deployedAt")}: ${card.deployed_at}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${card.device_id}-crop`} className="flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      {t("planner.cropName")}
                    </Label>
                    <select
                      id={`${card.device_id}-crop`}
                      value={card.crop_name}
                      onChange={(e) => updateCard(card.device_id, "crop_name", e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t("planner.selectCrop")}</option>
                      {cropsCatalog.map((group) => (
                        <optgroup key={group.category} label={group.category}>
                          {group.items.map((crop) => (
                            <option key={`${group.category}-${crop}`} value={crop}>
                              {crop}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {card.crop_name && !cropsCatalog.some((group) => group.items.includes(card.crop_name)) && (
                        <option value={card.crop_name}>{card.crop_name}</option>
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${card.device_id}-sowing`} className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-sky-600" />
                        {t("planner.sowingDate")}
                      </Label>
                      <Input
                        id={`${card.device_id}-sowing`}
                        type="date"
                        value={card.sowing_date}
                        onChange={(e) => updateCard(card.device_id, "sowing_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${card.device_id}-harvest`} className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-amber-600" />
                        {t("planner.harvestDate")}
                      </Label>
                      <Input
                        id={`${card.device_id}-harvest`}
                        type="date"
                        value={card.harvest_date}
                        onChange={(e) => updateCard(card.device_id, "harvest_date", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("planner.growthStagesTitle")}</p>
                    {card.growth_stages && card.growth_stages.length > 0 ? (
                      <div className="overflow-x-auto pb-2">
                        <div className="relative flex min-w-max items-stretch gap-2 pr-1 sm:gap-3">
                          <div className="pointer-events-none absolute left-2 right-2 top-7 h-px bg-gradient-to-r from-emerald-200 via-sky-200 to-cyan-200" />
                          {(() => {
                            const currentStageIndex = getCurrentStageIndex(card);
                            return card.growth_stages.map((stage, stageIndex) => {
                              const active = stageIndex === currentStageIndex;
                              const completed = currentStageIndex >= 0 && stageIndex < currentStageIndex;
                              const hasNutrition = Boolean(stage.nutrition_ec || stage.nutrition_ph || stage.nutrition_water_temperature);
                              const hasLight = Boolean(stage.light_ppfd);
                              const stageStatus = active
                                ? t("planner.stageOngoing")
                                : completed
                                  ? t("planner.stageCompleted")
                                  : t("planner.stagePending");
                              return (
                                <motion.div
                                  key={`${card.device_id}-${stage.stage}-${stageIndex}`}
                                  ref={(el) => {
                                    stageRefs.current[`${card.device_id}-${stageIndex}`] = el;
                                  }}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.25, delay: stageIndex * 0.05 }}
                                whileHover={{ y: -3, scale: 1.01 }}
                                  className={`relative w-[16rem] max-w-[85vw] rounded-2xl border p-2.5 transition sm:w-72 sm:p-3 md:w-80 ${
                                    active
                                      ? "scale-[1.02] border-emerald-400 bg-gradient-to-b from-emerald-50 via-white to-emerald-50/50 shadow-[0_14px_32px_-16px_rgba(20,130,90,0.7)]"
                                      : completed
                                        ? "border-emerald-300/80 bg-emerald-50/40 shadow-[0_8px_20px_-16px_rgba(40,120,90,0.45)]"
                                        : "border-slate-200 bg-white shadow-[0_8px_20px_-16px_rgba(30,60,110,0.45)]"
                                  }`}
                                >
                                  <div
                                    className={`absolute left-3 top-2 z-10 h-4 w-4 rounded-full border-2 ${
                                      active
                                        ? "border-emerald-500 bg-emerald-500"
                                        : completed
                                          ? "border-emerald-400 bg-emerald-100"
                                          : "border-slate-300 bg-white"
                                    }`}
                                  />
                                  <div className="mt-3 flex items-start justify-between gap-2">
                                    <p className={`text-sm font-semibold ${active ? "text-emerald-800" : "text-slate-800"}`}>{stage.stage}</p>
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        active
                                          ? "bg-emerald-600 text-white"
                                          : completed
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {stageStatus}
                                    </span>
                                  </div>
                                  <div className="mt-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2 py-1.5">
                                    <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? "text-emerald-700" : "text-slate-600"}`}>
                                      {t("planner.stageDays")}
                                    </p>
                                    <p className={`text-sm font-bold ${active ? "text-emerald-800" : "text-slate-800"}`}>{stage.days}</p>
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {stage.climate_day_temperature ? (
                                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-sky-700">{t("planner.optimalDayTemperature")}</p>
                                        <p className="text-[11px] font-semibold text-sky-900">{stage.climate_day_temperature}</p>
                                      </div>
                                    ) : null}
                                    {stage.climate_night_temperature ? (
                                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-indigo-700">{t("planner.optimalNightTemperature")}</p>
                                        <p className="text-[11px] font-semibold text-indigo-900">{stage.climate_night_temperature}</p>
                                      </div>
                                    ) : null}
                                    {stage.climate_humidity ? (
                                      <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-cyan-700">{t("planner.optimalHumidity")}</p>
                                        <p className="text-[11px] font-semibold text-cyan-900">{stage.climate_humidity}</p>
                                      </div>
                                    ) : null}
                                    {stage.climate_co2 ? (
                                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-emerald-700">{t("planner.optimalCo2")}</p>
                                        <p className="text-[11px] font-semibold text-emerald-900">{stage.climate_co2}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {stage.ideal_height_cm ? (
                                      <div className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5">
                                        <p className="text-[10px] font-semibold text-teal-700">{t("planner.stageHeight")}</p>
                                        <p className="text-sm font-bold text-teal-900">{stage.ideal_height_cm}</p>
                                      </div>
                                    ) : (
                                      <div />
                                    )}
                                    {stage.notes ? (
                                      <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{t("planner.observation")}</p>
                                        <p className="text-sm font-semibold text-slate-700">{stage.notes}</p>
                                      </div>
                                    ) : (
                                      <div />
                                    )}
                                  </div>
                                  {hasNutrition ? (
                                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                                      <div className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-violet-700">{t("planner.optimalNutritionEc")}</p>
                                        <p className="text-[11px] font-semibold text-violet-900">{stage.nutrition_ec ?? "—"}</p>
                                      </div>
                                      <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-fuchsia-700">{t("planner.optimalNutritionPh")}</p>
                                        <p className="text-[11px] font-semibold text-fuchsia-900">{stage.nutrition_ph ?? "—"}</p>
                                      </div>
                                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-indigo-700">{t("planner.optimalNutritionWaterTemp")}</p>
                                        <p className="text-[11px] font-semibold text-indigo-900">{stage.nutrition_water_temperature ?? "—"}</p>
                                      </div>
                                    </div>
                                  ) : null}
                                  {hasLight ? (
                                    <div className="mt-2 grid grid-cols-1 gap-1.5">
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                                        <p className="text-[10px] font-semibold text-amber-700">{t("planner.optimalLightPpfd")}</p>
                                        <p className="text-[11px] font-semibold text-amber-900">{stage.light_ppfd ?? "—"}</p>
                                      </div>
                                    </div>
                                  ) : null}
                                  {active ? (
                                    <span className="mt-2 inline-flex animate-pulse rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                      {t("planner.currentStage")}
                                    </span>
                                  ) : null}
                                </motion.div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("planner.noGrowthStages")}</p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className={`w-full ${isCardDirty(card) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    variant={isCardDirty(card) ? "default" : "outline"}
                    onClick={() => handleCardSubmit(card)}
                    disabled={!isCardDirty(card) || Boolean(submittingByDevice[card.device_id])}
                  >
                    {submittingByDevice[card.device_id] ? t("planner.submitting") : t("planner.submit")}
                  </Button>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        )}
    </div>
  );
}
