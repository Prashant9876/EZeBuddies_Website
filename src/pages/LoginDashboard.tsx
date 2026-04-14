import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Thermometer, Droplets, Leaf, Cpu, ToggleLeft, RefreshCw, Wind, Sunrise, Sunset, CloudSun, Clock3, CalendarDays, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language";
import { applySeo } from "@/lib/seo";
import { changeRelayState, fetchHistoricalData, triggerEStop } from "@/lib/dashboardControlApi";
import { fetchSinchaiPlanner, type SinchaiSchedule } from "@/lib/plannerApi";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Device = {
  device_id: string;
  device_name: string;
  device_type: string;
  is_active: boolean;
  deployed_at?: string;
};

type SolutionGroup = {
  solution_name: string;
  devices: Device[];
};

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
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

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "active") return true;
    if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "inactive") return false;
  }
  if (typeof value === "number") return value > 0;
  return null;
}

function parseDeviceList(list: unknown): Device[] {
  if (!Array.isArray(list)) return [];

  return list
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const obj = value as Record<string, unknown>;

      const deviceId = asNonEmptyString(obj.device_id) ?? asNonEmptyString(obj.Device_Id);
      const deviceName = asNonEmptyString(obj.device_name) ?? asNonEmptyString(obj.Device_Name);
      const deviceType = asNonEmptyString(obj.device_type) ?? asNonEmptyString(obj.Device_Type);
      const isActive = asBoolean(obj.is_active) ?? asBoolean(obj.Is_Active);
      const deployedAt =
        asNonEmptyString(obj.deployed_at) ??
        asNonEmptyString(obj.deployedAt) ??
        asNonEmptyString(obj.Deployed_At) ??
        asNonEmptyString(obj.DeployedAt);

      if (!deviceId || !deviceName || !deviceType || isActive === null) return null;

      return {
        device_id: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        is_active: isActive,
        deployed_at: deployedAt ?? undefined,
      } satisfies Device;
    })
    .filter((item): item is Device => Boolean(item));
}

function getDevices(response: Record<string, unknown> | null): Device[] {
  const rootList = response?.devices;
  const userList =
    response?.user && typeof response.user === "object" && !Array.isArray(response.user)
      ? (response.user as Record<string, unknown>).devices
      : undefined;
  const dataList =
    response?.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? (response.data as Record<string, unknown>).devices
      : undefined;

  const list = Array.isArray(rootList) ? rootList : Array.isArray(userList) ? userList : dataList;
  return parseDeviceList(list);
}

function getSolutions(response: Record<string, unknown> | null): SolutionGroup[] {
  const rootSolutions = response?.solutions;
  const userSolutions =
    response?.user && typeof response.user === "object" && !Array.isArray(response.user)
      ? (response.user as Record<string, unknown>).solutions
      : undefined;
  const dataSolutions =
    response?.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? (response.data as Record<string, unknown>).solutions
      : undefined;

  const source = Array.isArray(rootSolutions) ? rootSolutions : Array.isArray(userSolutions) ? userSolutions : dataSolutions;
  if (!Array.isArray(source)) return [];

  return source
    .map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const obj = value as Record<string, unknown>;
      const solutionName =
        asNonEmptyString(obj.solution_name) ??
        asNonEmptyString(obj.solutionName) ??
        asNonEmptyString(obj.Solution_Name) ??
        asNonEmptyString(obj.SolutionName);
      const devices = parseDeviceList(obj.devices);
      if (!solutionName || devices.length === 0) return null;
      return { solution_name: solutionName, devices } satisfies SolutionGroup;
    })
    .filter((item): item is SolutionGroup => Boolean(item));
}

function seedFromString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function randomFromSeed(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function metricFromSeed(seed: number, min: number, max: number, fractionDigits = 1) {
  const value = min + randomFromSeed(seed) * (max - min);
  return Number(value.toFixed(fractionDigits));
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSmartSinchaiSolution(solutionName: string) {
  return normalizeIdentifier(solutionName).includes("smartsinchai");
}

type RealtimeRecord = Record<string, unknown>;

type RealtimeApiResponse = {
  user_id?: string;
  records?: unknown[];
};

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

type HistoricalMetric = "temperature" | "humidity" | "co2";

type HistoricalPoint = {
  label: string;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
};

type WeatherSnapshot = {
  resolvedName: string;
  current: {
    temp: number | null;
    feelsLike: number | null;
    humidity: number | null;
    wind: number | null;
    precipitation: number | null;
    pressure: number | null;
    cloud: number | null;
  };
  daily: Array<{
    date: string;
    max: number | null;
    min: number | null;
    uvMax: number | null;
    humidityAvg: number | null;
    cloudAvg: number | null;
    precipitationSum: number | null;
    precipitationProbMax: number | null;
    sunrise: string | null;
    sunset: string | null;
  }>;
};

function getRecordDeviceId(record: RealtimeRecord) {
  const value = record.Device_Id ?? record.device_id;
  return typeof value === "string" ? value : null;
}

function isMetadataKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized === "_id" || normalized === "dn" || normalized === "device_id" || normalized === "mode";
}

function toSwitchState(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "on" || normalized === "true" || normalized === "1";
  }
  if (typeof value === "number") return value > 0;
  if (typeof value === "boolean") return value;
  return false;
}

