/** Current Riot data-sharing consent copy version — bump when disclaimer text changes. */
export const RIOT_CONSENT_VERSION = "1";

/** OAuth2 CSRF state — sessionStorage between Riot redirect and callback. */
export const RIOT_OAUTH_STATE_KEY = "br_riot_oauth_state";

/** Redirect URI for the in-flight Riot OAuth request. */
export const RIOT_OAUTH_REDIRECT_KEY = "br_riot_oauth_redirect";

/** Member id initiating the link flow (validated on callback). */
export const RIOT_OAUTH_MEMBER_KEY = "br_riot_oauth_member";

/** Public visibility choice selected before redirect. */
export const RIOT_OAUTH_PUBLIC_KEY = "br_riot_oauth_public";

/** Region label stored on the linked account (from profile at link time). */
export const RIOT_OAUTH_REGION_KEY = "br_riot_oauth_region";
