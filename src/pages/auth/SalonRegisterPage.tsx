import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, BadgeCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSalon } from "@/lib/api";
import AuthSplitLayout from "./AuthSplitLayout";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[ąćęłńóśżź]/g, (ch) => ({ ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ż: "z", ź: "z" }[ch] || ch))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function SalonRegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("");
  const [salonSlug, setSalonSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const slugPreview = useMemo(() => slugify(salonSlug || salonName), [salonSlug, salonName]);
  const canSubmit =
    !loading &&
    privacyAccepted &&
    email.length > 3 &&
    phone.trim().length >= 6 &&
    password.length >= 8 &&
    salonName.trim().length >= 2 &&
    slugPreview.length >= 2;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await registerSalon({
        email: email.trim(),
        phone: phone.trim(),
        password,
        salonName: salonName.trim(),
        salonSlug: slugPreview,
        privacyAccepted: true,
      });
      setSubmittedEmail(email.trim());
    } catch (err: any) {
      const code = err?.message;
      if (code === "email_taken") setError("Ten adres e-mail jest już zajęty.");
      else if (code === "privacy_required") setError("Musisz zaakceptować politykę prywatności.");
      else setError(err?.message || "Nie udało się utworzyć konta salonu.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <AuthSplitLayout
        eyebrow="Wniosek wysłany"
        title="Dziękujemy za zgłoszenie do testów."
        subtitle="Sprawdzimy dane i aktywujemy konto, gdy tylko zatwierdzi je Super Administrator."
        points={[
          "Po aktywacji wyślemy potwierdzenie na Twój e-mail.",
          "Po otrzymaniu wiadomości zalogujesz się od razu do panelu.",
          "W razie pytań nasz zespół pomoże we wdrożeniu.",
        ]}
      >
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-4">
          <p className="text-sm font-semibold">Zgłoszenie przyjęte</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Konto dla <span className="font-medium text-foreground">{submittedEmail}</span> oczekuje na aktywację.
          </p>
          <Button className="mt-4 w-full rounded-xl" onClick={() => navigate("/login", { state: { prefilledEmail: submittedEmail } })}>
            Przejdź do logowania
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      eyebrow="Wersja testowa"
      title="Dołącz do testów honly dla salonów."
      subtitle="Udostępniamy platformę etapami — teraz dla wybranych salonów beauty."
      points={[
        "Pełny panel: kalendarz, klienci, usługi i powiadomienia.",
        "Szybkie wdrożenie i wsparcie przy starcie.",
        "Możesz zacząć działać od razu po rejestracji.",
      ]}
    >
      <div className="text-center mb-7">
        <img src="/happlogo.svg?v=20260324" alt="honly" className="w-12 h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Rejestracja salonu</h1>
        <p className="text-sm text-muted-foreground mt-1">Załóż konto właściciela i uruchom swój panel.</p>
      </div>

      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Aktualnie to wersja testowa dostępna dla wybranych salonów. Jeśli masz zaproszenie, możesz kontynuować rejestrację.
          </p>
        </div>
      </div>

      <form className="space-y-3.5" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Nazwa salonu</label>
          <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} className="h-11 rounded-xl" placeholder="Np. Studio Bella" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Adres e-mail</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" placeholder="kontakt@twojsalon.pl" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Telefon</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" placeholder="+48 500 000 000" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Hasło</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" placeholder="Minimum 8 znaków" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Adres panelu (slug)</label>
          <Input value={salonSlug} onChange={(e) => setSalonSlug(e.target.value)} className="h-11 rounded-xl" placeholder="studio-bella" />
          <p className="mt-1 text-[11px] text-muted-foreground">Podgląd: /s/{slugPreview || "nazwa-salonu"}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer text-left rounded-xl border border-border bg-muted/30 px-3 py-3">
          <Checkbox
            id="privacy-salon-register"
            checked={privacyAccepted}
            onCheckedChange={(v) => setPrivacyAccepted(v === true)}
            className="mt-0.5"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Oświadczam, że zapoznałem(-am) się z{' '}
            <Link to="/polityka-prywatnosci" className="text-primary font-medium underline underline-offset-2">
              polityką prywatności
            </Link>{' '}
            i akceptuję przetwarzanie moich danych osobowych w zakresie niezbędnym do założenia konta właściciela salonu i
            korzystania z usługi Honly.
          </span>
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full h-12 rounded-xl" disabled={!canSubmit}>
          {loading ? "Tworzenie konta..." : "Załóż konto salonu"}
        </Button>

        <div className="pt-1 text-center space-y-1">
          <Link to="/login" className="text-xs text-muted-foreground hover:underline block">
            Masz już konto? Zaloguj się
          </Link>
          <Link to="/polityka-prywatnosci" className="text-xs text-muted-foreground hover:underline block">
            Polityka prywatności
          </Link>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/[0.05] px-3 py-2.5 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Priorytetowo aktywujemy salony, które chcą testować kalendarz i rezerwacje online z klientami.
          </p>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
