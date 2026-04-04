# Anulowanie / zmiana terminu wizyty z linku (API publiczne, m.in. aplikacja mobilna)

Link z SMS/e-mail ma postać `https://…/cancel/:token` (token bez prefiksu ścieżki API).

**Sam `POST /api/public/cancel/:token` bez treści JSON nie anuluje wizyty.** Wymagana jest dwuetapowa weryfikacja SMS (jak na stronie www).

## Kolejność wywołań

### 1. Szczegóły wizyty (opcjonalnie, do UI)

```http
GET /api/public/cancel/:token
```

Odpowiedź m.in. `appointment`, `verification.phoneMask` (maska numeru).

### 2. Wysłanie kodu SMS

```http
POST /api/public/cancel/:token/request-code
Content-Type: application/json

{}
```

Na numer telefonu klienta z wizyty przychodzi **6-cyfrowy kod** (cyfry 2–9).  
Cooldown ponownej wysyłki: ok. **45 s** (`429` + `verification_code_cooldown` + `retryAfterSeconds`).

### 3. Anulowanie wizyty

```http
POST /api/public/cancel/:token
Content-Type: application/json

{"code":"123456"}
```

`code` — dokładnie kod z SMS (6 znaków).  
Bez wcześniejszego kroku 2 odpowiedź to `400` + `error: "verification_code_required"` oraz pole `message` z opisem.

### 4. Zmiana terminu (zamiast anulowania)

```http
POST /api/public/cancel/:token/reschedule
Content-Type: application/json

{"date":"2026-04-15","time":"14:00","code":"123456"}
```

Ten sam kod SMS co przy anulowaniu (po kroku 2).

---

## Typowe błędy

| `error` | Znaczenie |
|--------|-----------|
| `verification_code_required` | Brak `{"code":…}` w body **albo** nie wywołano wcześniej `request-code` |
| `verification_code_invalid` | Zły kod |
| `verification_code_expired` | Kod wygasł — ponów `request-code` |
| `verification_too_many_attempts` | Za dużo błędnych prób |
| `verification_code_cooldown` | Za szybko ponowna wysyłka SMS (`retryAfterSeconds`) |

---

*Baza URL produkcyjna: `https://honly.pl/api/public` (dostosuj do środowiska).*
