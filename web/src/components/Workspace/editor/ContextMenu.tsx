import React, { useEffect, useState } from "react";
import { Combine, Copy, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { getSelectedIds } from "./utils/selectionUtils";

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  onClose: () => void;
  onMergeSelected?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  elementId,
  onClose,
  onMergeSelected,
}) => {
  const { t } = useI18n();
  const { selectedId, selectedIds } = useWorkspaceStore();
  const [open, setOpen] = useState(true);
  const selectionIds = getSelectedIds(selectedId, selectedIds);

  useEffect(() => {
    setOpen(true);
  }, [x, y, elementId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      onClose();
    }
  };

  const handleDelete = () => {
    const state = useWorkspaceStore.getState();
    const ids = getSelectedIds(state.selectedId, state.selectedIds);
    if (ids.length > 0) {
      if (typeof (state as any).removeElements === "function") {
        (state as any).removeElements(ids);
      } else if (typeof (state as any).removeElement === "function") {
        ids.forEach((id) => (state as any).removeElement(id));
      }
    }
    onClose();
  };

  const handleDuplicate = () => {
    const state = useWorkspaceStore.getState();
    const ids = getSelectedIds(state.selectedId, state.selectedIds);
    if (ids.length > 0) {
      if (typeof (state as any).duplicateElements === "function") {
        (state as any).duplicateElements(ids);
      } else if (typeof (state as any).duplicateElement === "function") {
        ids.forEach((id) => (state as any).duplicateElement(id));
      }
    }
    onClose();
  };

  const canMerge = selectionIds.length >= 2 && Boolean(onMergeSelected);

  if (selectionIds.length === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="pointer-events-none fixed h-0 w-0 opacity-0"
          style={{ left: x, top: y }}
          aria-label={t("context.open_menu")}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={6}
        className="min-w-[160px] p-1"
      >
        {canMerge && (
          <DropdownMenuItem
            onSelect={() => {
              onMergeSelected?.();
              onClose();
            }}
            className="flex items-center gap-2 text-gray-700"
          >
            <Combine className="h-4 w-4" />
            {t("context.merge_selected", { count: selectionIds.length })}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={handleDuplicate}
          className="flex items-center gap-2 text-gray-700"
        >
          <Copy className="h-4 w-4" />
          {t("context.copy")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleDelete}
          className="flex items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          {t("context.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
