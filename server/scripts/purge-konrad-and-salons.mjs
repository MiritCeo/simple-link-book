import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_EMAILS = [
  "konrad.krawczyk02@gmail.com",
  "konrad.krawczyk@mirit.pl",
].map((e) => e.toLowerCase());

const TARGET_PHONE_DIGITS = "609557557";

const SALON_IDS_TO_DELETE = [
  "cmmyjrlpq000yxi2yfmuibook",
  "cmn38mym50003cnspdlosu17i",
];

const DRY_RUN = process.argv.includes("--dry-run");

const normPhone = (value) => (value || "").replace(/\D+/g, "");

async function collectClientTargets(tx) {
  const clientsByPhone = await tx.client.findMany({
    select: { id: true, phone: true, email: true, salonId: true },
  });
  const phoneMatchedClientIds = clientsByPhone
    .filter((c) => normPhone(c.phone).includes(TARGET_PHONE_DIGITS))
    .map((c) => c.id);

  const accountsByEmail = await tx.clientAccount.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: { id: true, clientId: true, email: true },
  });

  const clientIds = Array.from(
    new Set([
      ...accountsByEmail.map((a) => a.clientId),
      ...phoneMatchedClientIds,
    ]),
  );

  const accountsByClient = clientIds.length
    ? await tx.clientAccount.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, clientId: true, email: true },
      })
    : [];

  const accountIds = Array.from(
    new Set([...accountsByEmail, ...accountsByClient].map((a) => a.id)),
  );

  const appointmentIds = clientIds.length
    ? (
        await tx.appointment.findMany({
          where: { clientId: { in: clientIds } },
          select: { id: true },
        })
      ).map((a) => a.id)
    : [];

  const linksByClient = clientIds.length
    ? await tx.clientAccountSalon.count({
        where: { clientId: { in: clientIds } },
      })
    : 0;

  const linksByAccount = accountIds.length
    ? await tx.clientAccountSalon.count({
        where: { clientAccountId: { in: accountIds } },
      })
    : 0;

  return {
    clientIds,
    accountIds,
    appointmentIds,
    linksByClient,
    linksByAccount,
  };
}

async function collectSalonTargets(tx, salonId) {
  const salon = await tx.salon.findUnique({
    where: { id: salonId },
    select: { id: true, name: true, slug: true },
  });
  if (!salon) return null;

  const [appointments, staff, services, clients, users] = await Promise.all([
    tx.appointment.count({ where: { salonId } }),
    tx.staff.count({ where: { salonId } }),
    tx.service.count({ where: { salonId } }),
    tx.client.count({ where: { salonId } }),
    tx.user.count({ where: { salonId } }),
  ]);

  return { salon, appointments, staff, services, clients, users };
}

async function deleteClientTargets(tx, targets) {
  const { clientIds, accountIds, appointmentIds } = targets;

  if (appointmentIds.length) {
    await tx.notificationLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentToken.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentService.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.salonRating.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    const ptx = tx;
    if (ptx.pushLog?.deleteMany) {
      await ptx.pushLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    }
    await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }

  if (accountIds.length) {
    await tx.clientPasswordReset.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    await tx.clientFavoriteGooglePlace.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    await tx.clientFavoriteSalon.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    await tx.salonRating.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    const ptx = tx;
    if (ptx.pushDeviceToken?.deleteMany) {
      await ptx.pushDeviceToken.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    }
    await tx.clientAccountSalon.deleteMany({ where: { clientAccountId: { in: accountIds } } });
    await tx.clientAccount.deleteMany({ where: { id: { in: accountIds } } });
  }

  if (clientIds.length) {
    await tx.clientAccountSalon.deleteMany({ where: { clientId: { in: clientIds } } });
    await tx.client.deleteMany({ where: { id: { in: clientIds } } });
  }
}

