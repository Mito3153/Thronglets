// reset-game-timer — keeps the territory-expansion countdown looping. Called
// periodically by the client; when the timer has expired it rolls the target
// forward by duration_ms so the countdown restarts (territory "expands" again).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const { data: timer, error } = await admin
      .from('game_timers').select('*').eq('id', 'territory_expansion').single()
    if (error || !timer) return json({ error: 'timer_not_found' }, 404)

    const now = Date.now()
    if (Number(timer.target_time) <= now) {
      // roll forward by whole intervals so it stays in phase even if we missed a few
      const dur = Number(timer.duration_ms) || (5 * 24 * 60 * 60 * 1000)
      const missed = Math.floor((now - Number(timer.target_time)) / dur) + 1
      const newTarget = Number(timer.target_time) + missed * dur
      await admin.from('game_timers')
        .update({ target_time: newTarget, updated_at: new Date().toISOString() })
        .eq('id', 'territory_expansion')
      return json({ reset: true, newTargetTime: newTarget })
    }
    return json({ reset: false, targetTime: timer.target_time, timeRemaining: Number(timer.target_time) - now })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
