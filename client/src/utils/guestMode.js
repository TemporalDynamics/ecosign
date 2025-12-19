// Guest mode helpers
// Uses localStorage flag to mark demo sessions without backend writes.

const FLAG_KEY = 'ecosign_guest_mode';

export function enableGuestMode() {
  try {
    localStorage.setItem(FLAG_KEY, 'true');
  } catch (err) {
    console.warn('Guest mode flag not persisted', err);
  }
}

export function disableGuestMode() {
  try {
    localStorage.removeItem(FLAG_KEY);
  } catch (err) {
    console.warn('Guest mode flag not cleared', err);
  }
}

export function isGuestMode() {
  try {
    return localStorage.getItem(FLAG_KEY) === 'true';
  } catch (err) {
    return false;
  }
}
