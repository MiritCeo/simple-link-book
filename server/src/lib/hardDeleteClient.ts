import type { Prisma } from "@prisma/client";
import { toPhoneDigits } from "./phoneDigits.js";

type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Trwałe usunięcie rekordu Client wraz z wizytami, kontem aplikacji (ClientAccount) i powiązaniami.
 * Po tym ten sam e-mail / telefon można ponownie użyć przy rejestracji (o ile unikalność na to pozwala).
 */
export async function hardDeleteClientInTransaction(tx: Tx, clientId: string): Promise<void> {
  const client = await tx.client.findUnique({
    where: { id: clientId },
    include: { account: true },
  });
  if (!client) return;

  const appointments = await tx.appointment.findMany({
    where: { clientId },
    select: { id: true },
  });
  const appointmentIds = appointments.map((a) => a.id);

  if (appointmentIds.length) {
    await tx.notificationLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentToken.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.pushLog.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointmentService.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.salonRating.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
    await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }

  await tx.inventoryMovement.deleteMany({ where: { clientId } });

  // Musi być przed usunięciem ClientAccount / Client (FK RESTRICT na ClientAccountSalon → Client i ClientAccount).
  await tx.clientAccountSalon.deleteMany({ where: { clientId } });

  if (client.account) {
    const accId = client.account.id;
    await tx.clientPasswordReset.deleteMany({ where: { clientAccountId: accId } });
    await tx.pushDeviceToken.deleteMany({ where: { clientAccountId: accId } });
    await tx.clientFavoriteGooglePlace.deleteMany({ where: { clientAccountId: accId } });
    await tx.clientFavoriteSalon.deleteMany({ where: { clientAccountId: accId } });
    await tx.salonRating.deleteMany({ where: { clientAccountId: accId } });
    await tx.clientAccount.delete({ where: { id: accId } });
  }

  const emails = [client.email, client.account?.email].filter((e): e is string => Boolean(e?.trim()));
  for (const e of emails) {
    await tx.clientRegistrationSession.deleteMany({ where: { email: e.trim() } });
  }

  const pd = toPhoneDigits(client.phone);
  if (pd.length >= 6) {
    await tx.clientSocialVerificationCode.deleteMany({ where: { phoneDigits: pd } });
  }

  await tx.client.delete({ where: { id: clientId } });
}
