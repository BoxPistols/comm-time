"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import { Edit, MoveRight, ChevronRight } from "lucide-react";
import type { KanbanStatus, KanbanStatusColumn } from "@/types";

type KanbanContextMenuProps = {
  children: React.ReactNode;
  currentStatus: KanbanStatus;
  kanbanStatuses: KanbanStatusColumn[];
  onOpenDetails: () => void;
  onChangeStatus: (status: KanbanStatus) => void;
};

export function KanbanContextMenu({
  children,
  currentStatus,
  kanbanStatuses,
  onOpenDetails,
  onChangeStatus,
}: KanbanContextMenuProps) {
  const otherStatuses = kanbanStatuses.filter((s) => s.id !== currentStatus);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5 z-50">
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            onSelect={onOpenDetails}
          >
            <Edit className="w-4 h-4" />
            詳細を編集
          </ContextMenu.Item>

          {otherStatuses.length > 0 && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                  <MoveRight className="w-4 h-4" />
                  ステータス変更
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent className="min-w-[140px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5 z-50">
                    {otherStatuses.map((status) => (
                      <ContextMenu.Item
                        key={status.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        onSelect={() => onChangeStatus(status.id)}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </ContextMenu.Item>
                    ))}
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
