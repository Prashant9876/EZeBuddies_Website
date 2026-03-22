import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Thermometer, Droplets, Leaf, Cpu, ToggleLeft, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { clearStoredAuth, getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language";
import { applySeo } from "@/lib/seo";

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

function buildDeviceCounts(devices: Device[]) {
  const byName: Record<string, number> = {};
  for (const device of devices) {
    byName[device.device_name] = (byName[device.device_name] ?? 0) + 1;
  }
  return byName;
}

type RealtimeRecord = Record<string, unknown>;

type RealtimeApiResponse = {
  user_id?: string;
  records?: unknown[];
};

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

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
}: {
  device: Device;
  realtime?: RealtimeRecord;
  t: TranslateFn;
  estopActive?: boolean;
}) {
  const { toast } = useToast();
  const initialChannels = useMemo(() => buildActuatorChannels(device.device_id, realtime), [device.device_id, realtime]);
  const initialMode = useMemo(() => toModeState(realtime?.Mode ?? realtime?.mode ?? realtime?.MODE), [realtime]);
  const [channels, setChannels] = useState(initialChannels);
  const [isAutoMode, setIsAutoMode] = useState(initialMode);

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

  const handleChannelToggle = (index: number, next: boolean) => {
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

    setChannels((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: next } : item)));
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
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EnvironmentIntelCard({ device, realtime, t }: { device: Device; realtime?: RealtimeRecord; t: TranslateFn }) {
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
      </CardContent>
    </Card>
  );
}

function IrrigationIntelCard({ device, realtime, t }: { device: Device; realtime?: RealtimeRecord; t: TranslateFn }) {
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
  const userId = typeof loginResponse?.user_id === "string" ? loginResponse.user_id : null;
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeRecord>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEStopDialogOpen, setIsEStopDialogOpen] = useState(false);
  const [selectedSolutionForEStop, setSelectedSolutionForEStop] = useState<string | null>(null);
  const [estopSolutions, setEstopSolutions] = useState<Record<string, boolean>>({});
  const quantityByName = useMemo(() => buildDeviceCounts(devices), [devices]);
  const handleLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

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

  const renderDeviceCard = (device: Device) => {
    const normalizedName = device.device_name.toLowerCase();
    const realtime = realtimeData[device.device_id];
    if (normalizedName.includes("enviroment_intel")) {
      return <EnvironmentIntelCard key={device.device_id} device={device} realtime={realtime} t={t} />;
    }
    if (normalizedName.includes("enviroment_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} />;
    }
    if (normalizedName.includes("irrigation_intel")) {
      return <IrrigationIntelCard key={device.device_id} device={device} realtime={realtime} t={t} />;
    }
    if (normalizedName.includes("irrigation_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} />;
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
      return <EnvironmentIntelCard key={device.device_id} device={device} realtime={realtime} t={t} />;
    }
    if (normalizedName.includes("enviroment_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} estopActive={estopActive} />;
    }
    if (normalizedName.includes("irrigation_intel")) {
      return <IrrigationIntelCard key={device.device_id} device={device} realtime={realtime} t={t} />;
    }
    if (normalizedName.includes("irrigation_control")) {
      return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} estopActive={estopActive} />;
    }

    return renderDeviceCard(device);
  };

  const handleOpenEStopDialog = (solutionName: string) => {
    setSelectedSolutionForEStop(solutionName);
    setIsEStopDialogOpen(true);
  };

  const handleConfirmEStop = () => {
    if (!selectedSolutionForEStop) return;
    setEstopSolutions((prev) => ({ ...prev, [selectedSolutionForEStop]: true }));
    toast({
      title: t("dashboard.estopEnabledTitle"),
      description: t("dashboard.estopEnabledDescription", { solution: selectedSolutionForEStop }),
      variant: "destructive",
    });
    setIsEStopDialogOpen(false);
    setSelectedSolutionForEStop(null);
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-r from-white via-sky-50/70 to-cyan-50/70 p-4 shadow-[0_15px_35px_-24px_rgba(2,80,130,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80">Realtime Operations</p>
                <p className="mt-1 text-sm text-slate-600">Monitor live telemetry and control your farm devices in one place.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-800">
                <Sparkles className="h-3.5 w-3.5" />
                Smart IoT View
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={refreshRealtimeData}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? t("dashboard.refreshing") : t("dashboard.refreshNow")}
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                {t("dashboard.logout")}
              </Button>
            </div>
          </div>

          <Card className="hover-lift border-sky-200/60">
            <CardHeader>
              <CardTitle>{t("dashboard.deviceSummaryTitle")}</CardTitle>
              <CardDescription>{t("dashboard.deviceSummaryDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(quantityByName).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("dashboard.noDevices")}</p>
              )}
              {Object.entries(quantityByName).map(([name, count]) => (
                <div key={name} className="rounded-xl border border-border bg-muted/30 p-3 transition hover:-translate-y-0.5 hover:border-sky-300/70 hover:bg-sky-50/70">
                  <p className="text-sm text-muted-foreground"></p>
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="mt-1 text-sm">
                    {t("dashboard.quantity")}: <span className="font-semibold">{count}</span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {solutionGroups.length > 0 ? (
            solutionGroups.map((solution) => {
              const sensorDevices = solution.devices.filter((device) => device.device_type.toLowerCase() === "sensors");
              const actuatorDevices = solution.devices.filter((device) => device.device_type.toLowerCase() === "actuators");
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

                  {actuatorDevices.length > 0 && (
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
          <Button variant="destructive" className="w-full" onClick={handleConfirmEStop}>
            {t("dashboard.stop")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
