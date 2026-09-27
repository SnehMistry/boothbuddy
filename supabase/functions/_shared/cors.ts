// The app calls Edge Functions from the browser (web build), which enforces
// CORS — the mobile builds don't need this, but sharing one function for
// both platforms means every function needs these headers regardless.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
