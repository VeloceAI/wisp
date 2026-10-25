function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const RULES: [RegExp, string | ((m: string) => string)][] = [
  [/\b(?:\d[ -]?){12,18}\d\b/g, (m) => (luhn(m.replace(/\D/g, '')) ? '[card hidden]' : m)],
  [/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[id hidden]'],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[id hidden]'],
  [/\b(otp|one[- ]time|code|pin|cvv|cvc)\b(\D{0,12})\d{3,8}\b/gi, '$1$2[code hidden]'],
  [/\b(password|passcode|passwd|pwd)\b(\s*(?:is|:|=)?\s*)\S+/gi, '$1$2[password hidden]'],
];

/** Removes card numbers, OTPs, passwords and ID numbers from text before it reaches any AI. */
export function redact(text: string): string {
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, rep as never);
  return out;
}
