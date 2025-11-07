import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get yesterday's date (since this runs at midnight)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    console.log(`Running daily reset for date: ${yesterdayStr}`)

    // Get all children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, payment_amount')

    if (childrenError) {
      throw childrenError
    }

    console.log(`Found ${children?.length || 0} children`)

    // Check each child for yesterday's attendance
    const absentChildren = []
    
    for (const child of children || []) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('child_id', child.id)
        .eq('payment_date', yesterdayStr)
        .maybeSingle()

      if (paymentError) {
        console.error(`Error checking payment for child ${child.id}:`, paymentError)
        continue
      }

      // If no record exists for yesterday, mark as absent
      if (!payment) {
        absentChildren.push({
          child_id: child.id,
          payment_date: yesterdayStr,
          attendance_status: 'absent',
          status: 'unpaid',
          amount: 0,
          debt_amount: child.payment_amount,
          arrival_time: null,
        })
      }
    }

    // Insert absent records
    if (absentChildren.length > 0) {
      const { error: insertError } = await supabase
        .from('payments')
        .insert(absentChildren)

      if (insertError) {
        throw insertError
      }

      console.log(`Marked ${absentChildren.length} children as absent for ${yesterdayStr}`)
    } else {
      console.log('No children to mark as absent')
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: yesterdayStr,
        markedAbsent: absentChildren.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in daily-attendance-reset:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
