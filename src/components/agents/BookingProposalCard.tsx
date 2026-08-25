import type { BookingProposal } from "../../lib/agentTurns";

export function BookingProposalCard({
  proposal,
}: {
  proposal: BookingProposal;
}) {
  const rows: { label: string; value: string }[] = [];
  if (proposal.itinerary) rows.push({ label: "Itinerary", value: proposal.itinerary });
  if (proposal.dates) rows.push({ label: "Dates", value: proposal.dates });
  if (proposal.airline) rows.push({ label: "Airline", value: proposal.airline });
  if (proposal.vendor) rows.push({ label: "Vendor", value: proposal.vendor });
  if (proposal.passengers) rows.push({ label: "Travelers", value: proposal.passengers });
  if (proposal.cabin) rows.push({ label: "Cabin", value: proposal.cabin });
  if (proposal.total) rows.push({ label: "Total", value: proposal.total });
  if (proposal.notes) rows.push({ label: "Notes", value: proposal.notes });
  if (rows.length === 0 && !proposal.sourceUrl) return null;

  return (
    <dl className="mt-3 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-3">
          <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            {row.label}
          </dt>
          <dd className="min-w-0 flex-1 font-medium text-donna-text">{row.value}</dd>
        </div>
      ))}
      {proposal.sourceUrl ? (
        <div className="pt-1">
          <a
            href={proposal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-donna-primary underline-offset-2 hover:underline"
          >
            Source
          </a>
        </div>
      ) : null}
    </dl>
  );
}
