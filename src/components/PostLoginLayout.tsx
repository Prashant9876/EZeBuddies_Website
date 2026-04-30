import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clearStoredAuth, getStoredAuthToken, getStoredLoginResponse } from "@/lib/auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/language";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, Sprout, Droplets, ChevronDown, Sparkles, BarChart3 } from "lucide-react";
import logo from "@/assets/devices/logo.png";

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseDeviceTypeCount(source: unknown) {
  if (!Array.isArray(source)) return { sensors: 0, actuators: 0, total: 0 };

  let sensors = 0;
  let actuators = 0;
  let total = 0;
  for (const item of source) {
    const obj = readObject(item);
    if (!obj) continue;
    const type = asString(obj.device_type) ?? asString(obj.Device_Type) ?? "";
    if (!type) continue;
    total += 1;
    const normalized = type.trim().toLowerCase();
    if (normalized === "sensors") sensors += 1;
    if (normalized === "actuators") actuators += 1;
  }
  return { sensors, actuators, total };
}

function extractDeviceCounts(response: Record<string, unknown> | null) {
  const rootDevices = response?.devices;
  const user = readObject(response?.user);
  const userDevices = user?.devices;

  const rootCount = parseDeviceTypeCount(rootDevices);
  const userCount = parseDeviceTypeCount(userDevices);
  if (rootCount.total > 0) return rootCount;
  if (userCount.total > 0) return userCount;

  const rootSolutions = Array.isArray(response?.solutions) ? response?.solutions : [];
  const userSolutions = user && Array.isArray(user.solutions) ? user.solutions : [];
  const solutionSource = rootSolutions.length > 0 ? rootSolutions : userSolutions;
  if (!Array.isArray(solutionSource)) return { sensors: 0, actuators: 0, total: 0 };

  let sensors = 0;
  let actuators = 0;
  let total = 0;
  for (const item of solutionSource) {
    const obj = readObject(item);
    const devices = obj?.devices;
    const count = parseDeviceTypeCount(devices);
    sensors += count.sensors;
    actuators += count.actuators;
    total += count.total;
  }
  return { sensors, actuators, total };
}

