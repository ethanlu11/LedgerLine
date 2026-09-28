"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export interface AssignResult {
  ok: boolean;
  message: string;
}

/**
 * Assign every unassigned charge from one vendor on one card to a person or a
 * team. With `always`, the same choice is saved and reapplied to anything that
 * lands on that vendor+card later.
 */
export async function assignGroup(
  _prev: AssignResult | null,
  formData: FormData,
): Promise<AssignResult> {
  const vendor = String(formData.get("vendor") ?? "");
  const cardId = Number(formData.get("cardId"));
  const owner = String(formData.get("owner") ?? "");
  const always = formData.get("always") === "on";

  if (!vendor || !Number.isInteger(cardId)) {
    return { ok: false, message: "That charge group is no longer there. Refresh and try again." };
  }

  // owner arrives as "person:12" or "team:3".
  const [kind, rawId] = owner.split(":");
  const ownerId = Number(rawId);
  if ((kind !== "person" && kind !== "team") || !Number.isInteger(ownerId)) {
    return { ok: false, message: "Pick who this belongs to first." };
  }

  const target =
    kind === "person"
      ? await prisma.person.findUnique({ where: { id: ownerId } })
      : await prisma.team.findUnique({ where: { id: ownerId } });
  if (!target) return { ok: false, message: "That person or team no longer exists." };

  const assignment =
    kind === "person" ? { personId: ownerId, teamId: null } : { personId: null, teamId: ownerId };

  const { count } = await prisma.charge.updateMany({
    where: { vendor, cardId, personId: null, teamId: null },
    data: assignment,
  });

  if (always) {
    await prisma.assignmentRule.upsert({
      where: { vendor_cardId: { vendor, cardId } },
      create: { vendor, cardId, ...assignment },
      update: assignment,
    });
  }

  // Every page shows money, so they all need refreshing.
  revalidatePath("/", "layout");

  if (count === 0) {
    return { ok: true, message: `${vendor} was already assigned.` };
  }
  const charges = count === 1 ? "1 charge" : `${count} charges`;
  return {
    ok: true,
    message: always
      ? `${charges} moved to ${target.name}. New ${vendor} charges on this card will follow.`
      : `${charges} moved to ${target.name}.`,
  };
}
