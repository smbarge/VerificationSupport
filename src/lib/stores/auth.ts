import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const isAuthenticated = writable(
  browser ? sessionStorage.getItem('auth') === 'true' : false
);

isAuthenticated.subscribe((val) => {
  if (browser) sessionStorage.setItem('auth', String(val));
});