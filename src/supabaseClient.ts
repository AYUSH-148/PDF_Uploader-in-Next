// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and API key
const supabaseUrl = 'https://sqdolyrzjacictxyikrd.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZG9seXJ6amFjaWN0eHlpa3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4OTY3NDcsImV4cCI6MjA0MTQ3Mjc0N30.Xs3YLkoRm6KoWPgfiLzihajMn6onsfGRwHbmCRwCDiM';

export const supabase = createClient(supabaseUrl, supabaseKey);
