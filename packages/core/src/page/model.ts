export type PageRole =
  | 'heading'
  | 'button'
  | 'link'
  | 'textbox'
  | 'searchbox'
  | 'combobox'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'tab'
  | 'menuitem'
  | 'img';

/** One thing on the page the guide can talk about, point at, or (later) act on. */
export interface PageElement {
  /** Stable id for this element while the page lives, e.g. "e12". */
  ref: string;
  role: PageRole;
  name: string;
  /** Heading level 1-6. */
  level?: number;
  /** Nearest heading above it, so "the Buy button in Pricing" can be found. */
  section?: string;
  /** Only for search boxes, dropdowns and toggles; never for private fields. */
  value?: string;
  options?: string[];
  checked?: boolean;
  disabled?: boolean;
  href?: string;
  /** Passwords, cards, OTPs: never read, never typed into. */
  sensitive?: boolean;
  /** Owner-declared action name from `data-wisp-action`. */
  action?: string;
  inView?: boolean;
}

export interface PagePassage {
  section: string;
  text: string;
}

export interface PageModel {
  url: string;
  title: string;
  description?: string;
  elements: PageElement[];
  passages: PagePassage[];
  /** True when the owner blocked this page; nothing else is filled in. */
  blocked?: boolean;
}

export const INTERACTIVE_ROLES = new Set<PageRole>(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'tab', 'menuitem']);
