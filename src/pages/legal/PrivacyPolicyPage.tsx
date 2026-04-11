import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageTransition } from '@/components/motion';

const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') || 'https://honly.app';

export type PrivacyPolicyLocationState = { from?: string };

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as PrivacyPolicyLocationState | null)?.from;

  const handleBack = () => {
    if (typeof from === 'string' && from.startsWith('/')) {
      navigate(from, { replace: false });
      return;
    }
    navigate(-1);
  };

  return (
    <PageTransition className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć
          </button>
          <Link
            to="/konto/logowanie"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Logowanie klienta
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-2xl px-4 py-8 pb-16 sm:px-6">
        <div className="prose prose-sm max-w-none dark:prose-invert">
        <h1 className="text-2xl font-bold text-foreground mb-2">Polityka prywatności</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Usługa <strong className="text-foreground">Honly</strong> (aplikacja i strona internetowa). Ostatnia aktualizacja:{' '}
          3 kwietnia 2026 r.
        </p>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">1. Administrator danych</h2>
          <p className="text-muted-foreground leading-relaxed">
            Administratorem danych osobowych w rozumieniu RODO jest{' '}
            <strong className="text-foreground">
              MIRIT SOFTWARE HOUSE SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
            </strong>
            , wpisana do{' '}
            <strong className="text-foreground">Krajowego Rejestru Sądowego pod numerem KRS 0000996483</strong>, posiadająca
            numery <strong className="text-foreground">NIP 6080121713</strong> oraz{' '}
            <strong className="text-foreground">REGON 523373992</strong>, z siedzibą przy ul. Edwarda Horoszkiewicza 1,
            63-300 Pleszew, Polska, prowadząca serwis <strong className="text-foreground">Honly</strong>. W treści niniejszej
            polityki „my” oznacza administratora danych.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            W sprawach związanych z ochroną danych osobowych możesz kontaktować się z nami pod adresem:{' '}
            <a href="mailto:rodo@honly.app.pl" className="text-primary font-medium underline underline-offset-2">
              rodo@honly.app.pl
            </a>
            .
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">2. Zakres i cel przetwarzania</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
            <li>
              <strong className="text-foreground">Konto użytkownika aplikacji (klient)</strong> — e-mail, hasło (w formie
              hash), opcjonalnie logowanie społecznościowe, numer telefonu oraz imię i nazwisko w profilu: w celu
              świadczenia usługi (logowanie, rezerwacje, powiadomienia, ulubione salony, oceny wizyt).
            </li>
            <li>
              <strong className="text-foreground">Konto właściciela / personelu salonu (panel)</strong> — e-mail, telefon,
              hasło (hash), dane salonu i powiązane informacje biznesowe w systemie: w celu świadczenia usługi Honly dla
              salonu (kalendarz, CRM, powiadomienia, magazyn itd.).
            </li>
            <li>
              <strong className="text-foreground">Rezerwacje i wizyty</strong> — dane niezbędne do umówienia i realizacji
              wizyty u wybranego salonu (m.in. identyfikacja w systemie salonu).
            </li>
            <li>
              <strong className="text-foreground">Powiadomienia</strong> — SMS, e-mail lub powiadomienia push (jeśli
              wyrazisz zgodę / jeśli są niezbędne do wykonania umowy): przypomnienia, status rezerwacji, komunikaty
              techniczne.
            </li>
            <li>
              <strong className="text-foreground">Dane techniczne i analityka</strong> — m.in. adres IP, typ urządzenia,
              logi serwera w zakresie niezbędnym do zapewnienia bezpieczeństwa i działania usługi.
            </li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">3. Podstawy prawne</h2>
          <p className="text-muted-foreground leading-relaxed">
            Przetwarzanie odbywa się w szczególności na podstawie: wykonania umowy o świadczenie usług (art. 6 ust. 1 lit.
            b RODO), prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f), np. bezpieczeństwo IT i
            analityka zagregowana, oraz — w wypadkach wymaganych — zgody (art. 6 ust. 1 lit. a RODO).
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">4. Odbiorcy danych</h2>
          <p className="text-muted-foreground leading-relaxed">
            Dane niezbędne do realizacji wizyty są przekazywane <strong className="text-foreground">wybranemu salonowi</strong>{' '}
            korzystającemu z systemu. Możemy powierzać przetwarzanie podmiotom wspierającym hosting, wysyłkę wiadomości
            (np. SMS/e-mail), infrastrukturę powiadomień push — wyłącznie w zakresie niezbędnym i na podstawie umów
            powierzenia, o ile ma to zastosowanie.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">5. Okres przechowywania</h2>
          <p className="text-muted-foreground leading-relaxed">
            Dane przechowujemy przez czas posiadania konta i realizacji usługi, a następnie przez okres wymagany przepisami
            lub uzasadniony prawnie uzasadnionym interesem (np. obrona roszczeń). Po usunięciu konta w aplikacji klienckiej
            usuwamy lub anonimizujemy dane zgodnie z opisem w sekcji „Prawa osób”.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">6. Prawa osób, których dane dotyczą</h2>
          <p className="text-muted-foreground leading-relaxed">
            Przysługuje Ci m.in. prawo dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzenia, przenoszenia
            danych oraz wniesienia sprzeciwu — w granicach i na zasadach określonych w RODO. W sprawach ochrony danych
            możesz napisać na adres{' '}
            <a href="mailto:rodo@honly.app.pl" className="text-primary underline underline-offset-2">
              rodo@honly.app.pl
            </a>
            . Przysługuje Ci skarga do Prezesa Urzędu Ochrony Danych Osobowych
            (UODO).
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Usunięcie konta w aplikacji</strong> możesz zainicjować w ustawieniach
            konta (strona:{' '}
            <Link to="/konto/usun-konto" state={{ from: location.pathname }} className="text-primary underline underline-offset-2">
              {publicAppUrl}/konto/usun-konto
            </Link>
            ) po zalogowaniu. Po potwierdzeniu usuwane są dane logowania i powiązane z kontem rekordy w aplikacji (m.in.
            ulubione, oceny, tokeny powiadomień). W celu zachowania prawidłowej historii wizyt u salonów, dane widoczne w
            systemie salonu mogą zostać <strong className="text-foreground">zanonimizowane</strong> (bez możliwości
            powiązania z Tobą), zamiast całkowitego usunięcia wpisów biznesowych — zgodnie z obowiązującym prawem i
            umową z salonem.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">7. Pliki cookies i podobne technologie</h2>
          <p className="text-muted-foreground leading-relaxed">
            Serwis może wykorzystywać pliki cookies niezbędne do działania sesji i preferencji. Szczegóły mogą być
            doprecyzowane w banerze cookies na stronie, jeśli jest wyświetlany.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-foreground">8. Zmiany polityki</h2>
          <p className="text-muted-foreground leading-relaxed">
            Zastrzegamy sobie prawo do aktualizacji niniejszej polityki. O istotnych zmianach możemy poinformować w
            aplikacji lub na stronie. Aktualna wersja jest zawsze dostępna pod tym adresem.
          </p>
        </section>
        </div>
      </article>
    </PageTransition>
  );
}
