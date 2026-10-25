import { cssEscape } from '../watch/sections';

const SENSITIVE_RE = /pass(word|code)?|pwd|otp|one[-_ ]?time|cvv|cvc|card|cc-?(num|number)|pin\b|aadhaar|aadhar|ssn|\bpan\b|iban|account[-_ ]?number|security[-_ ]?code/i;
const SENSITIVE_AUTOCOMPLETE = /cc-|one-time-code|current-password|new-password/i;

/** Fields the guide never reads, types into, or sends to an AI. */
export function isSensitive(el: Element): boolean {
  if (el.closest('[data-wisp-sensitive]')) return true;
  const tag = el.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && el.getAttribute('contenteditable') === null) return false;
  if ((el.getAttribute('type') ?? '').toLowerCase() === 'password') return true;
  if (SENSITIVE_AUTOCOMPLETE.test(el.getAttribute('autocomplete') ?? '')) return true;
  const hints = [el.getAttribute('name'), el.id, el.getAttribute('placeholder'), el.getAttribute('aria-label'), labelText(el)].join(' ');
  return SENSITIVE_RE.test(hints);
}

/** A practical version of the accessible-name rules: what a screen reader would announce. */
export function accessibleName(el: Element): string {
  const doc = el.ownerDocument;
  const own = el.getAttribute('data-wisp-label') ?? el.getAttribute('aria-label');
  if (own?.trim()) return clip(own);
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .join(' ');
    if (text.trim()) return clip(text);
  }
  const label = labelText(el);
  if (label) return clip(label);
  if (el.tagName === 'IMG') return clip(el.getAttribute('alt') ?? '');
  if (el.tagName === 'INPUT') {
    const type = (el.getAttribute('type') ?? '').toLowerCase();
    if (['button', 'submit', 'reset'].includes(type)) return clip((el as HTMLInputElement).value || type);
    return clip(el.getAttribute('placeholder') ?? el.getAttribute('title') ?? el.getAttribute('name') ?? '');
  }
  if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return clip(el.getAttribute('title') ?? el.getAttribute('name') ?? '');
  const text = (el as HTMLElement).innerText ?? el.textContent ?? '';
  return clip(text || el.getAttribute('title') || '');
}

function labelText(el: Element): string {
  const doc = el.ownerDocument;
  const id = el.id;
  const forLabel = id ? doc.querySelector(`label[for="${cssEscape(id)}"]`) : null;
  const label = forLabel ?? el.closest('label');
  if (!label) return '';
  const clone = label.cloneNode(true) as Element;
  clone.querySelectorAll('input,select,textarea').forEach((c) => c.remove());
  return (clone.textContent ?? '').trim();
}

const clip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80);
