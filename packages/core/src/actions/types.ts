import type { Localized } from '../brain/lang';

/** Targets are page refs ("e12") from an AI plan, or plain descriptions ("search box") from the rule planner. */
export type ActionStep =
  | { kind: 'click'; target: string }
  | { kind: 'type'; target: string; text: string; submit?: boolean }
  | { kind: 'select'; target: string; option: string }
  | { kind: 'scroll'; target?: string; direction?: 'up' | 'down' | 'top' | 'bottom' }
  | { kind: 'press'; target?: string; key: 'Enter' | 'Escape' }
  | { kind: 'navigate'; url: string }
  | { kind: 'tool'; name: string; args?: Record<string, unknown> };

export interface ActionPlan {
  goal: string;
  steps: ActionStep[];
}

export interface ActionParam {
  type: 'string' | 'number' | 'boolean';
  description?: string;
  enum?: string[];
  required?: boolean;
}

/**
 * Something the site lets the guide do directly, like `search` or `track-order`.
 * Declared ones are preferred over clicking around the page.
 */
export interface SiteActionDecl {
  name: string;
  description: Localized;
  params?: Record<string, ActionParam>;
  /** Pays, deletes, sends or submits: the guide always asks first. */
  final?: boolean;
  /** Shown as a tap-to-run button in chat (only for actions with no required params). */
  button?: Localized;
}

export type SiteActionHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

export const STEP_KINDS = ['click', 'type', 'select', 'scroll', 'press', 'navigate', 'tool'] as const;
