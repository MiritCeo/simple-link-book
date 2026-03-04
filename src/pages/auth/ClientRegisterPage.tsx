import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerClientFromBooking } from "@/lib/api";

export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/purebooklogo.svg" alt="purebook" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Rejestracja klienta</h1>
          <p className="text-sm text-muted-foreground mt-1">Podaj kod z SMS lub linku rezerwacji.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kod / token</label>
            <Input
              type="text"
              placeholder="Wklej kod z SMS"
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
          <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={() => navigate(-1)}>
            Wróć
          </Button>
        </form>
      </div>
    </div>
  );
}
