import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { saveAuthFromLogin } from "@/lib/auth";
import logoImg from "@/assets/devices/logo.png";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Use-cases", href: "#use-cases" },
  { name: "Products", href: "#products" },
  { name: "About Us", href: "#about" },
  { name: "Solutions", href: "#solutions" },
];

export function Header() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginSubmitting(true);

    const loginApiUrl = import.meta.env.VITE_LOGIN_API_URL;
    if (!loginApiUrl) {
      toast({
        title: "Login API not configured",
        description: "Set VITE_LOGIN_API_URL in your environment file.",
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
        title: "Login successful",
        description: "Welcome. Redirecting to dashboard.",
      });
    } catch (error) {
      console.error("Login failed:", error);
      toast({
        title: "Login failed",
        description: "Please check username/password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@ezebuddies.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to Sales
              </a>
            </Button>
            <Button variant="hero" size="lg" onClick={() => setLoginOpen(true)}>
              Login
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
                <Button variant="outline" size="lg" asChild>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@ezebuddies.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Talk to Sales
                  </a>
                </Button>
                <Button variant="hero" size="lg" onClick={() => setLoginOpen(true)}>
                  Login
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Login</DialogTitle>
            <DialogDescription>Enter your username and password.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit}
          >
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoginSubmitting}>
              {isLoginSubmitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.header>
  );
}
