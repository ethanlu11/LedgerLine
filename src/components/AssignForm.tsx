"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { OwnerOption, ReviewGroup } from "@/lib/metrics";
import { assignGroup, type AssignResult } from "@/app/review/actions";

const ownerKey = (o: OwnerOption) => `${o.kind}:${o.id}`;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-xl bg-accent-solid px-4 py-2 text-[13px] font-bold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Assigning…" : "Assign"}
    </button>
  );
}

export function AssignForm({ group, owners }: { group: ReviewGroup; owners: OwnerOption[] }) {
  const [state, formAction] = useActionState<AssignResult | null, FormData>(assignGroup, null);
  const [selected, setSelected] = useState(group.guess ? ownerKey(group.guess.owner) : "");

  const chosen = owners.find((o) => ownerKey(o) === selected);
  const departed = chosen?.kind === "person" && chosen.departureDate !== null;

  const teams = owners.filter((o) => o.kind === "team");
  const active = owners.filter((o) => o.kind === "person" && o.departureDate === null);
  const former = owners.filter((o) => o.kind === "person" && o.departureDate !== null);

  if (state?.ok) {
    return (
      <p className="rounded-xl border border-mint/25 bg-mint/10 px-3 py-2 text-[13px] text-mint">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="vendor" value={group.vendor} />
      <input type="hidden" name="cardId" value={group.cardId} />

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`owner-${group.key}`}>
          Assign {group.vendor} to
        </label>
        <select
          id={`owner-${group.key}`}
          name="owner"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-800 px-2.5 py-2 text-[13px] text-ink-50 focus:border-violet-glow focus:outline-none focus:ring-1 focus:ring-violet-glow/50 sm:flex-none"
        >
          <option value="">Who owns this?</option>
          <optgroup label="Teams">
            {teams.map((o) => (
              <option key={ownerKey(o)} value={ownerKey(o)}>
                {o.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="People">
            {active.map((o) => (
              <option key={ownerKey(o)} value={ownerKey(o)}>
                {o.name} — {o.detail}
              </option>
            ))}
          </optgroup>
          {former.length > 0 && (
            <optgroup label="Left the company">
              {former.map((o) => (
                <option key={ownerKey(o)} value={ownerKey(o)}>
                  {o.name} — {o.detail}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <SubmitButton disabled={!selected} />
      </div>

      <label className="flex items-center gap-2 text-[12px] text-haze-300">
        <input
          type="checkbox"
          name="always"
          className="h-4 w-4 shrink-0 rounded border-ink-600 bg-ink-800 accent-violet-glow"
        />
        Always send {group.vendor} on this card here
      </label>

      {departed && chosen && (
        <p className="rounded-xl border border-ember/30 bg-ember/10 px-3 py-2 text-[12px] text-haze-300">
          <strong className="font-semibold text-ember">{chosen.name} has left.</strong> Assigning{" "}
          {group.chargeCount === 1 ? "this charge" : `these ${group.chargeCount} charges`} to them counts this
          spend against someone who is gone, and it will show up as dormant.
        </p>
      )}

      {state && !state.ok && (
        <p className="rounded-xl border border-ember/30 bg-ember/10 px-3 py-2 text-[12px] text-ember">
          {state.message}
        </p>
      )}
    </form>
  );
}
