import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

dotenv.config();

async function seed() {
  const salon = await prisma.salon.upsert({
    where: { slug: "studio-bella" },
    update: {},
    create: {
      slug: "studio-bella",
      name: "Studio Bella",
      address: "ul. Kwiatowa 15, Warszawa",
      phone: "+48 500 123 456",
      hours: "Pon-Pt 9:00-20:00, Sob 9:00-16:00",
      description: "Profesjonalny salon fryzjerski i kosmetyczny w sercu Warszawy.",
      accentColor: "#111827",
    },
  });

  const existingHours = await prisma.salonHour.count({ where: { salonId: salon.id } });
  if (existingHours === 0) {
    await prisma.salonHour.createMany({
      data: [
        { salonId: salon.id, weekday: 0, open: "09:00", close: "20:00", active: true },
        { salonId: salon.id, weekday: 1, open: "09:00", close: "20:00", active: true },
        { salonId: salon.id, weekday: 2, open: "09:00", close: "20:00", active: true },
        { salonId: salon.id, weekday: 3, open: "09:00", close: "20:00", active: true },
        { salonId: salon.id, weekday: 4, open: "09:00", close: "20:00", active: true },
        { salonId: salon.id, weekday: 5, open: "09:00", close: "16:00", active: true },
        { salonId: salon.id, weekday: 6, open: "", close: "", active: false },
      ],
    });
  }

  const existingExceptions = await prisma.salonException.count({ where: { salonId: salon.id } });
  if (existingExceptions === 0) {
    await prisma.salonException.createMany({
      data: [
        { salonId: salon.id, date: "2026-03-01", label: "Skrócony dzień", start: "10:00", end: "14:00", closed: false },
        { salonId: salon.id, date: "2026-03-05", label: "Zamknięte", closed: true },
      ],
    });
  }

  const existingBreaks = await prisma.salonBreak.count({ where: { salonId: salon.id } });
  if (existingBreaks === 0) {
    await prisma.salonBreak.createMany({
      data: [
        { salonId: salon.id, type: "BREAK", label: "Przerwa obiadowa", days: "Pn–Pt", start: "13:00", end: "14:00" },
        { salonId: salon.id, type: "BREAK", label: "Przerwa techniczna", days: "Sob", start: "12:30", end: "13:00" },
        { salonId: salon.id, type: "BUFFER", label: "Bufor po wizycie", minutes: 10 },
        { salonId: salon.id, type: "BUFFER", label: "Bufor przed wizytą", minutes: 5 },
      ],
    });
  }

  const ownerEmail = process.env.SEED_OWNER_EMAIL || "admin@purebook.pl";
  const ownerPhone = process.env.SEED_OWNER_PHONE || "+48 500 000 000";
  const ownerPass = process.env.SEED_OWNER_PASSWORD || "Password123!";
  const passwordHash = await bcrypt.hash(ownerPass, 10);

  const superEmail = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@purebook.pl";
  const superPhone = process.env.SEED_SUPERADMIN_PHONE || "+48 500 000 999";
  const superPass = process.env.SEED_SUPERADMIN_PASSWORD || "SuperAdmin123!";
  const superHash = await bcrypt.hash(superPass, 10);

  await prisma.user.upsert({
    where: { email: superEmail },
    update: { role: "SUPER_ADMIN", active: true, phone: superPhone },
    create: {
      email: superEmail,
      phone: superPhone,
      passwordHash: superHash,
      role: "SUPER_ADMIN",
      active: true,
      salonId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      phone: ownerPhone,
      passwordHash,
      role: "OWNER",
      salonId: salon.id,
    },
  });
  const ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (ownerUser) {
    await prisma.userSalon.upsert({
      where: { userId_salonId: { userId: ownerUser.id, salonId: salon.id } },
      update: { role: "OWNER" },
      create: { userId: ownerUser.id, salonId: salon.id, role: "OWNER" },
    });
  }

  const services = [
    { name: "Strzyżenie damskie", category: "Fryzjerstwo", duration: 45, price: 120, description: "Konsultacja, mycie, strzyżenie, stylizacja" },
    { name: "Strzyżenie męskie", category: "Fryzjerstwo", duration: 30, price: 70, description: "Strzyżenie maszynką lub nożyczkami" },
    { name: "Koloryzacja", category: "Fryzjerstwo", duration: 120, price: 250, description: "Farbowanie całych włosów" },
    { name: "Balayage", category: "Fryzjerstwo", duration: 180, price: 450, description: "Naturalne rozjaśnienie z efektem sun-kissed" },
    { name: "Manicure hybrydowy", category: "Paznokcie", duration: 60, price: 100, description: "Opracowanie + lakier hybrydowy" },
    { name: "Pedicure", category: "Paznokcie", duration: 75, price: 130, description: "Pedicure klasyczny z malowaniem" },
    { name: "Henna brwi i rzęs", category: "Brwi i rzęsy", duration: 30, price: 60 },
    { name: "Laminacja brwi", category: "Brwi i rzęsy", duration: 45, price: 120 },
  ];

  const serviceRecords = await Promise.all(
    services.map(s => prisma.service.upsert({
      where: { id: `${salon.id}-${s.name}` },
      update: {},
      create: {
        id: `${salon.id}-${s.name}`,
        ...s,
        salonId: salon.id,
      },
    })),
  );

  const staff = [
    { name: "Anna Kowalska", role: "Fryzjer stylista", services: ["Strzyżenie damskie", "Strzyżenie męskie", "Koloryzacja", "Balayage"] },
    { name: "Marta Nowak", role: "Fryzjer kolorystka", services: ["Strzyżenie damskie", "Koloryzacja", "Balayage"] },
    { name: "Karolina Wiśniewska", role: "Stylistka paznokci", services: ["Manicure hybrydowy", "Pedicure"] },
    { name: "Ewa Zielińska", role: "Kosmetolog", services: ["Henna brwi i rzęs", "Laminacja brwi"] },
  ];

  const staffRecords = await Promise.all(
    staff.map(async sp => {
      const record = await prisma.staff.upsert({
        where: { id: `${salon.id}-${sp.name}` },
        update: {},
        create: {
          id: `${salon.id}-${sp.name}`,
          name: sp.name,
          role: sp.role,
          salonId: salon.id,
        },
      });

      await prisma.staffService.createMany({
        data: sp.services.map(serviceName => ({
          staffId: record.id,
          serviceId: `${salon.id}-${serviceName}`,
        })),
        skipDuplicates: true,
      });

      return record;
    }),
  );

  const clients = [
    { name: "Joanna Majewska", phone: "+48 501 234 567", email: "joanna@example.com", visits: 12, lastVisit: "2026-02-14", notes: "Preferuje ciepłe odcienie" },
    { name: "Katarzyna Wójcik", phone: "+48 502 345 678", visits: 8, lastVisit: "2026-02-10" },
    { name: "Agnieszka Kamińska", phone: "+48 503 456 789", email: "agnieszka@example.com", visits: 5, lastVisit: "2026-02-07" },
    { name: "Magdalena Lewandowska", phone: "+48 504 567 890", visits: 3, lastVisit: "2026-01-28" },
    { name: "Aleksandra Dąbrowska", phone: "+48 505 678 901", email: "ola@example.com", visits: 15, lastVisit: "2026-02-18", notes: "Uczulenie na amoniak" },
    { name: "Natalia Kozłowska", phone: "+48 506 789 012", visits: 1, lastVisit: "2026-02-20" },
  ];

  const clientRecords = await Promise.all(
    clients.map(c => prisma.client.upsert({
      where: { id: `${salon.id}-${c.phone}` },
      update: {},
      create: {
        id: `${salon.id}-${c.phone}`,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        salonId: salon.id,
      },
    })),
  );

  const primaryClient = clientRecords.find(c => c.email);
  if (primaryClient) {
    const existingAccount = await prisma.clientAccount.findUnique({ where: { clientId: primaryClient.id } });
    if (!existingAccount) {
      const passwordHash = await bcrypt.hash("Client123!", 10);
      await prisma.clientAccount.create({
        data: {
          clientId: primaryClient.id,
          email: primaryClient.email!,
          passwordHash,
          active: true,
        },
      });
    }
  }

  const appts = [
    { client: "Joanna Majewska", staff: "Anna Kowalska", service: "Strzyżenie damskie", date: "2026-02-21", time: "09:00", duration: 45, status: "CONFIRMED" },
    { client: "Katarzyna Wójcik", staff: "Marta Nowak", service: "Koloryzacja", date: "2026-02-21", time: "10:00", duration: 120, status: "IN_PROGRESS" },
    { client: "Agnieszka Kamińska", staff: "Karolina Wiśniewska", service: "Manicure hybrydowy", date: "2026-02-21", time: "11:00", duration: 60, status: "SCHEDULED" },
    { client: "Magdalena Lewandowska", staff: "Anna Kowalska", service: "Balayage", date: "2026-02-21", time: "13:00", duration: 180, status: "SCHEDULED" },
    { client: "Aleksandra Dąbrowska", staff: "Ewa Zielińska", service: "Henna brwi i rzęs", date: "2026-02-21", time: "14:00", duration: 30, status: "SCHEDULED" },
  ];

  for (const apt of appts) {
    const client = clientRecords.find(c => c.name === apt.client);
    const staffRec = staffRecords.find(s => s.name === apt.staff);
    const serviceId = `${salon.id}-${apt.service}`;
    const exists = await prisma.appointment.findFirst({
      where: { salonId: salon.id, date: apt.date, time: apt.time, clientId: client?.id },
    });
    if (exists) continue;
    const appointment = await prisma.appointment.create({
      data: {
        salonId: salon.id,
        date: apt.date,
        time: apt.time,
        duration: apt.duration,
        status: apt.status as any,
        clientId: client!.id,
        staffId: staffRec?.id,
      },
    });
    await prisma.appointmentService.create({
      data: { appointmentId: appointment.id, serviceId },
    });
  }
}

seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seed complete");
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
