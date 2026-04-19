import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { saveAuthFromLogin } from "@/lib/auth";
import { useLanguage } from "@/lib/language";
import { LanguageSelector } from "@/components/LanguageSelector";
import logoImg from "@/assets/devices/logo.png";

export function Header() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [forgotUserId, setForgotUserId] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginSubmitting(true);

    const loginApiUrl = import.meta.env.VITE_LOGIN_API_URL;
    if (!loginApiUrl) {
      toast({
        title: t("toast.loginApiNotConfigured.title"),
        description: t("toast.loginApiNotConfigured.description"),
        variant: "destructive",
      });
      setIsLoginSubmitting(false);
      return;
    }

    try {
      const response = await fetch(loginApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: username,
          password,
        }),
      });

      let responseData: unknown = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (!response.ok) {
        throw new Error(
          typeof responseData === "object" && responseData !== null
            ? JSON.stringify(responseData)
            : `Login failed with status ${response.status}`,
        );
      }

      const safeResponse = (responseData ?? {}) as Record<string, unknown>;
      saveAuthFromLogin(safeResponse);
      setPassword("");
      setLoginOpen(false);
      navigate("/dashboard");
      toast({
        title: t("toast.loginSuccess.title"),
        description: t("toast.loginSuccess.description"),
      });
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: t("toast.loginFailed.title"),
        description: t("toast.loginFailed.description"),
        variant: "destructive",
      });
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = forgotUserId.trim();
    const email = forgotEmail.trim();

    if (!userId && !email) {
      toast({
        title: t("toast.forgotMissing.title"),
        description: t("toast.forgotMissing.description"),
        variant: "destructive",
      });
      return;
    }

    setIsForgotSubmitting(true);

    const forgotApiUrl = import.meta.env.VITE_FORGOT_PASSWORD_API_URL || "https://api.ezebuddies.com/forgot-password";

    const postForgot = async (payload: Record<string, string>) => {
      const response = await fetch(forgotApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let responseData: unknown = null;
      try {
        responseData = rawText ? JSON.parse(rawText) : null;
      } catch {
        responseData = rawText || null;
      }

      return { response, responseData, rawText };
    };

    try {
      let result;
      if (userId) {
        // Retry with common backend key variants for user identifier.
        const candidatePayloads: Array<Record<string, string>> = [
          { user_id: userId },
          { username: userId },
          { userId: userId },
        ];

        for (const payload of candidatePayloads) {
          result = await postForgot(payload);
          if (result.response.ok) break;
        }
      } else {
        result = await postForgot({ email });
      }

      if (!result || !result.response.ok) {
        const responseData = result?.responseData;
        const detailFromObject =
          typeof responseData === "object" &&
          responseData !== null &&
          "detail" in responseData &&
          typeof (responseData as { detail?: unknown }).detail === "string"
            ? (responseData as { detail: string }).detail
            : null;
        const messageFromObject =
          typeof responseData === "object" &&
          responseData !== null &&
          "message" in responseData &&
          typeof (responseData as { message?: unknown }).message === "string"
            ? (responseData as { message: string }).message
            : null;
        const detailFromString = typeof responseData === "string" ? responseData : null;
        const detail =
          detailFromObject ||
          messageFromObject ||
          detailFromString ||
          `Forgot password request failed (${result?.response.status ?? "unknown"}).`;
        throw new Error(detail);
      }

      toast({
        title: t("toast.forgotSuccess.title"),
        description: t("toast.forgotSuccess.description"),
      });
      setForgotUserId("");
      setForgotEmail("");
      setForgotOpen(false);
    } catch (error) {
      console.error("Forgot password failed:", error);
      const errorMessage =
        error instanceof TypeError
          ? t("toast.forgotNetwork.description")
          : error instanceof Error
            ? error.message
            : t("toast.forgotFallback.description");
      toast({
        title: t("toast.forgotFailed.title"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t("header.home"), href: "#home" },
    { name: t("header.useCases"), href: "#use-cases" },
    { name: t("header.products"), href: "#products" },
    { name: t("header.aboutUs"), href: "#about" },
    { name: t("header.solutions"), href: "#solutions" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-card/90 backdrop-blur-xl shadow-lg border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between h-20">
          {/* Logo */}
          <motion.a
            href="#home"
            className="flex items-center gap-3 group"
            whileHover={{ scale: 1.02 }}
          >
            <img
              src={logoImg}
              alt="Logo"
              className="w-20 h-20 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display font-bold text-xl text-foreground">
              EzeBuddies
            </span>
          </motion.a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <motion.a
                key={link.name}
                href={link.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative font-medium text-muted-foreground hover:text-foreground transition-colors group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full transition-all duration-300 group-hover:w-full" />
              </motion.a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector />
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@ezebuddies.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("header.talkToSales")}
              </a>
            </Button>
            <Button variant="hero" size="lg" onClick={() => setLoginOpen(true)}>
              {t("header.login")}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border"
          >
            <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="font-medium text-foreground py-2 hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 mt-4">
                <LanguageSelector />
                <Button variant="outline" size="lg" asChild>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@ezebuddies.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("header.talkToSales")}
                  </a>
                </Button>
                <Button variant="hero" size="lg" onClick={() => setLoginOpen(true)}>
                  {t("header.login")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t("login.title")}</DialogTitle>
            <DialogDescription>{t("login.description")}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="login-username">{t("login.username")}</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("login.usernamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t("login.password")}</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  className="pr-11"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <span className="inline-flex items-center gap-1">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? "Hide" : "Show"}
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => {
                setLoginOpen(false);
                setForgotOpen(true);
              }}
            >
              {t("login.forgotPassword")}
            </button>
            <Button type="submit" className="w-full" disabled={isLoginSubmitting}>
              {isLoginSubmitting ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t("forgot.title")}</DialogTitle>
            <DialogDescription>
              {t("forgot.description")}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleForgotSubmit}>
            <div className="space-y-2">
              <Label htmlFor="forgot-user-id">{t("forgot.userId")}</Label>
              <Input
                id="forgot-user-id"
                value={forgotUserId}
                onChange={(e) => setForgotUserId(e.target.value)}
                placeholder={t("forgot.userIdPlaceholder")}
              />
            </div>
            
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">{t("forgot.email")}</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t("forgot.emailPlaceholder")}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("forgot.helperText")}</p>
            <Button type="submit" className="w-full" disabled={isForgotSubmitting}>
              {isForgotSubmitting ? t("forgot.submitting") : t("forgot.submit")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
