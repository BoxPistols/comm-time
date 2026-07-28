"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import { Edit, Trash2, ListTodo } from "lucide-react";

type MemoContextMenuProps = {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onConvertToTodo?: () => void;
};

export function MemoContextMenu({
  children,
  onEdit,
  onDelete,
  onConvertToTodo,
}: MemoContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5 z-50">
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            onSelect={onEdit}
          >
            <Edit className="w-4 h-4" />
            編集
          </ContextMenu.Item>

          {onConvertToTodo && (
            <ContextMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400"
              onSelect={onConvertToTodo}
            >
              <ListTodo className="w-4 h-4" />
              TODOに変換
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
            onSelect={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            削除
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
