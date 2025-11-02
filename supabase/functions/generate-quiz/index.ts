import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating quiz for task:', taskTitle);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a quiz generation expert. Create multiple-choice questions based on task titles to verify understanding.'
          },
          {
            role: 'user',
            content: `Generate 2-5 multiple-choice quiz questions for this task: "${taskTitle}". Each question should test understanding of the topic. Vary the number of questions based on task complexity.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz",
              description: "Generate quiz questions for task verification",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { 
                          type: "array",
                          items: { type: "string" },
                          minItems: 4,
                          maxItems: 4
                        },
                        correct_answer: { 
                          type: "number",
                          minimum: 0,
                          maximum: 3
                        }
                      },
                      required: ["question", "options", "correct_answer"],
                      additionalProperties: false
                    },
                    minItems: 2,
                    maxItems: 5
                  }
                },
                required: ["questions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      throw new Error('Failed to generate quiz');
    }

    const data = await response.json();
    let quizQuestions: QuizQuestion[] = [];
    
    const toolCalls = data.choices[0].message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const functionArgs = JSON.parse(toolCalls[0].function.arguments);
      quizQuestions = functionArgs.questions || [];
    }

    console.log('Generated quiz:', quizQuestions);

    return new Response(
      JSON.stringify({ questions: quizQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to generate quiz',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});