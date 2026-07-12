import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyWalletSignature } from '../_shared/verifyWalletSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body (may be empty for automatic checks)
    const body = req.headers.get('content-type')?.includes('application/json') 
      ? await req.json() 
      : {};
    const { walletAddress, message, signature, timestamp } = body;

    // Verify wallet signature if credentials provided
    if (walletAddress && message && signature && timestamp) {
      const verification = await verifyWalletSignature(walletAddress, message, signature, timestamp);
      
      if (!verification.valid) {
        console.error('Signature verification failed:', verification.error);
        return new Response(
          JSON.stringify({ 
            error: 'SIGNATURE_INVALID', 
            message: verification.error || 'Invalid wallet signature'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Signature verified for wallet:', walletAddress);
    }

    const timerId = 'territory_expansion';

    // Get current timer
    const { data: timer, error: fetchError } = await supabase
      .from('game_timers')
      .select('*')
      .eq('id', timerId)
      .single();

    if (fetchError) {
      console.error('Error fetching timer:', fetchError);
      throw fetchError;
    }

    const now = Date.now();
    
    // Check if timer expired
    if (timer.target_time <= now) {
      // Reset timer to 4 days from now
      const newTargetTime = now + timer.duration_ms;
      
      console.log('Timer expired, resetting to:', new Date(newTargetTime));
      
      const { error: updateError } = await supabase
        .from('game_timers')
        .update({ 
          target_time: newTargetTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', timerId);

      if (updateError) {
        console.error('Error updating timer:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          reset: true, 
          newTargetTime,
          message: 'Timer reset to 4 days'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        reset: false, 
        targetTime: timer.target_time,
        timeRemaining: timer.target_time - now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-game-timer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
