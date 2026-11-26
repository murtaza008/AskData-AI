"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Non-modal: the rest of the page is never aria-hidden while focus is still reachable. */
export function Menu(props: ComponentProps<typeof M.Root>) {
  return <M.Root modal={false} {...props} />;
}
export const MenuTrigger = M.Trigger;
export const MenuGroup = M.Group;

export function MenuContent({ children, className, align = "end", ...props }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={cn("panel-raised animate-pop z-50 min-w-52 p-1 text-[13.5px] outline-none", className)}
        {...props}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

const item =
  "relative flex min-h-8 cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-fg outline-none " +
  "data-[highlighted]:bg-sunken data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle";

export function MenuItem({ className, danger, ...props }: ComponentProps<typeof M.Item> & { danger?: boolean }) {
  return <M.Item className={cn(item, danger && "text-danger-text [&_svg]:text-danger-text", className)} {...props} />;
}

export function MenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <M.Label className={cn("eyebrow px-2.5 pb-1 pt-2", className)}>{children}</M.Label>;
}

export function MenuSeparator() {
  return <M.Separator className="-mx-1 my-1 h-px bg-border" />;
}
