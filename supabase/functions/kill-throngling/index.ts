import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_BATCH_SIZE = 100;

const killSchema = z.object({
  thronglingIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE)
});

serve(async (req) => {
  console.log('🎯 kill-throngling function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('📦 Received body:', JSON.stringify(body));
    
    // Validate input
    const validation = killSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { thronglingIds } = validation.data;

    console.log(`Killing ${thronglingIds.length} thronglings:`, thronglingIds);

    // Update all thronglings to is_alive: false using service role
    const { data, error } = await supabaseAdmin
      .from('thronglings')
      .update({ is_alive: false })
      .in('id', thronglingIds)
      .select();

    if (error) {
      console.error('Error killing thronglings:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Successfully killed ${data?.length || 0} thronglings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        killedCount: data?.length || 0,
        thronglingIds: data?.map(t => t.id) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
