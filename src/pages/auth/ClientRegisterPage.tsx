import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clientRegisterSessionPhone,
  clientRegisterSessionResendCode,
  clientRegisterSessionStart,
  clientRegisterSessionVerify,
} from "@/lib/api";

function registerFlowError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const map: Record<string, string> = {
    invalid_payload: "Nieprawidłowe dane.",
    password_mismatch: "Hasła muszą być identyczne.",
    email_taken: "Konto klienta z tym adresem e-mail już istnieje.",
    session_not_found: "Sesja wygasła lub jest nieprawidłowa — zacznij od początku.",
    session_expired: "Sesja wygasła — zacznij rejestrację od początku.",
    invalid_phone: "Nieprawidłowy numer telefonu.",
    phone_not_set: "Najpierw podaj numer telefonu.",
    invalid_code: "Nieprawidłowy kod.",
    code_expired: "Kod wygasł — wyślij nowy.",
    too_many_attempts: "Za dużo nieudanych prób — wyślij nowy kod.",
    phone_linked_other_account: "Ten numer jest już powiązany z innym kontem klienta.",
    internal_error: "Błąd serwera. Spróbuj ponownie później.",
  };
  return map[msg] ?? msg;
}

export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [linkedSalonUser, setLinkedSalonUser] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const formatPhonePL = (input: string) => {
    const digits = input.replace(/\D/g, "");
    const withCountry = digits.startsWith("48") ? digits : `48${digits}`;
    const limited = withCountry.slice(0, 11);
    const rest = limited.slice(2);
    const parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)].filter(Boolean);
    return `+48 ${parts.join(" ")}`.trim();
  };

  const isValidPhonePL = (value: string) => /^\+48\s?\d{3}\s?\d{3}\s?\d{3}$/.test(value);

  const onStep1 = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || password !== confirmPassword) {
      setError("Hasło min. 8 znaków i oba pola muszą być zgodne.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await clientRegisterSessionStart({ email: email.trim(), password, confirmPassword });
      setSessionToken(res.sessionToken);
      setLinkedSalonUser(res.linkedSalonUser);
      setStep(2);
      if (res.linkedSalonUser) {
        setInfo(
          "Ten adres e-mail jest już używany w panelu salonu. Po rejestracji możesz w ustawieniach konta klienta przejść do logowania do panelu salonu.",
        );
      }
    } catch (err) {
      setError(registerFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  const onStep2 = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionToken || !isValidPhonePL(phone)) {
      setError("Podaj numer w formacie +48 123 456 789.");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await clientRegisterSessionPhone({ sessionToken, phone });
      setStep(3);
      setInfo("Wysłaliśmy 6-znakowy kod SMS. Wpisz go poniżej.");
    } catch (err) {
      setError(registerFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  const onStep3 = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionToken || code.trim().length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const res = await clientRegisterSessionVerify({ sessionToken, code: code.trim() });
      localStorage.setItem("client_token", res.token);
      localStorage.setItem("client_id", res.clientId);
      localStorage.setItem("client_salon_id", res.salonId);
      if (res.salons?.length) localStorage.setItem("client_salons", JSON.stringify(res.salons));
      navigate("/konto");
    } catch (err) {
      setError(registerFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  const onResendSessionCode = async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      await clientRegisterSessionResendCode({ sessionToken });
      setInfo("Wysłaliśmy nowy kod SMS.");
    } catch (err) {
      setError(registerFlowError(err));
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(1);
    setSessionToken(null);
    setLinkedSalonUser(false);
    setCode("");
    setPhone("");
    setError(null);
    setInfo(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/happlogo.svg?v=20260324" alt="honly" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Rejestracja klienta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 && "Krok 1 z 3 — dane logowania"}
            {step === 2 && "Krok 2 z 3 — numer telefonu"}
            {step === 3 && "Krok 3 z 3 — potwierdzenie numeru"}
          </p>
          <div className="flex justify-center gap-1.5 mt-3">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <form className="space-y-4" onSubmit={onStep1}>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-mail</label>
              <Input
                type="email"
                required
                autoComplete="email"
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
                required
                autoComplete="new-password"
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
                required
                autoComplete="new-password"
                placeholder="Powtórz hasło"
                className="h-12 rounded-xl"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={loading}>
              {loading ? "Zapisywanie…" : "Dalej"}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={onStep2}>
            {linkedSalonUser && (
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2 border border-border">
                Masz już konto w panelu salonu z tym e-mailem. To konto klienta jest osobne — po zalogowaniu możesz w profilu przejść do panelu salonu.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Podaj ten sam numer, którego używasz przy rezerwacjach — po weryfikacji automatycznie połączymy Twoje wizyty i salony.
            </p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Numer telefonu</label>
              <Input
                type="tel"
                required
                autoComplete="tel"
                placeholder="+48 123 456 789"
                className="h-12 rounded-xl"
                value={phone}
                onChange={e => setPhone(formatPhonePL(e.target.value))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-xs text-muted-foreground">{info}</p>}
            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={loading}>
              {loading ? "Wysyłanie kodu…" : "Wyślij kod SMS"}
            </Button>
            <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={restart}>
              Wróć
            </Button>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-4" onSubmit={onStep3}>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kod (6 znaków)</label>
              <Input
                type="text"
                required
                autoComplete="one-time-code"
                placeholder="np. A2B4X9"
                className="h-12 rounded-xl uppercase tracking-widest font-mono text-center text-lg"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Kod otrzymasz SMS-em na podany numer telefonu.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-xs text-muted-foreground">{info}</p>}
            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={loading || code.trim().length < 4}>
              {loading ? "Tworzenie konta…" : "Utwórz konto"}
            </Button>
            <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={onResendSessionCode} disabled={loading}>
              Wyślij kod ponownie
            </Button>
            <Button type="button" variant="ghost" className="w-full h-11 rounded-2xl text-muted-foreground" onClick={() => setStep(2)}>
              Zmień numer telefonu
            </Button>
          </form>
        )}

        <Link to="/konto/logowanie" className="text-xs text-muted-foreground text-center block hover:underline mt-8">
          Masz już konto? Zaloguj się
        </Link>
      </div>
    </div>
  );
}
