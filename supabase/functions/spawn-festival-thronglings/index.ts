import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { verifyWalletSignature } from '../_shared/verifyWalletSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_BODY_COLORS = ['#F5C86A', '#3BD2E6', '#B34C6A', '#7BCFA5', '#8B7BEA'];
const ALLOWED_ACCENT_COLORS = ['#FF7F2A', '#2BC19B', '#D54C5A', '#4C6FEA', '#7F67E8'];
const ALLOWED_STATES = ['wander', 'dancing', 'working'];
const HALLOWEEN_ISLAND_WIDTH = 1280;
const MAP_SIZE = 768 + 500 + HALLOWEEN_ISLAND_WIDTH; // 2548 (first island + gap + Halloween island)
const MAX_BATCH_SIZE = 50;

const thronglingSchema = z.object({
  name: z.string().min(2).max(16).regex(/^[a-zA-Z0-9 ._-]+$/).nullable().optional(),
  x: z.number().min(0).max(MAP_SIZE),
  y: z.number().min(0).max(MAP_SIZE),
  vx: z.number().min(-100).max(100),
  vy: z.number().min(-100).max(100),
  state: z.enum(ALLOWED_STATES as [string, ...string[]]),
  body_color: z.enum(ALLOWED_BODY_COLORS as [string, ...string[]]),
  accent_color: z.enum(ALLOWED_ACCENT_COLORS as [string, ...string[]]),
  is_alive: z.boolean()
});

const festivalSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  message: z.string(),
  signature: z.string(),
  timestamp: z.number(),
  thronglings: z.array(thronglingSchema).min(1).max(MAX_BATCH_SIZE)
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    
    // Validate input
    const validation = festivalSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { walletAddress, message, signature, timestamp, thronglings } = validation.data;

    console.log(`Spawning ${thronglings.length} festival thronglings`);

    // Verify wallet signature
    const verification = await verifyWalletSignature(walletAddress, message, signature, timestamp);
    
    if (!verification.valid) {
      console.error('Signature verification failed:', verification.error);
      return new Response(
        JSON.stringify({ 
          error: 'SIGNATURE_INVALID', 
          message: verification.error || 'Invalid wallet signature'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Signature verified for wallet:', walletAddress);

    // Check current population
    const { data: countData, error: countError } = await supabaseAdmin
      .rpc('get_throngling_count');

    if (countError) {
      console.error('Error checking population:', countError);
      return new Response(
        JSON.stringify({ error: countError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const currentPop = countData || 0;
    const maxPop = 150;
    const availableSlots = Math.max(0, maxPop - currentPop);

    if (availableSlots === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          spawnedCount: 0,
          message: 'Population limit reached'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Limit spawns to available slots
    const thronglingsToSpawn = thronglings.slice(0, availableSlots);

    // Add unique IDs to each throngling
    const thronglingsWithIds = thronglingsToSpawn.map(t => ({
      ...t,
      id: crypto.randomUUID()
    }));

    // Insert all thronglings at once
    const { data, error } = await supabaseAdmin
      .from('thronglings')
      .insert(thronglingsWithIds)
      .select();

    if (error) {
      console.error('Error spawning thronglings:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Successfully spawned ${data?.length || 0} festival thronglings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        spawnedCount: data?.length || 0,
        thronglings: data || []
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
