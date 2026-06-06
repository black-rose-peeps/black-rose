/**
 * WebSocket polyfill — intentionally empty.
 * The real fix is in supabase.ts: loaders that call Supabase now guard
 * against SSR by returning null/empty when window is undefined, pushing
 * the actual fetch to the client side.
 */
