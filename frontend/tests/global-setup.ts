import { localSupabase, resetStaffUser } from "./support/supabase";

export default async function globalSetup() {
  localSupabase(); // fails fast with a clear message if `pnpm supabase:start` has not been run
  await resetStaffUser();
}
