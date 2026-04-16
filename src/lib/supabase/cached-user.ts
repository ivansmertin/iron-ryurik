import { cache } from "react";
import { createClient } from "./server";

/**
 * React cache() deduplicates this call within a single server render.
 * Both middleware (via headers) and Server Components call getUser() — this
 * ensures the Supabase Auth HTTP request is made only ONCE per request.
 */
export const getCachedSupabaseUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
