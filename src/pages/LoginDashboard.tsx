import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Thermometer, Droplets, Leaf, Cpu, ToggleLeft, RefreshCw, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { clearStoredAuth, getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/language";
import { applySeo } from "@/lib/seo";

type Device = {
  device_id: string;
  device_name: string;
  device_type: string;
  is_active: boolean;
  deployed_at?: string;
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

function EnvironmentControlCard({ device, realtime, t }: { device: Device; realtime?: RealtimeRecord; t: TranslateFn }) {
  const channels = useMemo(() => {
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
      enabled: randomFromSeed(seedFromString(`${device.device_id}-${i}`)) > 0.5,
    }));
  }, [device.device_id, realtime]);

  return (
    <Card className="overflow-hidden border-cyan-200/70 shadow-[0_14px_40px_-20px_rgba(0,140,170,0.6)]">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">{t("dashboard.actuator")}</p>
            <h3 className="font-display text-xl font-semibold">{device.device_name}</h3>
          </div>
          <Cpu className="h-6 w-6" />
        </div>
        <p className="mt-2 text-xs text-white/85">{t("dashboard.deviceId")}: {device.device_id}</p>
      </div>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2">
          <span className="text-sm font-medium text-cyan-700">{t("dashboard.relayBoard")}</span>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-cyan-700">
            {channels.filter((item) => item.enabled).length}/{channels.length} ON
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {channels.map((channel, index) => (
            <div key={`${device.device_id}-${channel.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2">
              <span className="text-sm font-medium text-foreground">{formatRelayName(channel.name)}</span>
              <Switch checked={channel.enabled} disabled />
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
    <Card className="overflow-hidden border-emerald-200/70 shadow-[0_14px_40px_-20px_rgba(16,150,87,0.6)]">
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

export default function LoginDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const loginResponse = getStoredLoginResponse();
  const token = getStoredAuthToken();
  const devices = getDevices(loginResponse);
  const userId = typeof loginResponse?.user_id === "string" ? loginResponse.user_id : null;
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeRecord>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const sensorDevices = useMemo(
    () => devices.filter((device) => device.device_type.toLowerCase() === "sensors"),
    [devices],
  );
  const actuatorDevices = useMemo(
    () => devices.filter((device) => device.device_type.toLowerCase() === "actuators"),
    [devices],
  );
  const quantityByName = useMemo(() => buildDeviceCounts(devices), [devices]);
  const userName = typeof loginResponse?.name === "string" ? loginResponse.name : "User";
  const userEmail = typeof loginResponse?.email === "string" ? loginResponse.email : t("dashboard.notAvailable");
  const userIdLabel = typeof loginResponse?.user_id === "string" ? loginResponse.user_id : t("dashboard.notAvailable");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecf8ff] via-[#f7fcff] to-[#ffffff] py-12 px-6">
      <AnimatePresence>
        {isNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-[2px]"
              onClick={() => setIsNavOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="fixed left-0 top-0 z-50 h-screen w-[300px] border-r border-sky-200/60 bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-700 px-5 py-6 text-white">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">{t("dashboard.navTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setIsNavOpen(false)}
                    className="rounded-lg bg-white/15 p-1.5 text-white hover:bg-white/25"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="font-display text-2xl font-semibold">{t("dashboard.welcome", { name: userName })}</h2>
                <p className="mt-1 text-sm text-white/85 break-all">{userEmail}</p>
                <p className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs">{userIdLabel}</p>
              </div>
              <div className="space-y-4 p-5">
                <LanguageSelector />
                <div className="space-y-2">
                  <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    {t("dashboard.logout")}
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setIsNavOpen(true)} aria-label={t("dashboard.navTitle")}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{t("dashboard.title")}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Button variant="outline" onClick={refreshRealtimeData}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? t("dashboard.refreshing") : t("dashboard.refreshNow")}
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                {t("dashboard.logout")}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.deviceSummaryTitle")}</CardTitle>
              <CardDescription>{t("dashboard.deviceSummaryDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(quantityByName).length === 0 && (
                <p className="text-sm text-muted-foreground">{t("dashboard.noDevices")}</p>
              )}
              {Object.entries(quantityByName).map(([name, count]) => (
                <div key={name} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground"></p>
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="mt-1 text-sm">
                    {t("dashboard.quantity")}: <span className="font-semibold">{count}</span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            {devices.map((device) => {
              const normalizedName = device.device_name.toLowerCase();
              const realtime = realtimeData[device.device_id];
              if (normalizedName.includes("enviroment_intel")) {
                return <EnvironmentIntelCard key={device.device_id} device={device} realtime={realtime} t={t} />;
              }
              if (normalizedName.includes("enviroment_control")) {
                return <EnvironmentControlCard key={device.device_id} device={device} realtime={realtime} t={t} />;
              }

              return (
                <Card key={device.device_id} className="border-border/70">
                  <CardHeader>
                    <CardTitle>{device.device_name}</CardTitle>
                    <CardDescription>
                      {device.device_type} | ID: {device.device_id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1">
                      <ToggleLeft className="h-4 w-4" />
                      {device.is_active ? "Active" : "Inactive"}
                    </div>
                    <p>Custom UI for this device type can be added next.</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
