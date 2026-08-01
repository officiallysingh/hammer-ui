// Client-side mirrors of backend validation patterns for master data (states/cities/areas).
export const STATE_NAME_PATTERN = /^[\p{L} ]+$/u;
export const STATE_CODE_PATTERN = /^[A-Z]{2}$/;
export const CITY_NAME_PATTERN = /^[\p{L}0-9 .,&()-]+$/u;
export const AREA_NAME_PATTERN = /^[\p{L}\d .,&()'()/-]+$/u;
export const AREA_PIN_CODE_PATTERN = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;

export const STATE_NAME_ERROR = 'Only letters and spaces are allowed.';
export const STATE_CODE_ERROR = 'Enter exactly 2 uppercase letters (e.g. MH).';
export const CITY_NAME_ERROR = 'Only letters, numbers, spaces and . , & ( ) - are allowed.';
export const AREA_NAME_ERROR = "Only letters, numbers, spaces and . , & ( ) ' / - are allowed.";
export const AREA_PIN_CODE_ERROR = 'Enter a valid 6-digit pin code.';

// Role name: uppercase letters, numbers and underscore only — the `ROLE_` prefix
// is added by the backend automatically and must not be typed by the admin.
export const ROLE_NAME_PATTERN = /^[A-Z0-9_]+$/;
export const ROLE_NAME_ERROR = 'Only uppercase letters, numbers and underscore are allowed.';
export const ROLE_NAME_TIP =
  "Uppercase letters, numbers and underscore only — no other special characters. Don't include the ROLE_ prefix, it's added automatically (e.g. AUCTION_MANAGER).";
