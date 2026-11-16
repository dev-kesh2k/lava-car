import { useCallback, useState } from 'react';
import { STORAGE_NS } from './api';

// O cliente não tem conta: celular e nome ficam salvos neste aparelho.
const PHONE_KEY = `${STORAGE_NS}:phone`;
const NAME_KEY = `${STORAGE_NS}:name`;

export const phoneDigits = (v: string) => {
  let d = v.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
};
export const isValidPhone = (v: string) => {
  const d = phoneDigits(v);
  return d.length === 10 || d.length === 11;
};

/** (11) 91234-5678 enquanto digita */
export function maskPhone(v: string) {
  let d = v.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const getSavedPhone = () => localStorage.getItem(PHONE_KEY) || '';
export const getSavedName = () => localStorage.getItem(NAME_KEY) || '';
export function saveClient(phone: string, name?: string) {
  localStorage.setItem(PHONE_KEY, maskPhone(phoneDigits(phone)));
  if (name !== undefined) {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    else localStorage.removeItem(NAME_KEY);
  }
}
export function forgetClient() {
  localStorage.removeItem(PHONE_KEY);
  localStorage.removeItem(NAME_KEY);
}

/** Celular salvo no aparelho, com setter que persiste. */
export function useSavedPhone() {
  const [phone, setPhone] = useState(getSavedPhone);
  const save = useCallback((p: string) => {
    if (p) saveClient(p);
    else localStorage.removeItem(PHONE_KEY);
    setPhone(p ? getSavedPhone() : '');
  }, []);
  return [phone, save] as const;
}
