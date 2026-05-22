import { CONTRACT_ADDRESS_KEY, isContractAddress } from "./triagent.model";

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function loadStoredContractAddress(): string | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(CONTRACT_ADDRESS_KEY)?.trim() ?? null;
  if (!value) return null;
  if (!isContractAddress(value)) {
    localStorage.removeItem(CONTRACT_ADDRESS_KEY);
    return null;
  }
  return value;
}

export function saveStoredContractAddress(address: string) {
  if (typeof localStorage === "undefined") return;
  const trimmed = address.trim();
  if (!isContractAddress(trimmed)) {
    localStorage.removeItem(CONTRACT_ADDRESS_KEY);
    return;
  }
  localStorage.setItem(CONTRACT_ADDRESS_KEY, trimmed);
}

export function clearStoredContractAddress() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CONTRACT_ADDRESS_KEY);
}
