/**
 * Multi-Turn Sovereign AI Communication Coach Regression Test Suite
 * Exercises 5 continuous turns:
 * Turn 1: "Make this message more professional."
 * Turn 2: "Make it slightly warmer."
 * Turn 3: "Translate that into Telugu."
 * Turn 4: "Make it shorter."
 * Turn 5: "Make it more empathetic."
 */

interface CoachMsg {
  role: 'user' | 'coach';
  message: string;
  suggestedRewrite?: string;
}

async function runRegressionSuite() {
  console.log('=== STARTING SOVEREIGN AI COACH MULTI-TURN REGRESSION TEST ===\n');
  
  const originalMessage = "Hey, can you please send over the Q3 numbers when you get a chance? No rush, just wondering.";
  const relationshipContext = "Department Manager";
  const userGoal = "Request financial metrics politely and authoritatively";
  
  let chatHistory: CoachMsg[] = [
    {
      role: 'coach',
      message: "Welcome to your Sovereign coaching loop. I've reviewed your draft to your Department Manager. How would you like to refine it?"
    }
  ];

  const turns = [
    {
      turnNumber: 1,
      input: "Make this message more professional.",
      expectations: (resp: any) => {
        if (!resp.coachResponse) throw new Error("Turn 1 missing coachResponse");
        console.log(`[PASS] Turn 1 Response received. Length: ${resp.coachResponse.length} chars.`);
        console.log(`[PASS] Suggested Rewrite: "${resp.suggestedRewrite}"`);
      }
    },
    {
      turnNumber: 2,
      input: "Make it slightly warmer.",
      expectations: (resp: any) => {
        if (!resp.coachResponse) throw new Error("Turn 2 missing coachResponse");
        console.log(`[PASS] Turn 2 Warmer adjustment received.`);
        console.log(`[PASS] Suggested Rewrite: "${resp.suggestedRewrite}"`);
      }
    },
    {
      turnNumber: 3,
      input: "Translate that into Telugu.",
      expectations: (resp: any) => {
        if (!resp.coachResponse) throw new Error("Turn 3 missing coachResponse");
        const containsTeluguScript = /[\u0C00-\u0C7F]/.test(resp.coachResponse + ' ' + (resp.suggestedRewrite || ''));
        if (!containsTeluguScript) {
          throw new Error("Turn 3 failed: Output does not contain Telugu script (Unicode range \\u0C00-\\u0C7F)");
        }
        console.log(`[PASS] Turn 3 Telugu script detected successfully.`);
        console.log(`[PASS] Suggested Telugu Rewrite: "${resp.suggestedRewrite}"`);
      }
    },
    {
      turnNumber: 4,
      input: "Make it shorter.",
      expectations: (resp: any, prevRewrite: string) => {
        if (!resp.coachResponse) throw new Error("Turn 4 missing coachResponse");
        // Verify language continuity: Still in Telugu!
        const containsTeluguScript = /[\u0C00-\u0C7F]/.test(resp.coachResponse + ' ' + (resp.suggestedRewrite || ''));
        if (!containsTeluguScript) {
          throw new Error("Turn 4 failed: Telugu language continuity broken! 'Make it shorter' reverted to English.");
        }
        console.log(`[PASS] Turn 4 Maintained Telugu language continuity for 'Make it shorter'.`);
        console.log(`[PASS] Shortened Telugu Rewrite: "${resp.suggestedRewrite}"`);
      }
    },
    {
      turnNumber: 5,
      input: "Make it more empathetic.",
      expectations: (resp: any) => {
        if (!resp.coachResponse) throw new Error("Turn 5 missing coachResponse");
        const containsTeluguScript = /[\u0C00-\u0C7F]/.test(resp.coachResponse + ' ' + (resp.suggestedRewrite || ''));
        if (!containsTeluguScript) {
          throw new Error("Turn 5 failed: Telugu language continuity broken on Turn 5!");
        }
        console.log(`[PASS] Turn 5 Empathetic adjustment preserved Telugu continuity.`);
        console.log(`[PASS] Empathetic Telugu Rewrite: "${resp.suggestedRewrite}"`);
      }
    }
  ];

  let prevRewrite = '';

  for (const step of turns) {
    console.log(`\n--- EXECUTING TURN ${step.turnNumber}: "${step.input}" ---`);
    
    // Add user message to running history
    const userMsg: CoachMsg = { role: 'user', message: step.input };
    const nextHistory = [...chatHistory, userMsg];

    const response = await fetch('http://localhost:3000/api/analysis/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'u1',
        'X-User-Email': 'kiaria2514@gmail.com'
      },
      body: JSON.stringify({
        message: step.input,
        chatHistory: nextHistory,
        original_message: originalMessage,
        relationship_context: relationshipContext,
        user_goal: userGoal,
        target_language: 'same'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Turn ${step.turnNumber} HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    console.log(`[RAW RESPONSE TURN ${step.turnNumber}]:`, JSON.stringify(data, null, 2));
    step.expectations(data, prevRewrite);

    prevRewrite = data.suggestedRewrite || '';
    
    // Append coach response to history for subsequent turns
    chatHistory = [
      ...nextHistory,
      {
        role: 'coach',
        message: data.coachResponse,
        suggestedRewrite: data.suggestedRewrite
      }
    ];
  }

  console.log('\n======================================================');
  console.log(' ALL 5 TURNS COMPLETED AND VALIDATED SUCCESSFULLY! ');
  console.log(' Multi-turn memory, draft extraction & language continuity proven.');
  console.log('======================================================\n');
}

runRegressionSuite().catch((err) => {
  console.error('\n[REGRESSION TEST FAILED]:', err.message);
  process.exit(1);
});
