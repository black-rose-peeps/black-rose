/** True on phones/tablets (user agent — reliable for OAuth handoff decisions). */
export function isDiscordPhoneOrTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** @deprecated Use isDiscordPhoneOrTablet */
export function isMobileDevice(): boolean {
  return isDiscordPhoneOrTablet();
}
