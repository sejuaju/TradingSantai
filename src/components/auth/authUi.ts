export const AUTH_INPUT_CLASS =
  "w-full px-4 py-2.5 rounded-lg bg-white/5 border text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 transition-colors";

export const AUTH_LABEL_CLASS = "block text-xs font-medium text-white/60 mb-1.5";

export const AUTH_SUBMIT_CLASS =
  "w-full py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors";

export function authFieldClass(invalid: boolean) {
  return `${AUTH_INPUT_CLASS} ${
    invalid
      ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/30"
      : "border-white/10 focus:border-accent/50 focus:ring-accent/30"
  }`;
}

export const AUTH_FORM_CLASS = "space-y-3.5";

export const AUTH_ERROR_CLASS =
  "text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2";

export const AUTH_SUCCESS_CLASS =
  "text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2";