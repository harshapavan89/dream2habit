import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dream, targetMonths, targetDate, availableDays, dailyHours } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    // Build adaptive system prompt based on time constraints
    const timelineContext = targetMonths && targetDate && availableDays && dailyHours
      ? `The user wants to achieve this goal in ${targetMonths} months (target date: ${targetDate}). They can dedicate ${dailyHours} hours per day, working on ${availableDays.join(', ')}. Create a time-optimized plan that fits their schedule and timeline.`
      : '';

    // Generate habits using Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert habit coach and time management specialist. Generate adaptive, time-based daily habits that help users achieve their goals within their available time and schedule. ${timelineContext}`
          },
          {
            role: 'user',
            content: `My dream is: ${dream}. ${timelineContext ? `I have ${dailyHours} hours daily on ${availableDays.join(', ')} to work toward this over ${targetMonths} months.` : ''} Generate 5 unique and varied daily tasks with emojis that fit my schedule. Format each as: "emoji description (estimated time)". Make them different each day, progressive and achievable. Vary the tasks to keep them fresh and engaging. Today's date: ${new Date().toISOString().split('T')[0]}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_habit_plan",
              description: "Generate a structured, time-based habit plan",
              parameters: {
                type: "object",
                properties: {
                  habits: {
                    type: "array",
                    items: {
                      type: "string",
                      description: "Habit formatted as 'emoji description (time)'"
                    },
                    minItems: 5,
                    maxItems: 5
                  }
                },
                required: ["habits"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_habit_plan" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract habits from tool call response
    let habits: string[] = [];
    const toolCalls = aiData.choices[0].message.tool_calls;
    
    if (toolCalls && toolCalls.length > 0) {
      const functionArgs = JSON.parse(toolCalls[0].function.arguments);
      habits = functionArgs.habits || [];
    } else {
      // Fallback to text parsing if tool calling fails
      const habitsText = aiData.choices[0].message.content || '';
      habits = habitsText.split('\n').filter((line: string) => line.trim()).slice(0, 5);
    }

    // Fetch YouTube resources
    const youtubeQuery = encodeURIComponent(dream);
    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${youtubeQuery}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
    );

    if (!youtubeResponse.ok) {
      console.error('YouTube API error:', youtubeResponse.status);
      throw new Error(`YouTube API error: ${youtubeResponse.status}`);
    }

    const youtubeData = await youtubeResponse.json();
    const videos = youtubeData.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    }));

    return new Response(
      JSON.stringify({ habits, videos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error('[Generate Habits Error]', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: 'Unable to generate habits. Please try again later.',
        code: 'GENERATION_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
