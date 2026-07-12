import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { verifyWalletSignature } from '../_shared/verifyWalletSignature.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOOL_CONFIG: Record<string, { freeCount: number; paidCost: number }> = {
  rock: { freeCount: 1, paidCost: 50000 },
  lightning: { freeCount: 1, paidCost: 50000 },
  tornado: { freeCount: 1, paidCost: 50000 },
  fire: { freeCount: 1, paidCost: 50000 },
  snack: { freeCount: 1, paidCost: 20000 },
  festival: { freeCount: 1, paidCost: 200000 }
}

const HALLOWEEN_ISLAND_WIDTH = 1280
const MAP_SIZE = 768 + 500 + HALLOWEEN_ISLAND_WIDTH // 2548 (first island + gap + Halloween island)

const useToolSchema = z.object({
  walletAddress: z.string().min(32).max(44),
  message: z.string(),
  signature: z.string(),
  timestamp: z.number(),
  toolId: z.enum(['rock', 'lightning', 'tornado', 'fire', 'snack', 'festival']),
  x: z.number().min(0).max(MAP_SIZE),
  y: z.number().min(0).max(MAP_SIZE),
  usePaidUse: z.boolean().optional()
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
    const validation = useToolSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { walletAddress, message, signature, timestamp, toolId, x, y, usePaidUse } = validation.data

    console.log('Tool use request:', { walletAddress, toolId, x, y, usePaidUse })

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

    const config = TOOL_CONFIG[toolId]

    // Check if wallet is VIP (infinite uses)
    const { data: isVIP, error: vipError } = await supabaseAdmin.rpc('is_vip_wallet', {
      _wallet_address: walletAddress
    })

    if (vipError) {
      console.error('Error checking VIP status:', vipError)
    }

    // VIP wallets get infinite uses
    if (isVIP) {
      console.log('VIP wallet detected - bypassing limits')
      return new Response(
        JSON.stringify({ 
          success: true, 
          toolId, 
          x, 
          y, 
          usedFreeUse: false,
          cost: 0,
          vip: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if free use available
    const { data: hasFreeUse, error: freeUseError } = await supabaseAdmin.rpc('check_and_use_free_action', {
      _wallet_address: walletAddress,
      _action_type: toolId,
      _max_per_day: config.freeCount
    })

    if (freeUseError) {
      console.error('Error checking free use:', freeUseError)
      throw freeUseError
    }

    console.log('Has free use:', hasFreeUse)

    if (!hasFreeUse && !usePaidUse) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_FREE_USES', 
          message: `No free ${toolId} uses remaining. Use ${config.paidCost.toLocaleString()} $THRONG.`,
          requiredCost: config.paidCost
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!hasFreeUse && usePaidUse) {
      // TODO: Verify $THRONG token payment
      console.log(`Paid ${toolId} use - will verify ${config.paidCost} $THRONG payment in future`)
    }

    console.log('Tool use approved')

    return new Response(
      JSON.stringify({ 
        success: true, 
        toolId, 
        x, 
        y, 
        usedFreeUse: hasFreeUse,
        cost: hasFreeUse ? 0 : config.paidCost
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Tool use error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
