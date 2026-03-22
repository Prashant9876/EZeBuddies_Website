import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, CalendarDays, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { fetchPlannerRows } from "@/lib/plannerApi";
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
};

type PlannerEditableFields = Pick<PlannerCardState, "crop_name" | "sowing_date" | "harvest_date">;

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
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
  const userId = typeof loginResponse?.user_id === "string" ? loginResponse.user_id : null;
  const [isLoading, setIsLoading] = useState(false);
  const [initialByDevice, setInitialByDevice] = useState<Record<string, PlannerEditableFields>>({});

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

        const rowByDevice = new Map(rows.map((row) => [row.device_id, row]));
        setCards((prev) => {
          const next = prev.map((card) => {
            const row = rowByDevice.get(card.device_id);
            if (!row) return card;
            return {
              ...card,
              crop_name: row.crop_name ?? card.crop_name,
              sowing_date: normalizeDateForInput(row.sowing_date) || card.sowing_date,
              harvest_date: normalizeDateForInput(row.harvest_date) || card.harvest_date,
              optimal_temperature: row.optimal_temperature ?? card.optimal_temperature,
              optimal_humidity: row.optimal_humidity ?? card.optimal_humidity,
              optimal_co2: row.optimal_co2 ?? card.optimal_co2,
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

  const handleCardSubmit = (card: PlannerCardState) => {
    if (!isCardDirty(card)) return;
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
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-white via-emerald-50/70 to-cyan-50/60 p-4 shadow-[0_18px_40px_-28px_rgba(15,130,96,0.55)] md:-mx-16 md:w-[calc(100%+8rem)]"
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                      <p className="text-xs font-semibold text-sky-700">{t("planner.optimalTemperature")}</p>
                      <p className="mt-1 text-lg font-bold text-sky-900">{card.optimal_temperature ?? getOptimalByAge(card).temperature}</p>
                    </div>
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                      <p className="text-xs font-semibold text-cyan-700">{t("planner.optimalHumidity")}</p>
                      <p className="mt-1 text-lg font-bold text-cyan-900">{card.optimal_humidity ?? getOptimalByAge(card).humidity}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold text-emerald-700">{t("planner.optimalCo2")}</p>
                      <p className="mt-1 text-lg font-bold text-emerald-900">{card.optimal_co2 ?? getOptimalByAge(card).co2}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className={`w-full ${isCardDirty(card) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    variant={isCardDirty(card) ? "default" : "outline"}
                    onClick={() => handleCardSubmit(card)}
                    disabled={!isCardDirty(card)}
                  >
                    {t("planner.submit")}
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
