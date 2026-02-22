import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmClientPasswordReset, requestClientPasswordReset } from "@/lib/api";

export default function ClientResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setDevToken(null);
    try {
      const res = await requestClientPasswordReset(email);
      setMessage("Jeśli podany email istnieje, wysłaliśmy link do resetu hasła.");
      if (res?.token) setDevToken(res.token);
    } catch (err: any) {
      setMessage(err?.message || "Nie udało się wysłać linku resetu");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage("Hasło musi mieć min. 8 znaków");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Hasła nie są identyczne");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await confirmClientPasswordReset({ token, newPassword });
      setMessage("Hasło zostało zmienione. Możesz się zalogować.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage(err?.message || "Nie udało się zmienić hasła");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/purebooklogo.svg" alt="purebook" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Reset hasła</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {token ? "Ustaw nowe hasło do konta" : "Wyślemy link do zmiany hasła"}
          </p>
        </div>

        {!token && (
          <form className="space-y-4" onSubmit={handleRequest}>
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
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            {devToken && (
              <p className="text-xs text-muted-foreground">
                Token (dev): <span className="font-mono break-all">{devToken}</span>
              </p>
            )}
            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={loading || !email}>
              {loading ? "Wysyłanie..." : "Wyślij link"}
            </Button>
            <Link to="/konto/logowanie" className="text-xs text-muted-foreground text-center block hover:underline">
              Wróć do logowania
            </Link>
          </form>
        )}

        {token && (
          <form className="space-y-4" onSubmit={handleConfirm}>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nowe hasło</label>
              <Input
                type="password"
                placeholder="Min. 8 znaków"
                className="h-12 rounded-xl"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
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
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" size="lg" className="w-full h-14 rounded-2xl text-base" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zmień hasło"}
            </Button>
            <Link to="/konto/logowanie" className="text-xs text-muted-foreground text-center block hover:underline">
              Wróć do logowania
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
