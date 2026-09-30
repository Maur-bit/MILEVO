'use client';

export function PrivacySettingsButton() {
  return (
    <button
      type="button"
      className="block py-0.5 text-left text-sm text-gray-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      onClick={() => window.dispatchEvent(new Event('milevo:privacy-settings'))}
    >
      Privacy preferences
    </button>
  );
}
