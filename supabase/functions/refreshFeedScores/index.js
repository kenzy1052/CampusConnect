// supabase/functions/refreshFeedScores/index.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role key for server-side write
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  try {
    // Recalculate visibility_score for all active listings
    const { error } = await supabase.rpc("refresh_visibility_scores");

    if (error) {
      console.error("Failed to refresh feed scores:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Feed scores refreshed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
