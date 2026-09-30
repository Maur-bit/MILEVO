export function isAuthSessionMissingError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AuthSessionMissingError';
}

export function getFriendlyAuthError(error: { code?: string; message?: string }, fallback: string) {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return "You're offline. Check your internet connection and try again.";
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Your email or password is incorrect.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return 'Choose a stronger password and try again.';
  }
  if (code.includes('rate_limit') || code.includes('over_')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return "We couldn't connect to the server. Check your connection and try again.";
  }

  return fallback;
}
