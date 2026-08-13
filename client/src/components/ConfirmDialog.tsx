/**
 * ConfirmDialog — reusable confirmation modal
 * Replaces all window.confirm() calls across the app.
 *
 * Usage:
 *   const [dialog, setDialog] = useState<ConfirmDialogProps | null>(null);
 *
 *   // Trigger:
 *   setDialog({ title: 'Delete product', description: '...', onConfirm: () => handleDelete(id) });
 *
 *   // Render alongside your component:
 *   {dialog && <ConfirmDialog {...dialog} onClose={() => setDialog(null)} />}
 */
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDanger ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {isDanger
                ? <Trash2 className="w-4 h-4 text-red-600" />
                : <AlertTriangle className="w-4 h-4 text-amber-600" />
              }
            </div>
            <h2 className="font-bold text-gray-900 text-base">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className={`flex-1 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
