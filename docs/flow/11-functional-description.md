# 11-functional-description

Ponizej znajduje sie opis funkcjonalny calego flow projektu, zapisany "slownie" (bez wchodzenia w kod). Dokument obejmuje wszystkie role, moduly i kluczowe scenariusze uzytkownika.

## Cel produktu

System umozliwia salonowi umawianie wizyt online, zarzadzanie grafikiem, klientami, powiadomieniami i magazynem. Klient moze szybko zarezerwowac termin z publicznej strony salonu oraz zarzadzac swoimi wizytami przez bezpieczny link lub panel klienta.

## Role i zakresy odpowiedzialnosci

- Klient: rezerwuje wizyty, przeglada historie, zmienia lub odwoluje wizyty.
- Pracownik (Staff): obsluguje wizyty i pracuje w ramach przydzielonego salonu.
- Wlasciciel (Owner): zarzadza pelna konfiguracja salonu, personelem, uslugami i powiadomieniami.
- Super Admin: nadzoruje wlascicieli i tworzy nowe salony (warstwa administracyjna).

## Glowny flow uzytkownika (publiczna rezerwacja)

1. Klient wchodzi na publiczna strone salonu z linku `/s/{slug}`.
2. System pokazuje informacje salonu (opis, adres, telefon) oraz liste uslug.
3. Klient wybiera usluge, a nastepnie specjaliste (lub opcje "dowolny").
4. System prezentuje kalendarz z dostepnymi terminami, obliczonymi w oparciu o:
   - godziny pracy salonu,
   - wyjatki (np. swieta, zamkniecia),
   - przerwy i bufory czasowe,
   - dostepnosc pracownika,
   - konflikt z innymi wizytami.
5. Klient wybiera date i godzine, podaje dane kontaktowe i potwierdza rezerwacje.
6. System zaklada wizyte, wysyla potwierdzenie SMS i/lub email oraz generuje bezpieczny link do zmiany lub odwolania wizyty.
7. Po rezerwacji klient moze zalozyc konto, aby w przyszlosci rezerwowac szybciej i miec podglad historii.

## Zmiana lub odwolanie wizyty (publiczny link)

1. Klient otwiera bezpieczny link `/cancel/{token}`.
2. System pokazuje szczegoly wizyty i pozwala:
   - odwolac wizyte,
   - zmienic termin na dostepny.
3. Token jest jednorazowy i czasowo ograniczony dla bezpieczenstwa.

## Panel klienta

1. Klient loguje sie przy uzyciu emaila i hasla.
2. Na dashboardzie widzi najblizsza wizyte, historie oraz podpowiedzi szybkiej rezerwacji.
3. W zakladce "Moje wizyty" moze:
   - przegladac nadchodzace i przeszle wizyty,
   - przechodzic do linku zmiany/odwolania.
4. W profilu moze aktualizowac dane i haslo.

## Panel salonu (Owner/Staff)

### Dashboard

Pokazuje dzienne statystyki: liczbe wizyt, oblozenie, odwolania oraz aktywnych klientow.

### Kalendarz

Jest centrum pracy salonu:
- wyswietla wizyty w widoku dnia, tygodnia i miesiaca,
- pozwala dodawac nowe wizyty,
- pozwala edytowac szczegoly, zmieniac statusy i przenosic terminy,
- umozliwia blokowanie terminow dla salonu lub konkretnego pracownika.

### Lista wizyt

Ulatwia operacyjne zarzadzanie:
- filtrowanie po statusie, datach i pracownikach,
- szybka zmiana statusu wizyt,
- wysylka pojedynczych SMS do klientow.

### Klienci

Modul CRM:
- lista klientow i ich historia,
- dodawanie, edycja i dezaktywacja,
- import masowy z pliku CSV,
- eksport listy klientow.

## Ustawienia salonu

### Profil salonu

Wlasciciel moze edytowac nazwe, dane kontaktowe, opis oraz branding (logo, kolor).

### Uslugi

Zarzadzanie oferta:
- dodawanie, edycja, dezaktywacja uslug,
- okreslenie czasu trwania i ceny.

### Pracownicy

Zarzadzanie zespolem:
- tworzenie i edycja pracownikow,
- przypisywanie uslug i roli magazynowej,
- tworzenie kont pracownikow do logowania.

### Godziny i wyjatki

Definicja godzin otwarcia oraz jednorazowych wyjatkow (np. swieta).

### Przerwy i bufory

Konfiguracja:
- przerw w grafiku,
- buforow czasowych przed/po uslugach.

### Grafiki pracownikow

Ustalenie dostepnosci pracownika w tygodniu i wyjatkow dla konkretnych dni.

### Multi-salon

Wlasciciel moze tworzyc dodatkowe salony i przelaczac kontekst pracy.

## Powiadomienia

System wspiera automatyczne powiadomienia:
- potwierdzenie rezerwacji,
- przypomnienia (24h i 2h przed),
- anulowanie,
- wiadomosc po wizycie.

Wlasciciel decyduje, czy powiadomienia ida SMS, email czy oba kanaly, oraz moze edytowac szablony tresci.

## Magazyn

Modul magazynowy obejmuje:
- produkty i stany magazynowe,
- ruchy (przyjecia, wydania, korekty),
- raporty zuzycia,
- ustawienia jednostek i progow minimalnych.

Uprawnienia magazynowe zalezne sa od roli (ADMIN, MANAGER, STAFF).

## Super Admin

Warstwa administracyjna pozwala:
- tworzyc i zarzadzac wlascicielami,
- aktywowac/dezaktywowac konta ownerow.

## Bezpieczenstwo i reguly biznesowe

- Rezerwacje sa weryfikowane pod katem dostepnosci salonu i pracownika.
- Przerwy i bufory blokuja odpowiednie sloty w kalendarzu.
- Linki do zmiany/odwolania sa jednorazowe i wygasaja.
- Dezaktywacje (klient, pracownik, usluga) nie usuwaja danych historycznych.

