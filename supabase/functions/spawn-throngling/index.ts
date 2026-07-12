import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { verifyWalletSignature } from '../_shared/verifyWalletSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_CHARACTER_TYPES = ['normal', 'adolf', 'doge', 'george', 'epstein', 'pepe'] as const

const spawnSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  message: z.string(),
  signature: z.string(),
  timestamp: z.number(),
  name: z.string().min(2).max(16).regex(/^[a-zA-Z0-9 ._-]+$/, 'Name contains invalid characters').optional(),
  characterType: z.enum(ALLOWED_CHARACTER_TYPES).optional().default('normal'),
  bodyColor: z.string().optional().default('#F5C86A'),
  accentColor: z.string().optional().default('#FF7F2A'),
  usePaidSpawn: z.boolean().optional(),
  spawnX: z.number().optional(),
  spawnY: z.number().optional()
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    
    // Validate input
    const validation = spawnSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { walletAddress, message, signature, timestamp, name, characterType, bodyColor, accentColor, usePaidSpawn, spawnX, spawnY } = validation.data

    console.log('Spawn request:', { walletAddress, name, usePaidSpawn })

    // Verify wallet signature
    const verification = await verifyWalletSignature(walletAddress, message, signature, timestamp)
    
    if (!verification.valid) {
      console.error('Signature verification failed:', verification.error)
      return new Response(
        JSON.stringify({ 
          error: 'SIGNATURE_INVALID', 
          message: verification.error || 'Invalid wallet signature'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Signature verified for wallet:', walletAddress)

    // Check if wallet is VIP (infinite spawns)
    const { data: isVIP, error: vipError } = await supabaseAdmin.rpc('is_vip_wallet', {
      _wallet_address: walletAddress
    })

    if (vipError) {
      console.error('Error checking VIP status:', vipError)
    }

    console.log('Is VIP wallet:', isVIP)

    // Check population limit
    const { data: limitReached, error: limitError } = await supabaseAdmin.rpc('is_population_limit_reached')
    
    if (limitError) {
      console.error('Error checking population limit:', limitError)
      throw limitError
    }

    if (limitReached) {
      console.log('Population limit reached')
      return new Response(
        JSON.stringify({ error: 'MAX_POPULATION_REACHED', message: 'Maximum Thronglet Population Reached' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if free spawn available (skip for VIP)
    let hasFreeSpawn = false
    
    if (!isVIP) {
      const { data: freeSpawnData, error: freeSpawnError } = await supabaseAdmin.rpc('check_and_use_free_action', {
        _wallet_address: walletAddress,
        _action_type: 'spawn',
        _max_per_day: 5
      })

      if (freeSpawnError) {
        console.error('Error checking free spawn:', freeSpawnError)
        throw freeSpawnError
      }

      hasFreeSpawn = freeSpawnData
      console.log('Has free spawn:', hasFreeSpawn)

      if (!hasFreeSpawn && !usePaidSpawn) {
        return new Response(
          JSON.stringify({ error: 'NO_FREE_SPAWNS', message: 'No free spawns remaining. Use 10,000 $THRONG to spawn.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!hasFreeSpawn && usePaidSpawn) {
        // TODO: Verify $THRONG token payment (10k $THRONG)
        console.log('Paid spawn - will verify 10k $THRONG payment in future')
      }
    } else {
      console.log('VIP wallet - bypassing spawn limits')
    }

    // Generate spawn data
    const spawnData = {
      id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: spawnX ?? (150 + Math.random() * 468),
      y: spawnY ?? (150 + Math.random() * 468),
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      state: 'wander',
      is_alive: true,
      body_color: bodyColor,
      accent_color: accentColor,
      name: name,
      character_type: characterType
    }

    console.log('Inserting throngling:', spawnData.id)

    // Insert with service role
    const { data, error } = await supabaseAdmin
      .from('thronglings')
      .insert(spawnData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting throngling:', error)
      throw error
    }

    console.log('Throngling spawned successfully')

    return new Response(
      JSON.stringify({ success: true, throngling: data, usedFreeSpawn: hasFreeSpawn }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Spawn error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
