export function normalizePersonNameInput(value: string): string {
  return value.replace(/^\s+/, "").replace(/\s{2,}/g, " ");
}

export function isPersonNameInputCharValid(value: string): boolean {
  return /^[A-Za-z ]*$/.test(value);
}
