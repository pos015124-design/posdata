/**
 * StatusBadge — shared delivery/order status pill.
 * Colours pass WCAG AA (4.5:1) because we pair darker text
 * with the lighter bg AND add a matching border for definition.
 */
export default function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const s = (status || '').toString().toLowerCase();

  const map: Record<string, { bg: string; text: string; border: string; label: string }> = {
    assigned:  { bg: 'bg-amber-50',   text: 'text-amber-800',  border: 'border-amber-300',  label: 'Assigned' },
    enroute:   { bg: 'bg-blue-50',    text: 'text-blue-800',   border: 'border-blue-300',   label: 'En Route' },
    collected: { bg: 'bg-indigo-50',  text: 'text-indigo-800', border: 'border-indigo-300', label: 'Collected' },
    delivered: { bg: 'bg-green-50',   text: 'text-green-800',  border: 'border-green-300',  label: 'Delivered' },
    cancelled: { bg: 'bg-red-50',     text: 'text-red-800',    border: 'border-red-300',    label: 'Cancelled' },
    pending:   { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300',   label: 'Pending' },
    confirmed: { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   label: 'Confirmed' },
    paid:      { bg: 'bg-green-50',   text: 'text-green-800',  border: 'border-green-300',  label: 'Paid' },
    unpaid:    { bg: 'bg-amber-50',   text: 'text-amber-800',  border: 'border-amber-300',  label: 'Unpaid' },
    failed:    { bg: 'bg-red-50',     text: 'text-red-800',    border: 'border-red-300',    label: 'Failed' },
    completed: { bg: 'bg-green-50',   text: 'text-green-800',  border: 'border-green-300',  label: 'Completed' },
    active:    { bg: 'bg-green-50',   text: 'text-green-800',  border: 'border-green-300',  label: 'Active' },
    suspended: { bg: 'bg-red-50',     text: 'text-red-800',    border: 'border-red-300',    label: 'Suspended' },
  };

  const cfg = map[s];
  const displayLabel = cfg?.label ?? status;
  const cls = cfg
    ? `${cfg.bg} ${cfg.text} border ${cfg.border}`
    : 'bg-gray-100 text-gray-700 border border-gray-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cls}`}
      aria-label={`Status: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}
