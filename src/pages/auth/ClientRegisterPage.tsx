import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerClientFromBooking, resendClientRegistrationCode } from "@/lib/api";

export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendPhone, setResendPhone] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);

  const canSubmit = token.length >= 10 && password.length >= 8 && password === confirmPassword && !loading;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await registerClientFromBooking({
        token,
        email: email || undefined,
        password,
      });
      localStorage.setItem("client_token", res.token);
      localStorage.setItem("client_id", res.clientId);
      localStorage.setItem("client_salon_id", res.salonId);
      navigate("/konto");
    } catch (err: any) {
      setError(err?.message || "Nie udało się utworzyć konta");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!resendPhone.trim() && !resendEmail.trim()) return;
    setResendLoading(true);
    setResendInfo(null);
    try {
      await resendClientRegistrationCode({
        phone: resendPhone.trim() || undefined,
        email: resendEmail.trim() || undefined,
      });
      setResendInfo("Jeśli znaleźliśmy rezerwację, wysłaliśmy kod SMS i/lub email.");
    } catch (err: any) {
      setResendInfo(err?.message || "Nie udało się wysłać kodu");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/honlylogo.svg?v=20260318" alt="honly" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Rejestracja klienta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Po rezerwacji wyślemy SMS i email z kodem lub linkiem do rejestracji.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kod / link z SMS lub emaila</label>
            <Input
              type="text"
              placeholder="Wklej kod lub link"
              className="h-12 rounded-xl"
              value={token}
              onChange={e => setToken(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email (opcjonalnie)</label>
            <Input
              type="email"
              placeholder="email@example.com"
              className="h-12 rounded-xl"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Hasło</label>
            <Input
              type="password"
              placeholder="Min. 8 znaków"
              className="h-12 rounded-xl"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Powtórz hasło</label>
            <Input
              type="password"
              placeholder="Powtórz hasło"
              className="h-12 rounded-xl"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={!canSubmit}>
            {loading ? "Rejestracja..." : "Utwórz konto"}
          </Button>
          <Link to="/konto/logowanie" className="text-xs text-muted-foreground text-center block hover:underline">
            Masz już konto? Zaloguj się
          </Link>
          <div className="border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-medium">Nie masz kodu?</p>
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder="Telefon z rezerwacji (SMS)"
                className="h-11 rounded-xl"
                value={resendPhone}
                onChange={e => setResendPhone(e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email z rezerwacji (opcjonalnie)"
                className="h-11 rounded-xl"
                value={resendEmail}
                onChange={e => setResendEmail(e.target.value)}
              />
            </div>
            {resendInfo && <p className="text-xs text-muted-foreground">{resendInfo}</p>}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl"
              disabled={resendLoading || (!resendPhone.trim() && !resendEmail.trim())}
              onClick={onResend}
            >
              {resendLoading ? "Wysyłam..." : "Wyślij kod ponownie"}
            </Button>
          </div>
          <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={() => navigate(-1)}>
            Wróć
          </Button>
        </form>
      </div>
    </div>
  );
}


