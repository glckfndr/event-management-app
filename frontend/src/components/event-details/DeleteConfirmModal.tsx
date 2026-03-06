import { Button } from "../ui/Button";
import { TrashIcon } from "../ui/icons/TrashIcon";

type DeleteConfirmModalProps = {
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  isBusy,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">
          Confirm deletion
        </h3>
        <p className="mt-2 text-sm text-slate-700">
          Are you sure you want to delete this event?
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            disabled={isBusy}
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-1.5 text-lg font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
          >
            <TrashIcon className="shrink-0" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
