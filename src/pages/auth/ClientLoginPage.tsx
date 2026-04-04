import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientLogin } from "@/lib/api";
import AuthSplitLayout from "./AuthSplitLayout";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.length > 3 && password.length >= 8 && !loading;

  const backBeforeClientLogin = (location.state as { backBeforeClientLogin?: string } | null)?.backBeforeClientLogin;

  const handleBack = () => {
    if (typeof backBeforeClientLogin === "string" && backBeforeClientLogin.startsWith("/")) {
      navigate(backBeforeClientLogin);
      return;
    }
    navigate(-1);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await clientLogin(email, password);
      navigate("/konto");
    } catch (err: any) {
      setError(err?.message || "Nie udało się zalogować");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Konto klienta"
      title="Twoje wizyty zawsze pod ręką."
      subtitle="Logujesz się raz i zarządzasz terminami, ulubionymi salonami oraz historią wizyt."
      points={[
        'Szybkie umawianie kolejnych wizyt',
        'Podgląd i zmiana terminów w kilku kliknięciach',
        'Wszystkie ulubione salony i wizyty w jednym koncie',
      ]}
    >
      <div className="text-center mb-8">
        <img src="/happlogo.svg?v=20260324" alt="honly" className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Logowanie klienta</h1>
        <p className="text-sm text-muted-foreground mt-1">Zaloguj się, aby zobaczyć swoje wizyty.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
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
            placeholder="••••••••"
            className="h-12 rounded-xl"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={!canSubmit}>
          {loading ? "Logowanie..." : "Zaloguj się"}
        </Button>
        <Link to="/konto/rejestracja" className="text-xs text-muted-foreground text-center block hover:underline">
          Nie masz konta? Zarejestruj się
        </Link>
        <Link to="/konto/reset-hasla" className="text-xs text-muted-foreground text-center block hover:underline">
          Nie pamiętasz hasła?
        </Link>
        <Link
          to="/polityka-prywatnosci"
          state={{ from: location.pathname }}
          className="text-xs text-muted-foreground text-center block hover:underline"
        >
          Polityka prywatności
        </Link>
        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={handleBack}>
            Wróć
          </Button>
          <Button type="button" variant="ghost" className="w-full h-10 rounded-2xl text-xs text-muted-foreground" onClick={() => navigate("/login")}>
            Logowanie do panelu salonu (właściciel / personel)
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}


