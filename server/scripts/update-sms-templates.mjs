import prisma from "../src/prisma.ts";

const templates = {
  BOOKING_CONFIRMATION: "Twoja wizyta w {salon_name} dnia {date} o {time} zostala potwierdzona.",
  CANCELLATION: "Twoja wizyta w {salon_name} dnia {date} o {time} zostala anulowana.",
  REMINDER_24H: "Przypomnienie: Twoja wizyta w {salon_name} dnia {date} o {time}.",
  REMINDER_2H: "Przypomnienie: Twoja wizyta w {salon_name} dnia {date} o {time}.",
  FOLLOWUP: "Dziekujemy za wizyte w {salon_name} dnia {date} o {time}. Zapraszamy ponownie!",
};

const salons = await prisma.salon.findMany({ select: { id: true } });

for (const salon of salons) {
  for (const [event, body] of Object.entries(templates)) {
    await prisma.notificationTemplate.upsert({
      where: {
        salonId_event_channel: {
          salonId: salon.id,
          event,
          channel: "SMS",
        },
      },
      update: { body, active: true },
      create: { salonId: salon.id, event, channel: "SMS", body, active: true },
    });
  }
}

await prisma.$disconnect();
console.log("SMS templates updated");