function toMetric(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalMetric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatHistoryLabel(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function isMicroLocation(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return /^room\d*$/i.test(normalized) || /^zone\d*$/i.test(normalized) || /^section\d*$/i.test(normalized);
}

function parseLatLong(value: string | null) {
  if (!value) return null;
  const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function isCoordinateLabel(value: string | null) {
  if (!value) return false;
  return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(value.trim());
}

function formatTimeFromIso(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function getBrowserCoordinates() {
  return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });
}

function formatRelayName(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toModeState(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "auto" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "manual" || normalized === "off") return false;
  }
  return false;
}

function buildActuatorChannels(deviceId: string, realtime?: RealtimeRecord) {
  if (realtime) {
    const items = Object.entries(realtime)
      .filter(([key]) => !isMetadataKey(key))
      .map(([key, value]) => ({
        name: key,
        enabled: toSwitchState(value),
      }));
    if (items.length > 0) {
      return items;
    }
  }

  return Array.from({ length: 8 }, (_, i) => ({
    name: `relay_${i + 1}`,
    enabled: randomFromSeed(seedFromString(`${deviceId}-${i}`)) > 0.5,
  }));
}

function EnvironmentControlCard({
  device,
  realtime,
  t,
  estopActive,
  onRelayToggle,
}: {
  device: Device;
  realtime?: RealtimeRecord;
  t: TranslateFn;
  estopActive?: boolean;
  onRelayToggle?: (args: { deviceId: string; buttonName: string; state: "on" | "off" }) => Promise<void>;
}) {
  const { toast } = useToast();
  const initialChannels = useMemo(() => buildActuatorChannels(device.device_id, realtime), [device.device_id, realtime]);
  const initialMode = useMemo(() => toModeState(realtime?.Mode ?? realtime?.mode ?? realtime?.MODE), [realtime]);
  const [channels, setChannels] = useState(initialChannels);
  const [isAutoMode, setIsAutoMode] = useState(initialMode);
  const [pendingChannels, setPendingChannels] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  useEffect(() => {
    setIsAutoMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!estopActive) return;
    setChannels((prev) => prev.map((item) => ({ ...item, enabled: false })));
  }, [estopActive]);

  const handleChannelToggle = async (index: number, next: boolean) => {
    if (estopActive) {
      toast({
        title: t("dashboard.estopActiveTitle"),
        description: t("dashboard.estopActiveDescription"),
        variant: "destructive",
      });
      return;
    }

    if (isAutoMode) {
      toast({
        title: t("dashboard.manualModeRequiredTitle"),
        description: t("dashboard.manualModeRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (!onRelayToggle) {
      setChannels((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: next } : item)));
      return;
    }

    const channel = channels[index];
    if (!channel) return;
    setPendingChannels((prev) => ({ ...prev, [index]: true }));
    setChannels((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: next } : item)));
    try {
      await onRelayToggle({
        deviceId: device.device_id,
        buttonName: channel.name,
        state: next ? "on" : "off",
      });
    } catch (error) {
      console.error("Relay state update failed:", error);
      setChannels((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: !next } : item)));
      toast({
        title: t("dashboard.relayUpdateFailedTitle"),
        description: t("dashboard.relayUpdateFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setPendingChannels((prev) => {
        const nextState = { ...prev };
        delete nextState[index];
        return nextState;
      });
    }
  };

  return (
    <Card className="hover-lift overflow-hidden border-cyan-200/70 shadow-[0_14px_40px_-20px_rgba(0,140,170,0.6)]">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">{t("dashboard.actuator")}</p>
            <h3 className="font-display text-xl font-semibold">{device.device_name}</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Cpu className="h-6 w-6" />
            <div className="inline-flex items-center gap-2 text-[11px]">
              <span className="font-bold">{t("dashboard.mode")}</span>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2 py-1 font-semibold">
                <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
                <span>{isAutoMode ? t("dashboard.auto") : t("dashboard.manual")}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-white/85">{t("dashboard.deviceId")}: {device.device_id}</p>
      </div>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2">
          <span className="text-sm font-medium text-cyan-700">{t("dashboard.smartFarmController")}</span>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-cyan-700">
            {channels.filter((item) => item.enabled).length}/{channels.length} ON
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {channels.map((channel, index) => (
            <div key={`${device.device_id}-${channel.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-sm font-medium text-foreground">{formatRelayName(channel.name)}</span>
              <Switch
                checked={channel.enabled}
                onCheckedChange={(next) => handleChannelToggle(index, next)}
                disabled={Boolean(pendingChannels[index])}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EnvironmentIntelCard({
  device,
  realtime,
  t,
  onViewGraph,
}: {
  device: Device;
  realtime?: RealtimeRecord;
  t: TranslateFn;
  onViewGraph?: (device: Device) => void;
}) {
  const baseSeed = seedFromString(device.device_id);
  const temperature = toMetric(realtime?.Etemp, metricFromSeed(baseSeed + 1, 20, 36));
  const humidity = toMetric(realtime?.Humidity, metricFromSeed(baseSeed + 2, 35, 88));
  const co2 = toMetric(realtime?.CO2, metricFromSeed(baseSeed + 3, 420, 1200, 0));
  const deployedAt = device.deployed_at?.trim() || t("dashboard.notSpecified");

  return (
    <Card className="hover-lift overflow-hidden border-emerald-200/70 shadow-[0_14px_40px_-20px_rgba(16,150,87,0.6)]">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">{t("dashboard.sensor")}</p>
            <h3 className="font-display text-lg font-semibold text-white/95">{device.device_name}</h3>
            <p className="mt-1 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              {t("dashboard.deployedAt")}: {deployedAt}
            </p>
          </div>
          <Gauge className="h-6 w-6" />
        </div>
        <p className="mt-2 text-xs text-white/85">{t("dashboard.deviceId")}: {device.device_id}</p>
      </div>
      <CardContent className="grid grid-cols-1 gap-3 p-5">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
          <div className="mb-1 flex items-center gap-2 text-emerald-700">
            <Thermometer className="h-4 w-4" />
            <span className="text-sm font-medium">{t("dashboard.temperature")}</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-900">{temperature}°C</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3">
          <div className="mb-1 flex items-center gap-2 text-sky-700">
            <Droplets className="h-4 w-4" />
            <span className="text-sm font-medium">{t("dashboard.humidity")}</span>
          </div>
          <p className="text-2xl font-semibold text-sky-900">{humidity}%</p>
        </div>
        <div className="rounded-xl border border-lime-100 bg-lime-50/80 p-3">
          <div className="mb-1 flex items-center gap-2 text-lime-700">
            <Leaf className="h-4 w-4" />
            <span className="text-sm font-medium">{t("dashboard.co2")}</span>
          </div>
          <p className="text-2xl font-semibold text-lime-900">{co2} ppm</p>
        </div>
        <Button className="mt-1 w-full" onClick={() => onViewGraph?.(device)}>
          {t("dashboard.viewGraph")}
        </Button>
      </CardContent>
    </Card>
  );
}

function IrrigationIntelCard({
  device,
  realtime,
  t,
  onViewGraph,
}: {
  device: Device;
  realtime?: RealtimeRecord;
  t: TranslateFn;
  onViewGraph?: (device: Device) => void;
}) {
  const baseSeed = seedFromString(device.device_id);
  const soilMoisture = toMetric(
    realtime?.Soil_Moisture ?? realtime?.soil_moisture ?? realtime?.SoilMoisture ?? realtime?.SM,
    metricFromSeed(baseSeed + 11, 25, 75),
  );
  const soilTemperature = toMetric(
    realtime?.Soil_Temperature ?? realtime?.soil_temperature ?? realtime?.SoilTemperature ?? realtime?.Stemp,
    metricFromSeed(baseSeed + 12, 18, 35),
  );
  const deployedAt = device.deployed_at?.trim() || t("dashboard.notSpecified");

  return (
    <Card className="hover-lift overflow-hidden border-amber-200/70 shadow-[0_14px_40px_-20px_rgba(180,120,30,0.55)]">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">{t("dashboard.sensor")}</p>
            <h3 className="font-display text-lg font-semibold text-white/95">{device.device_name}</h3>
            <p className="mt-1 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              {t("dashboard.deployedAt")}: {deployedAt}
            </p>
          </div>
          <Gauge className="h-6 w-6" />
        </div>
        <p className="mt-2 text-xs text-white/85">{t("dashboard.deviceId")}: {device.device_id}</p>
      </div>
      <CardContent className="grid grid-cols-1 gap-3 p-5">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3">
          <div className="mb-1 flex items-center gap-2 text-emerald-700">
            <Droplets className="h-4 w-4" />
            <span className="text-sm font-medium">{t("dashboard.soilMoisture")}</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-900">{soilMoisture}%</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50/80 p-3">
          <div className="mb-1 flex items-center gap-2 text-orange-700">
            <Thermometer className="h-4 w-4" />
            <span className="text-sm font-medium">{t("dashboard.soilTemperature")}</span>
          </div>
          <p className="text-2xl font-semibold text-orange-900">{soilTemperature}°C</p>
        </div>
        <Button className="mt-1 w-full" onClick={() => onViewGraph?.(device)}>
          {t("dashboard.viewGraph")}
        </Button>
      </CardContent>
    </Card>
  );
}

function SinchaiSummaryCard({
  mode,
  schedules,
  t,
  loading,
  fertigationTimeMin,
}: {
  mode: string;
  schedules: SinchaiSchedule[];
  t: TranslateFn;
  loading: boolean;
  fertigationTimeMin: number | null;
}) {
  const enabledCount = schedules.filter((item) => item.enabled).length;
  return (
    <Card className="hover-lift overflow-hidden border-cyan-200/70 shadow-[0_14px_38px_-20px_rgba(10,130,145,0.58)]">
      <div className="bg-gradient-to-r from-cyan-500 to-teal-600 px-5 py-4 text-white">
        <h3 className="font-display text-xl font-semibold">{t("dashboard.sinchaiSummaryTitle")}</h3>
        <p className="mt-1 text-xs text-white/85">
          {t("dashboard.mode")}: <span className="font-semibold">{mode}</span>
        </p>
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
            <p className="text-xs text-cyan-700">{t("dashboard.totalSchedules")}</p>
            <p className="text-2xl font-semibold text-cyan-900">{schedules.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-xs text-emerald-700">{t("dashboard.enabledSchedules")}</p>
            <p className="text-2xl font-semibold text-emerald-900">{enabledCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-xs text-slate-600">{t("dashboard.disabledSchedules")}</p>
            <p className="text-2xl font-semibold text-slate-900">{Math.max(0, schedules.length - enabledCount)}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="text-xs text-emerald-700">{t("sinchaiPlanner.fertigationTimeMin")}</p>
            <p className="text-2xl font-semibold text-emerald-900">{fertigationTimeMin ?? "--"}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("planner.loading")}</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.noSchedules")}</p>
        ) : (
          <div className="pb-1">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {schedules.map((schedule) => (
                <div
                  key={`sinchai-summary-${schedule.schedule_no}`}
                  className="rounded-xl border border-cyan-200/70 bg-gradient-to-br from-white to-cyan-50/60 p-3 shadow-[0_10px_24px_-18px_rgba(8,105,150,0.6)]"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{schedule.schedule_name || `Schedule ${schedule.schedule_no}`}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        schedule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {schedule.enabled ? t("sinchaiPlanner.enabled") : t("sinchaiPlanner.disabled")}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5 text-cyan-700" />
                      <span className="font-medium">{t("sinchaiPlanner.startTime")}:</span> {schedule.start_time || "--"}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-indigo-700" />
                      <span className="font-medium">{t("sinchaiPlanner.duration")}:</span> {schedule.irrigation_duration_min ?? "--"} min
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-emerald-700" />
                      <span className="font-medium">{t("sinchaiPlanner.repeatDays")}:</span>{" "}
                      {schedule.days.length > 0 ? schedule.days.join(", ") : "--"}
                    </p>
                    <p className="inline-flex items-start gap-1.5">
                      <Droplets className="mt-0.5 h-3.5 w-3.5 text-sky-700" />
                      <span>
                        <span className="font-medium">{t("sinchaiPlanner.selectValves")}:</span>{" "}
                        {schedule.valves.length > 0 ? schedule.valves.join(", ") : "--"}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const loginResponse = useMemo(() => getStoredLoginResponse(), []);
  const token = useMemo(() => getStoredAuthToken(), []);
  const solutionGroups = getSolutions(loginResponse);
  const devices = useMemo(
    () => (solutionGroups.length > 0 ? solutionGroups.flatMap((solution) => solution.devices) : getDevices(loginResponse)),
    [solutionGroups, loginResponse],
  );
  const userId = useMemo(() => {
    const userObj = readObject(loginResponse?.user);
    const value = loginResponse?.user_id ?? userObj?.user_id ?? userObj?.id;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }, [loginResponse]);
  const controlApiBase = useMemo(
    () =>
      resolveApiBase(
        import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL,
        import.meta.env.VITE_PLANNER_API_URL,
      ),
    [],
  );
  const historicalApiBase = useMemo(
    () =>
      resolveApiBase(
        import.meta.env.VITE_HISTORICAL_DATA_API_BASE_URL,
        import.meta.env.VITE_DEVICE_CONTROL_API_BASE_URL,
        import.meta.env.VITE_PLANNER_API_URL,
      ),
    [],
  );
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeRecord>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEStopSubmitting, setIsEStopSubmitting] = useState(false);
  const [isEStopDialogOpen, setIsEStopDialogOpen] = useState(false);
  const [selectedSolutionForEStop, setSelectedSolutionForEStop] = useState<string | null>(null);
  const [estopSolutions, setEstopSolutions] = useState<Record<string, boolean>>({});
  const [isGraphDialogOpen, setIsGraphDialogOpen] = useState(false);
  const [selectedGraphDevice, setSelectedGraphDevice] = useState<Device | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<HistoricalMetric>("temperature");
  const [selectedRange, setSelectedRange] = useState<0.5 | 1 | 3>(1);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<HistoricalPoint[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherSnapshot | null>(null);
  const [sinchaiSchedules, setSinchaiSchedules] = useState<SinchaiSchedule[]>([]);
  const [sinchaiMode, setSinchaiMode] = useState("Auto");
  const [sinchaiFertigationTimeMin, setSinchaiFertigationTimeMin] = useState<number | null>(null);
  const [sinchaiLoading, setSinchaiLoading] = useState(false);

  const weatherLocationQuery = useMemo(() => {
    const userObj = readObject(loginResponse?.user);
    const candidates = [
      asNonEmptyString(loginResponse?.farm_location),
      asNonEmptyString(loginResponse?.location),
      asNonEmptyString(loginResponse?.address),
      asNonEmptyString(userObj?.farm_location),
      asNonEmptyString(userObj?.location),
      asNonEmptyString(userObj?.address),
      ...devices.map((device) => asNonEmptyString(device.deployed_at)),
    ].filter((value): value is string => Boolean(value));

    const liveLocation = candidates.find((value) => !isMicroLocation(value)) ?? null;
    if (liveLocation) return liveLocation;
    const fallbackLocation = asNonEmptyString(import.meta.env.VITE_WEATHER_FALLBACK_LOCATION);
    return fallbackLocation ?? null;
  }, [loginResponse, devices]);
  const weatherCoords = useMemo(() => parseLatLong(weatherLocationQuery), [weatherLocationQuery]);

  useEffect(() => {
    if (!token || !loginResponse) {
      navigate("/");
    }
  }, [token, loginResponse, navigate]);

  useEffect(() => {
    applySeo({
      title: "Dashboard | EzeBuddies",
      description: "Authorized dashboard for device telemetry and controls.",
      path: "/dashboard",
      robots: "noindex, nofollow",
    });
  }, []);

  const refreshRealtimeData = useCallback(async () => {
    if (!token || !userId) return;

    const baseUrl = import.meta.env.VITE_DEVICE_DATA_API_BASE_URL;
    if (!baseUrl) return;

    try {
      setIsRefreshing(true);
      const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(userId)}/devices/data`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Device data API failed (${response.status})`);
      }

      const data = (await response.json()) as RealtimeApiResponse;
      const map: Record<string, RealtimeRecord> = {};
      const records = Array.isArray(data.records) ? data.records : [];
      for (const record of records) {
        if (!record || typeof record !== "object" || Array.isArray(record)) continue;
        const typed = record as RealtimeRecord;
        const deviceId = getRecordDeviceId(typed);
        if (deviceId) map[deviceId] = typed;
      }
      setRealtimeData(map);
    } catch (error) {
      console.error("Device data fetch failed:", error);
      toast({
        title: t("dashboard.liveDataFailed.title"),
        description: t("dashboard.liveDataFailed.description"),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [token, userId, toast, setRealtimeData, t]);

  useEffect(() => {
    if (!token || !userId) return;
    refreshRealtimeData();
    const interval = setInterval(refreshRealtimeData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, userId, refreshRealtimeData]);

  useEffect(() => {
    if (!token || !userId) return;
    let mounted = true;

    const loadSinchaiSummary = async () => {
      setSinchaiLoading(true);
      try {
        const data = await fetchSinchaiPlanner({
          token,
          userId,
          section: "user_sinchai_planner",
        });
        if (!mounted) return;
        setSinchaiMode(data?.mode || "Auto");
        setSinchaiSchedules(data?.schedules ?? []);
        setSinchaiFertigationTimeMin(typeof data?.fertigation_time_min === "number" ? data.fertigation_time_min : null);
      } catch (error) {
        console.error("Sinchai planner summary fetch failed:", error);
        if (!mounted) return;
        setSinchaiMode("Auto");
        setSinchaiSchedules([]);
        setSinchaiFertigationTimeMin(null);
      } finally {
        if (mounted) setSinchaiLoading(false);
      }
    };

    loadSinchaiSummary();
    const interval = window.setInterval(loadSinchaiSummary, 5 * 60 * 1000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [token, userId]);

  const refreshWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      let latitude: number;
      let longitude: number;
      let resolvedName = weatherLocationQuery ?? "GPS";
      let resolvedFromSource = false;

      // 1) Prefer browser/device GPS location when available.
      try {
        const coords = await getBrowserCoordinates();
        latitude = coords.lat;
        longitude = coords.lon;
        resolvedName = `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
        resolvedFromSource = true;
      } catch {
        resolvedFromSource = false;
      }

      // 2) Fallback to explicit lat,long text (if provided).
      if (!resolvedFromSource && weatherCoords) {
        latitude = weatherCoords.lat;
        longitude = weatherCoords.lon;
        resolvedName = `${weatherCoords.lat.toFixed(4)}, ${weatherCoords.lon.toFixed(4)}`;
        resolvedFromSource = true;
      }

      // 3) Fallback to geocoding location text.
      if (!resolvedFromSource && weatherLocationQuery) {
        const geocodeRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLocationQuery)}&count=1&language=en&format=json`,
        );
        const geocodeJson = (await geocodeRes.json()) as { results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> };
        const first = geocodeJson.results?.[0];
        if (!first) {
          setWeatherError(t("dashboard.weatherUnavailable"));
          setWeatherData(null);
          return;
        }
        latitude = first.latitude;
        longitude = first.longitude;
        resolvedName = [first.name, first.admin1, first.country].filter(Boolean).join(", ");
        resolvedFromSource = true;
      }

      if (!resolvedFromSource) {
        setWeatherError(t("dashboard.weatherUnavailable"));
        setWeatherData(null);
        return;
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,wind_speed_10m&hourly=relative_humidity_2m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&forecast_days=7&timezone=auto`,
      );
      const weatherJson = (await weatherRes.json()) as Record<string, unknown>;
      const current = readObject(weatherJson.current);
      const daily = readObject(weatherJson.daily);
      const hourly = readObject(weatherJson.hourly);

      const time = Array.isArray(daily?.time) ? daily.time : [];
      const maxArr = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
      const minArr = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];
      const uvArr = Array.isArray(daily?.uv_index_max) ? daily.uv_index_max : [];
      const precipitationSumArr = Array.isArray(daily?.precipitation_sum) ? daily.precipitation_sum : [];
      const precipitationProbMaxArr = Array.isArray(daily?.precipitation_probability_max) ? daily.precipitation_probability_max : [];
      const sunriseArr = Array.isArray(daily?.sunrise) ? daily.sunrise : [];
      const sunsetArr = Array.isArray(daily?.sunset) ? daily.sunset : [];

      const hourlyTime = Array.isArray(hourly?.time) ? hourly.time : [];
      const hourlyHumidity = Array.isArray(hourly?.relative_humidity_2m) ? hourly.relative_humidity_2m : [];
      const hourlyCloud = Array.isArray(hourly?.cloud_cover) ? hourly.cloud_cover : [];

      const dailyHumidityCloudMap = new Map<string, { humiditySum: number; humidityCount: number; cloudSum: number; cloudCount: number }>();
      for (let i = 0; i < hourlyTime.length; i += 1) {
        const rawTime = hourlyTime[i];
        if (typeof rawTime !== "string") continue;
        const dateKey = rawTime.slice(0, 10);
        const prev = dailyHumidityCloudMap.get(dateKey) ?? {
          humiditySum: 0,
          humidityCount: 0,
          cloudSum: 0,
          cloudCount: 0,
        };
        const hum = toOptionalMetric(hourlyHumidity[i]);
        const cloud = toOptionalMetric(hourlyCloud[i]);
        if (typeof hum === "number") {
          prev.humiditySum += hum;
          prev.humidityCount += 1;
        }
        if (typeof cloud === "number") {
          prev.cloudSum += cloud;
          prev.cloudCount += 1;
        }
        dailyHumidityCloudMap.set(dateKey, prev);
      }

      const dailyData: WeatherSnapshot["daily"] = time.slice(0, 3).map((day, index) => ({
        date: typeof day === "string" ? day : "",
        max: toOptionalMetric(maxArr[index]),
        min: toOptionalMetric(minArr[index]),
        uvMax: toOptionalMetric(uvArr[index]),
        humidityAvg:
          typeof day === "string" && dailyHumidityCloudMap.get(day)?.humidityCount
            ? Number((dailyHumidityCloudMap.get(day)!.humiditySum / dailyHumidityCloudMap.get(day)!.humidityCount).toFixed(1))
            : null,
        cloudAvg:
          typeof day === "string" && dailyHumidityCloudMap.get(day)?.cloudCount
            ? Number((dailyHumidityCloudMap.get(day)!.cloudSum / dailyHumidityCloudMap.get(day)!.cloudCount).toFixed(1))
            : null,
        precipitationSum: toOptionalMetric(precipitationSumArr[index]),
        precipitationProbMax: toOptionalMetric(precipitationProbMaxArr[index]),
        sunrise: formatTimeFromIso(typeof sunriseArr[index] === "string" ? sunriseArr[index] : null),
        sunset: formatTimeFromIso(typeof sunsetArr[index] === "string" ? sunsetArr[index] : null),
      }));

      setWeatherData({
        resolvedName,
        current: {
          temp: toOptionalMetric(current?.temperature_2m),
          feelsLike: toOptionalMetric(current?.apparent_temperature),
          humidity: toOptionalMetric(current?.relative_humidity_2m),
          wind: toOptionalMetric(current?.wind_speed_10m),
          precipitation: toOptionalMetric(current?.precipitation),
          pressure: toOptionalMetric(current?.pressure_msl),
          cloud: toOptionalMetric(current?.cloud_cover),
        },
        daily: dailyData,
      });
    } catch (error) {
      console.error("Weather API failed:", error);
      setWeatherError(t("dashboard.weatherUnavailable"));
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [weatherLocationQuery, weatherCoords, t]);

  useEffect(() => {
    refreshWeather();
    const interval = setInterval(refreshWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshWeather]);

  const loadHistoricalGraph = useCallback(async () => {
    if (!isGraphDialogOpen || !selectedGraphDevice) return;
    if (!token || !userId || !historicalApiBase) {
      setGraphError(t("dashboard.historicalErrorMissingConfig"));
      setGraphData([]);
      return;
    }
    setGraphLoading(true);
    setGraphError(null);
    try {
      const response = (await fetchHistoricalData({
        apiBase: historicalApiBase,
        token,
        userId,
        deviceId: selectedGraphDevice.device_id,
        deviceName: selectedGraphDevice.device_name,
        rangeValue: selectedRange,
      })) as { data?: unknown[] };

      const points = Array.isArray(response?.data)
        ? response.data
            .map((entry) => {
              const row = readObject(entry);
              const timestamp = row?.timestamp;
              const payload = readObject(row?.payload);
              if (typeof timestamp !== "string" || !payload) return null;
              return {
                label: formatHistoryLabel(timestamp),
                temperature: toOptionalMetric(payload.Etemp ?? payload.etemp ?? payload.temperature),
                humidity: toOptionalMetric(payload.Humidity ?? payload.humidity),
                co2: toOptionalMetric(payload.CO2 ?? payload.co2),
              } satisfies HistoricalPoint;
            })
            .filter((point): point is HistoricalPoint => Boolean(point))
        : [];

      setGraphData(points);
    } catch (error) {
      console.error("Historical data API failed:", error);
      setGraphError(t("dashboard.historicalErrorFetch"));
      setGraphData([]);
    } finally {
      setGraphLoading(false);
    }
  }, [isGraphDialogOpen, selectedGraphDevice, token, userId, historicalApiBase, selectedRange, t]);

  useEffect(() => {
    loadHistoricalGraph();
  }, [loadHistoricalGraph]);

  const openGraphForDevice = (device: Device) => {
    setSelectedGraphDevice(device);
    setSelectedMetric("temperature");
    setSelectedRange(1);
    setGraphData([]);
    setGraphError(null);
    setIsGraphDialogOpen(true);
  };

  const handleRelayToggle = useCallback(
    async (args: { deviceId: string; buttonName: string; state: "on" | "off" }) => {
      if (!token || !userId || !controlApiBase) {
        throw new Error("Missing token, user or VITE_DEVICE_CONTROL_API_BASE_URL");
      }
      await changeRelayState({
        apiBase: controlApiBase,
        token,
        userId,
        deviceId: args.deviceId,
        buttonName: args.buttonName,
        state: args.state,
      });
    },
    [token, userId, controlApiBase],
  );

  const renderDeviceCard = (device: Device) => {
    const normalizedName = device.device_name.toLowerCase();
    const realtime = realtimeData[device.device_id];
    if (normalizedName.includes("enviroment_intel")) {
      return <EnvironmentIntelCard key={device.device_id} device={device} realtime={realtime} t={t} onViewGraph={openGraphForDevice} />;
    }
    if (normalizedName.includes("enviroment_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} onRelayToggle={handleRelayToggle} />;
    }
    if (normalizedName.includes("irrigation_intel")) {
      return <IrrigationIntelCard key={device.device_id} device={device} realtime={realtime} t={t} onViewGraph={openGraphForDevice} />;
    }
    if (normalizedName.includes("irrigation_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} onRelayToggle={handleRelayToggle} />;
    }

    return (
      <Card key={device.device_id} className="hover-lift border-border/70">
        <CardHeader>
          <CardTitle>{device.device_name}</CardTitle>
          <CardDescription>
            {device.device_type} | ID: {device.device_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <ToggleLeft className="h-4 w-4" />
            {device.is_active ? t("dashboard.active") : t("dashboard.inactive")}
          </div>
          <p>{t("dashboard.customUiHint")}</p>
        </CardContent>
      </Card>
    );
  };

  const renderDeviceCardForSolution = (solutionName: string, device: Device) => {
    const estopActive = Boolean(estopSolutions[solutionName]);
    const normalizedName = device.device_name.toLowerCase();
    const realtime = realtimeData[device.device_id];

    if (normalizedName.includes("enviroment_intel")) {
      return <EnvironmentIntelCard key={device.device_id} device={device} realtime={realtime} t={t} onViewGraph={openGraphForDevice} />;
    }
    if (normalizedName.includes("enviroment_control")) {
      return (
        <EnvironmentControlCard
          key={device.device_id}
          device={device}
          realtime={realtime}
          t={t}
          estopActive={estopActive}
          onRelayToggle={handleRelayToggle}
        />
      );
    }
    if (normalizedName.includes("irrigation_intel")) {
      return <IrrigationIntelCard key={device.device_id} device={device} realtime={realtime} t={t} onViewGraph={openGraphForDevice} />;
    }
    if (normalizedName.includes("irrigation_control")) {
      return (
        <EnvironmentControlCard
          key={device.device_id}
          device={device}
          realtime={realtime}
          t={t}
          estopActive={estopActive}
          onRelayToggle={handleRelayToggle}
        />
      );
    }

    return renderDeviceCard(device);
  };

  const handleOpenEStopDialog = (solutionName: string) => {
    setSelectedSolutionForEStop(solutionName);
    setIsEStopDialogOpen(true);
  };

  const handleConfirmEStop = async () => {
    const solutionName = selectedSolutionForEStop?.trim();
    if (!solutionName) return;
    if (!token || !userId || !controlApiBase) {
      toast({
        title: t("dashboard.estopFailedTitle"),
        description: t("dashboard.estopConfigMissingDescription"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEStopSubmitting(true);
      await triggerEStop({
        apiBase: controlApiBase,
        token,
        userId,
        solutionName,
      });
      setEstopSolutions((prev) => ({ ...prev, [solutionName]: true }));
      toast({
        title: t("dashboard.estopEnabledTitle"),
        description: t("dashboard.estopEnabledDescription", { solution: solutionName }),
        variant: "destructive",
      });
      setIsEStopDialogOpen(false);
      setSelectedSolutionForEStop(null);
    } catch (error) {
      console.error("E-Stop API failed:", error);
      toast({
        title: t("dashboard.estopFailedTitle"),
        description: t("dashboard.estopFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsEStopSubmitting(false);
    }
  };

  const metricConfig: Record<HistoricalMetric, { label: string; key: keyof HistoricalPoint; color: string; unit: string }> = {
    temperature: { label: t("dashboard.temperature"), key: "temperature", color: "#10b981", unit: "°C" },
    humidity: { label: t("dashboard.humidity"), key: "humidity", color: "#0ea5e9", unit: "%" },
    co2: { label: t("dashboard.co2"), key: "co2", color: "#84cc16", unit: "ppm" },
  };

  const activeMetric = metricConfig[selectedMetric];
  const latestTemperature = [...graphData]
    .reverse()
    .map((item) => item.temperature)
    .find((value): value is number => typeof value === "number");
  const latestHumidity = [...graphData]
    .reverse()
    .map((item) => item.humidity)
    .find((value): value is number => typeof value === "number");
  const latestCo2 = [...graphData]
    .reverse()
    .map((item) => item.co2)
    .find((value): value is number => typeof value === "number");

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refreshRealtimeData}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? t("dashboard.refreshing") : t("dashboard.refreshNow")}
              </Button>
            </div>
          </div>

          <Card className="hover-lift overflow-visible border-cyan-200/70 shadow-[0_18px_42px_-26px_rgba(8,110,190,0.55)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-200/60 bg-gradient-to-r from-cyan-50 via-sky-50 to-indigo-50 p-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CloudSun className="h-5 w-5 text-cyan-600" />
                    {t("dashboard.weatherTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("dashboard.weatherDescription")}
                    {weatherData?.resolvedName && !isCoordinateLabel(weatherData.resolvedName)
                      ? ` • ${weatherData.resolvedName}`
                      : weatherLocationQuery && !isCoordinateLabel(weatherLocationQuery)
                        ? ` • ${weatherLocationQuery}`
                        : ""}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshWeather} disabled={weatherLoading}>
                  {weatherLoading ? t("dashboard.refreshing") : t("dashboard.refreshNow")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {weatherLoading ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.weatherLoading")}</p>
              ) : weatherError ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <div className="group relative">
                    <button
                      type="button"
                      className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700"
                      aria-label="Location help"
                    >
                      AI
                    </button>
                    <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-30 w-72 max-w-[calc(100vw-2.5rem)] rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-700 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
                      Allow location in browser, refresh page, enable device GPS. If blocked, reset Location permission in browser settings.
                    </div>
                  </div>
                  <p className="text-sm font-medium text-amber-800">Please allow GPS/location to get weather data.</p>
                </div>
              ) : weatherData ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <p className="text-xs font-medium text-emerald-700">{t("dashboard.weatherTemp")}</p>
                      <p className="text-xl font-semibold text-emerald-900">{weatherData.current.temp ?? "--"}°C</p>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                      <p className="text-xs font-medium text-sky-700">{t("dashboard.weatherFeelsLike")}</p>
                      <p className="text-xl font-semibold text-sky-900">{weatherData.current.feelsLike ?? "--"}°C</p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3">
                      <p className="text-xs font-medium text-cyan-700">{t("dashboard.humidity")}</p>
                      <p className="text-xl font-semibold text-cyan-900">{weatherData.current.humidity ?? "--"}%</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                      <p className="inline-flex items-center gap-1 text-xs font-medium text-violet-700">
                        <Wind className="h-3.5 w-3.5" />
                        {t("dashboard.weatherWind")}
                      </p>
                      <p className="text-xl font-semibold text-violet-900">{weatherData.current.wind ?? "--"} km/h</p>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                      <p className="text-xs font-medium text-blue-700">{t("dashboard.weatherRain")}</p>
                      <p className="text-xl font-semibold text-blue-900">{weatherData.current.precipitation ?? "--"} mm</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                      <p className="text-xs font-medium text-amber-700">{t("dashboard.weatherPressure")}</p>
                      <p className="text-xl font-semibold text-amber-900">{weatherData.current.pressure ?? "--"} hPa</p>
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3">
                      <p className="text-xs font-medium text-slate-600">{t("dashboard.weatherCloud")}</p>
                      <p className="text-xl font-semibold text-slate-900">{weatherData.current.cloud ?? "--"}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-700">{t("dashboard.weatherForecast")}</h3>
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                        {t("dashboard.weatherRainChance")}:{" "}
                        <span className="ml-1 font-bold">
                          {typeof weatherData.current.cloud === "number"
                            ? weatherData.current.cloud >= 70
                              ? t("dashboard.weatherRainChanceHigh")
                              : weatherData.current.cloud >= 35
                                ? t("dashboard.weatherRainChanceMedium")
                                : t("dashboard.weatherRainChanceLow")
                            : "--"}
                        </span>
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {weatherData.daily.map((day) => {
                        const rainLabel =
                          typeof day.precipitationProbMax === "number"
                            ? day.precipitationProbMax >= 70
                              ? t("dashboard.weatherRainChanceHigh")
                              : day.precipitationProbMax >= 35
                                ? t("dashboard.weatherRainChanceMedium")
                                : t("dashboard.weatherRainChanceLow")
                            : "--";
                        return (
                          <div
                            key={day.date}
                            className="flex h-full flex-col gap-2 rounded-xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/60 p-2.5 shadow-[0_8px_18px_-14px_rgba(2,105,170,0.45)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-800">{day.date}</p>
                              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {rainLabel}
                                {typeof day.precipitationProbMax === "number" ? ` (${day.precipitationProbMax}%)` : ""}
                              </span>
                            </div>

                            <p className="text-lg font-bold leading-none text-slate-900">
                              {day.max ?? "--"}° <span className="text-sm font-medium text-slate-500">/ {day.min ?? "--"}°</span>
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                {t("dashboard.weatherUvMax")}: {day.uvMax ?? "--"}
                              </span>
                              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-800">
                                {t("dashboard.humidity")}: {day.humidityAvg ?? "--"}%
                              </span>
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                                {t("dashboard.weatherRain")}: {day.precipitationSum ?? "--"} mm
                              </span>
                              <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                {t("dashboard.weatherCloud")}: {day.cloudAvg ?? "--"}%
                              </span>
                            </div>

                            <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Sunrise className="h-3.5 w-3.5" />
                                {day.sunrise ?? "--"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Sunset className="h-3.5 w-3.5" />
                                {day.sunset ?? "--"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("dashboard.weatherUnavailable")}</p>
              )}
            </CardContent>
          </Card>

          {solutionGroups.length > 0 ? (
            solutionGroups.map((solution) => {
              const sensorDevices = solution.devices.filter((device) => device.device_type.toLowerCase() === "sensors");
              const actuatorDevices = solution.devices.filter((device) => device.device_type.toLowerCase() === "actuators");
              const isSinchai = isSmartSinchaiSolution(solution.solution_name);
              const otherDevices = solution.devices.filter((device) => {
                const type = device.device_type.toLowerCase();
                return type !== "sensors" && type !== "actuators";
              });

              return (
                <motion.section
                  key={solution.solution_name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 shadow-[0_14px_38px_-26px_rgba(3,95,140,0.55)] md:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-2xl font-semibold text-foreground">{solution.solution_name}</h2>
                    <Button variant="destructive" size="sm" onClick={() => handleOpenEStopDialog(solution.solution_name)}>
                      E-Stop
                    </Button>
                  </div>

                  {sensorDevices.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">{t("dashboard.sensor")}</h3>
                      <div className="grid gap-5 md:grid-cols-2">{sensorDevices.map((device) => renderDeviceCardForSolution(solution.solution_name, device))}</div>
                    </div>
                  )}

                  {isSinchai && (
                    <div className="space-y-3">
                      <div className="grid gap-5">
                        <div className="w-full">
                        <SinchaiSummaryCard
                          mode={sinchaiMode}
                          schedules={sinchaiSchedules}
                          fertigationTimeMin={sinchaiFertigationTimeMin}
                          t={t}
                          loading={sinchaiLoading}
                        />
                        </div>
                      </div>
                    </div>
                  )}

                  {!isSinchai && actuatorDevices.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">{t("dashboard.actuator")}</h3>
                      <div className="grid gap-5 md:grid-cols-2">{actuatorDevices.map((device) => renderDeviceCardForSolution(solution.solution_name, device))}</div>
                    </div>
                  )}

                  {otherDevices.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">{t("dashboard.otherDevices")}</h3>
                      <div className="grid gap-5 md:grid-cols-2">{otherDevices.map((device) => renderDeviceCardForSolution(solution.solution_name, device))}</div>
                    </div>
                  )}
                </motion.section>
              );
            })
          ) : (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{t("dashboard.devices")}</h2>
              <div className="grid gap-5 md:grid-cols-2">{devices.map(renderDeviceCard)}</div>
            </section>
          )}
        </motion.main>
      </div>

      <Dialog open={isEStopDialogOpen} onOpenChange={setIsEStopDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("dashboard.estopDialogTitle")}</DialogTitle>
            <DialogDescription className="sr-only">Emergency stop confirmation</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-bold text-foreground">{t("dashboard.estopDialogMessage")}</p>
          <Button variant="destructive" className="w-full" onClick={handleConfirmEStop} disabled={isEStopSubmitting}>
            {t("dashboard.stop")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isGraphDialogOpen} onOpenChange={setIsGraphDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-semibold">
              {t("dashboard.trendsTitle", { device: selectedGraphDevice?.device_name ?? t("dashboard.sensor") })}
            </DialogTitle>
            <DialogDescription>
              {selectedGraphDevice?.device_id}
              {selectedGraphDevice?.deployed_at ? ` • ${selectedGraphDevice.deployed_at}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">{t("dashboard.currentTemperature")}</p>
              <p className="text-3xl font-semibold">
                {latestTemperature ?? "--"}
                <span className="ml-1 text-lg text-muted-foreground">°C</span>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">{t("dashboard.currentHumidity")}</p>
              <p className="text-3xl font-semibold">
                {latestHumidity ?? "--"}
                <span className="ml-1 text-lg text-muted-foreground">%</span>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">{t("dashboard.currentCo2")}</p>
              <p className="text-3xl font-semibold">
                {latestCo2 ?? "--"}
                <span className="ml-1 text-lg text-muted-foreground">ppm</span>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">{t("dashboard.selectedRange")}</p>
              <p className="text-3xl font-semibold">{selectedRange}D</p>
            </div>
            <div className="rounded-xl border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">{t("dashboard.dataPoints")}</p>
              <p className="text-3xl font-semibold">{graphData.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(["temperature", "humidity", "co2"] as HistoricalMetric[]).map((metric) => (
                <Button
                  key={metric}
                  type="button"
                  variant={selectedMetric === metric ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric(metric)}
                >
                  {metricConfig[metric].label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([0.5, 1, 3] as const).map((range) => (
                <Button
                  key={range}
                  type="button"
                  variant={selectedRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRange(range)}
                >
                  {range}D
                </Button>
              ))}
            </div>
          </div>

          <div className="h-[360px] rounded-2xl border border-border/70 bg-background p-3">
            {graphLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("dashboard.graphLoading")}</div>
            ) : graphError ? (
              <div className="flex h-full items-center justify-center text-sm text-destructive">{graphError}</div>
            ) : graphData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("dashboard.noHistoricalData")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData}>
                  <defs>
                    <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeMetric.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={activeMetric.color} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 12 }} width={48} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey={activeMetric.key}
                    stroke={activeMetric.color}
                    strokeWidth={2.5}
                    fill="url(#graphFill)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
