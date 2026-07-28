"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import { StickyNote, ListTodo, ExternalLink } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";

type EventContextMenuProps = {
  event: CalendarEvent;
  children: React.ReactNode;
  onOpenDetails: () => void;
  onAddAsTodo?: () => void;
};

export function EventContextMenu({
  event,
  children,
  onOpenDetails,
  onAddAsTodo,
}: EventContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[180px] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1.5 z-50">
          <ContextMenu.Item
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            onSelect={onOpenDetails}
          >
            <StickyNote className="w-4 h-4" />
            詳細を開く
          </ContextMenu.Item>

          {onAddAsTodo && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <ContextMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400"
                onSelect={onAddAsTodo}
              >
                <ListTodo className="w-4 h-4" />
                TODOに追加
              </ContextMenu.Item>
            </>
          )}

          {event.hangoutLink && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <ContextMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                onSelect={() => window.open(event.hangoutLink, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
                ミーティングを開く
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
