import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientLogin } from "@/lib/api";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.length > 3 && password.length >= 8 && !loading;

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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/purebooklogo.svg" alt="purebook" className="w-12 h-12 mx-auto mb-4" />
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
          <Link to="/konto/reset-hasla" className="text-xs text-muted-foreground text-center block hover:underline">
            Nie pamiętasz hasła?
          </Link>
          <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" onClick={() => navigate(-1)}>
            Wróć
          </Button>
        </form>
      </div>
    </div>
  );
}