export function PostLoginLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const token = useMemo(() => getStoredAuthToken(), []);
  const loginResponse = useMemo(() => getStoredLoginResponse(), []);
  const dataInfo =
    loginResponse?.data && typeof loginResponse.data === "object" && !Array.isArray(loginResponse.data)
      ? (loginResponse.data as Record<string, unknown>)
      : null;
  const userInfo =
    (loginResponse?.user && typeof loginResponse.user === "object" && !Array.isArray(loginResponse.user)
      ? (loginResponse.user as Record<string, unknown>)
      : null) ??
    (dataInfo?.user && typeof dataInfo.user === "object" && !Array.isArray(dataInfo.user)
      ? (dataInfo.user as Record<string, unknown>)
      : null);
  const userId =
    pickString(loginResponse?.user_id, dataInfo?.user_id, userInfo?.user_id, userInfo?.id, userInfo?.userId) ?? t("dashboard.notAvailable");
  const email = pickString(loginResponse?.email, dataInfo?.email, userInfo?.email) ?? t("dashboard.notAvailable");
  const phone =
    pickString(
      loginResponse?.phone,
      loginResponse?.Phone,
      dataInfo?.phone,
      dataInfo?.Phone,
      userInfo?.phone,
      userInfo?.Phone,
      userInfo?.mobile,
      userInfo?.mobile_number,
      userInfo?.phone_number,
      userInfo?.contact_number,
      userInfo?.contactNumber,
    ) ?? t("dashboard.notAvailable");
  const farmLocation =
    pickString(
      loginResponse?.farm_location,
      loginResponse?.Farm_location,
      loginResponse?.farmLocation,
      loginResponse?.FarmLocation,
      loginResponse?.location,
      loginResponse?.address,
      dataInfo?.farm_location,
      dataInfo?.Farm_location,
      dataInfo?.farmLocation,
      dataInfo?.FarmLocation,
      dataInfo?.location,
      dataInfo?.address,
      userInfo?.farm_location,
      userInfo?.Farm_location,
      userInfo?.farmLocation,
      userInfo?.FarmLocation,
      userInfo?.location,
      userInfo?.address,
    ) ?? t("dashboard.notAvailable");
  const pageTitle =
    location.pathname === "/dashboard/vataran-planner"
      ? t("dashboard.vataranPlanner")
      : location.pathname === "/dashboard/sinchai-planner"
        ? t("dashboard.sinchaiPlanner")
        : t("dashboard.homeButton");
  const deviceCounts = useMemo(() => extractDeviceCounts(loginResponse), [loginResponse]);

  useEffect(() => {
    if (!token || !loginResponse) {
      navigate("/");
    }
  }, [token, loginResponse, navigate]);

  const handleLogout = () => {
    clearStoredAuth();
    navigate("/");
  };

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ecf8ff] via-[#f7fcff] to-[#ffffff]">
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
              className="fixed left-0 top-0 z-50 h-screen w-[320px] overflow-hidden border-r border-sky-200/30 bg-gradient-to-b from-[#0b89c9] via-[#0a73b7] to-[#0a5da0] shadow-2xl"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-300/25 blur-xl" />
              <div className="pointer-events-none absolute -left-16 bottom-24 h-52 w-52 rounded-full bg-emerald-300/15 blur-2xl" />

              <div className="relative flex h-full flex-col gap-4 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">{t("dashboard.navTitle")}</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-white">ezeGreen</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNavOpen(false)}
                    className="rounded-lg border border-white/30 bg-white/10 p-1.5 text-white hover:bg-white/20"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
                      {String((userId || "U")[0] ?? "U").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{userId}</p>
                      <p className="truncate text-xs text-white/75">{email}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-white/80" />
                  </div>
                </div>

                <LanguageSelector />

                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-xs text-white/90 backdrop-blur">
                  <p className="truncate"><span className="font-semibold">{t("dashboard.phoneLabel")}:</span> {phone}</p>
                  <p className="truncate"><span className="font-semibold">{t("dashboard.farmLocationLabel")}:</span> {farmLocation}</p>
                </div>

                <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {t("dashboard.deviceSummaryTitle")}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-white/90">
                    <div className="rounded-lg border border-white/20 bg-white/10 p-2 text-center">
                      <p className="font-semibold">{t("dashboard.sensor")}</p>
                      <p className="mt-0.5 text-sm font-bold">{deviceCounts.sensors}</p>
                    </div>
                    <div className="rounded-lg border border-white/20 bg-white/10 p-2 text-center">
                      <p className="font-semibold">{t("dashboard.actuator")}</p>
                      <p className="mt-0.5 text-sm font-bold">{deviceCounts.actuators}</p>
                    </div>
                    <div className="rounded-lg border border-white/20 bg-white/10 p-2 text-center">
                      <p className="font-semibold">{t("dashboard.devices")}</p>
                      <p className="mt-0.5 text-sm font-bold">{deviceCounts.total}</p>
                    </div>
                  </div>
                </div>

                <nav className="space-y-2">
                  <NavLink to="/dashboard" end>
                    {({ isActive }) => (
                      <div
                        className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-medium transition ${
                          isActive ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-white/85 hover:bg-white/10"
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {t("dashboard.homeButton")}
                      </div>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/vataran-planner">
                    {({ isActive }) => (
                      <div
                        className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-medium transition ${
                          isActive ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-white/85 hover:bg-white/10"
                        }`}
                      >
                        <Sprout className="h-4 w-4" />
                        {t("dashboard.vataranPlanner")}
                      </div>
                    )}
                  </NavLink>
                  <NavLink to="/dashboard/sinchai-planner">
                    {({ isActive }) => (
                      <div
                        className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-sm font-medium transition ${
                          isActive ? "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-white/85 hover:bg-white/10"
                        }`}
                      >
                        <Droplets className="h-4 w-4" />
                        {t("dashboard.sinchaiPlanner")}
                      </div>
                    )}
                  </NavLink>
                </nav>

                <div className="flex-1" />

                <Button variant="secondary" className="w-full border border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={handleLogout}>
                  {t("dashboard.logout")}
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 w-full p-3 sm:p-4 md:p-7">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="sticky top-2 z-30 mb-4 rounded-3xl border border-sky-200/70 bg-white/85 px-4 py-4 shadow-[0_10px_35px_-20px_rgba(2,80,130,0.45)] backdrop-blur sm:px-5 sm:py-5 md:top-3 md:mb-6 md:px-8 md:py-9"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setIsNavOpen(true)} aria-label={t("dashboard.navTitle")} className="h-12 w-12 rounded-2xl sm:h-14 sm:w-14">
                <Menu className="h-6 w-6" />
              </Button>
              <div className="flex items-center gap-3 sm:gap-4">
                <img src={logo} alt="EzeBuddies logo" className="h-16 w-16 object-contain sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-sky-700/80 sm:text-sm">EzeBuddies</p>
                  <h1 className="font-display text-2xl font-semibold text-slate-800 sm:text-3xl lg:text-4xl">ezeGreen Suite</h1>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-4 py-2 text-sm font-semibold text-sky-800 sm:px-5 sm:py-2.5 sm:text-base">
                <Sparkles className="h-4 w-4" />
                {pageTitle}
              </div>
              <Button variant="destructive" className="rounded-full px-4 sm:px-5" onClick={handleLogout}>
                {t("dashboard.logout")}
              </Button>
            </div>
          </div>
        </motion.header>

        <div className="relative">
          <div className="pointer-events-none absolute -left-14 -top-12 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
        </div>

        <div className="relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