async function deleteSalonDeep(tx, salonId) {
  const [appointments, staff, services, clients, inventoryItems] = await Promise.all([
    tx.appointment.findMany({ where: { salonId }, select: { id: true } }),
    tx.staff.findMany({ where: { salonId }, select: { id: true } }),
    tx.service.findMany({ where: { salonId }, select: { id: true } }),
    tx.client.findMany({ where: { salonId }, select: { id: true } }),
    tx.inventoryItem.findMany({ where: { salonId }, select: { id: true } }),
  ]);

  const appointmentIds = appointments.map((a) => a.id);
  const staffIds = staff.map((s) => s.id);
  const serviceIds = services.map((s) => s.id);
  const clientIds = clients.map((c) => c.id);
  const inventoryItemIds = inventoryItems.map((i) => i.id);

  const clientAccounts = clientIds.length
    ? await tx.clientAccount.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } })
    : [];
  const clientAccountIds = clientAccounts.map((a) => a.id);

  if (appointmentIds.length) {
    await tx.notificationLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentToken.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentService.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.salonRating.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    const ptx = tx;
    if (ptx.pushLog?.deleteMany) {
      await ptx.pushLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    }
  }
  if (serviceIds.length) {
    await tx.staffService.deleteMany({ where: { serviceId: { in: serviceIds } } });
    await tx.appointmentService.deleteMany({ where: { serviceId: { in: serviceIds } } });
  }
  if (staffIds.length) {
    await tx.staffAvailability.deleteMany({ where: { staffId: { in: staffIds } } });
    await tx.staffException.deleteMany({ where: { staffId: { in: staffIds } } });
    await tx.staffService.deleteMany({ where: { staffId: { in: staffIds } } });
  }
  if (inventoryItemIds.length) {
    await tx.inventoryMovement.deleteMany({ where: { itemId: { in: inventoryItemIds } } });
  }
  if (clientAccountIds.length) {
    await tx.clientPasswordReset.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    await tx.clientFavoriteGooglePlace.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    await tx.clientFavoriteSalon.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    await tx.salonRating.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    const ptx = tx;
    if (ptx.pushDeviceToken?.deleteMany) {
      await ptx.pushDeviceToken.deleteMany({ where: { clientAccountId: { in: clientAccountIds } } });
    }
  }

  await tx.notificationTemplate.deleteMany({ where: { salonId } });
  await tx.notificationSetting.deleteMany({ where: { salonId } });
  await tx.salonBreak.deleteMany({ where: { salonId } });
  await tx.salonException.deleteMany({ where: { salonId } });
  await tx.salonHour.deleteMany({ where: { salonId } });

  await tx.clientFavoriteSalon.deleteMany({ where: { salonId } });
  await tx.salonRating.deleteMany({ where: { salonId } });
  await tx.clientAccountSalon.deleteMany({ where: { salonId } });
  await tx.userSalon.deleteMany({ where: { salonId } });

  await tx.appointment.deleteMany({ where: { salonId } });
  await tx.staff.deleteMany({ where: { salonId } });
  await tx.service.deleteMany({ where: { salonId } });
  await tx.client.deleteMany({ where: { salonId } });

  await tx.inventoryMovement.deleteMany({ where: { createdBy: { salonId } } });
  await tx.inventoryItem.deleteMany({ where: { salonId } });
  await tx.inventoryCategory.deleteMany({ where: { salonId } });
  await tx.inventoryUnit.deleteMany({ where: { salonId } });
  await tx.inventorySetting.deleteMany({ where: { salonId } });

  if (clientAccountIds.length) {
    await tx.clientAccount.deleteMany({ where: { id: { in: clientAccountIds } } });
  }

  await tx.user.deleteMany({ where: { salonId } });
  await tx.salon.delete({ where: { id: salonId } });
}

async function main() {
  await prisma.$transaction(async (tx) => {
    const clientTargets = await collectClientTargets(tx);
    const salonTargets = [];
    for (const salonId of SALON_IDS_TO_DELETE) {
      const target = await collectSalonTargets(tx, salonId);
      if (target) salonTargets.push(target);
    }

    console.log("=== PREVIEW ===");
    console.log("clientIds:", clientTargets.clientIds.length, clientTargets.clientIds);
    console.log("clientAccountIds:", clientTargets.accountIds.length, clientTargets.accountIds);
    console.log("appointments by client:", clientTargets.appointmentIds.length);
    console.log("links by client:", clientTargets.linksByClient);
    console.log("links by account:", clientTargets.linksByAccount);
    console.log("salons:", salonTargets.map((s) => ({
      id: s.salon.id,
      name: s.salon.name,
      slug: s.salon.slug,
      appointments: s.appointments,
      staff: s.staff,
      services: s.services,
      clients: s.clients,
      users: s.users,
    })));

    if (DRY_RUN) {
      console.log("DRY RUN ONLY. No data deleted.");
      return;
    }

    await deleteClientTargets(tx, clientTargets);
    for (const salonId of SALON_IDS_TO_DELETE) {
      const exists = await tx.salon.findUnique({ where: { id: salonId }, select: { id: true } });
      if (!exists) continue;
      await deleteSalonDeep(tx, salonId);
    }
    console.log("DELETE DONE.");
  });
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
