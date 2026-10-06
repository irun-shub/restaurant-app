// import { createClient } from '@supabase/supabase-js';

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// );
// import { createClient } from '@supabase/supabase-js';

// // Paste your actual long strings inside the quotes below
// export const supabase = createClient(
//   "https://wspuceaseuhubsgtxmyl.supabase.co/rest/v1/", 
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcHVjZWFzZXVodWJzZ3R4bXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDU2NDQsImV4cCI6MjEwNjYyMTY0NH0._nn2Kf0gFIJhzC7irz1f2SUedh7le8HNr4UgvDiqwQE"
// );

// import { createClient } from '@supabase/supabase-js';

// // Replace the two placeholders below with your actual strings from your Supabase dashboard
// const supabaseUrl = "https://suhttps://wspuceaseuhubsgtxmyl.supabase.co/rest/v1/pabase.co";
// const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcHVjZWFzZXVodWJzZ3R4bXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDU2NDQsImV4cCI6MjEwNjYyMTY0NH0._nn2Kf0gFIJhzC7irz1f2SUedh7le8HNr4UgvDiqwQE";

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     url: supabaseUrl // This forces the authentication engine to use the clean, correct domain bypass
//   }
// });

// MyCafepass123!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
