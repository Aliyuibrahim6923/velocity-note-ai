export const triageInput = async (rawText) => {
  const normalized = rawText.toLowerCase().trim();
  
  // 1. Try Chrome's built-in window.ai if available
  if (typeof window !== 'undefined' && window.ai && window.ai.canCreateTextSession) {
    try {
      const state = await window.ai.canCreateTextSession();
      if (state !== 'no') {
        const session = await window.ai.createTextSession();
        const prompt = `Analyze the following text and extract intent. Output ONLY valid JSON in this exact format: {"category": "ACTION_ITEM|CALENDAR_EVENT|FINANCIAL_LOG|STATIC_INTEL", "priority": "LOW|NORMAL|HIGH|CRITICAL", "metadata": {}}. Do not include markdown code blocks.
Text: "${rawText}"`;
        
        const response = await session.prompt(prompt);
        // Attempt to parse JSON safely
        try {
          // Remove any markdown formatting if the model still outputs it
          const jsonStr = response.replace(/^```json/m, '').replace(/```$/m, '').trim();
          const parsed = JSON.parse(jsonStr);
          if (parsed.category) {
            return {
              id: crypto.randomUUID(),
              raw_text: rawText,
              category: parsed.category,
              priority: parsed.priority || 'NORMAL',
              event_timestamp: null,
              metadata_json: JSON.stringify(parsed.metadata || {}),
              created_at: Date.now()
            };
          }
        } catch {
          console.warn("window.ai returned invalid JSON, falling back to deterministic parser", response);
        }
      }
    } catch (e) {
      console.warn("window.ai failed, falling back to deterministic parser", e);
    }
  }

  // 2. Deterministic Fallback Parser (Zero Latency, 100% Offline)
  return deterministicTriage(rawText, normalized);
};

const deterministicTriage = (rawText, normalized) => {
  let category = 'STATIC_INTEL';
  let priority = 'LOW';
  let metadata = {};

  // Financial heuristics
  const amountMatch = normalized.match(/(?:paid|spent|cost|bought|charged|price).*?\s+((?:\$|€|£|₦)?\d+(?:,\d+)?(?:\.\d+)?(?:k|m|b)?)/i);
  const isFinancial = /\b(paid|spend|spent|cost|bought|buy|charge|charged|price|dollar|euro|naira|k)\b/i.test(normalized) && amountMatch;

  // Calendar heuristics
  const isEvent = /\b(meeting|dinner|lunch|appointment|schedule|tomorrow|today at|pm|am)\b/i.test(normalized) && !/\b(remind)\b/i.test(normalized);
  
  // Action/Task heuristics
  const isAction = /\b(remind|todo|to do|task|need to|must|email|send|call|fix|buy|get)\b/i.test(normalized) && !isFinancial;
  
  if (isFinancial) {
    category = 'FINANCIAL_LOG';
    priority = 'NORMAL';
    
    let parsedAmount = null;
    if (amountMatch) {
      const cleanVal = amountMatch[1].replace(/[^\d.kmb]/gi, '');
      let multiplier = 1;
      if (cleanVal.toLowerCase().endsWith('k')) multiplier = 1000;
      if (cleanVal.toLowerCase().endsWith('m')) multiplier = 1000000;
      if (cleanVal.toLowerCase().endsWith('b')) multiplier = 1000000000;
      parsedAmount = parseFloat(cleanVal.replace(/[kmb]/gi, '')) * multiplier;
    }
    metadata.amount = parsedAmount;
    
    // Simple payee extraction: word after 'paid' or 'bought'
    const payeeMatch = normalized.match(/paid\s+(\w+)/i) || normalized.match(/bought\s+(?:from\s+)?(\w+)/i);
    if (payeeMatch) metadata.payee = payeeMatch[1];

  } else if (isEvent) {
    category = 'CALENDAR_EVENT';
    priority = 'NORMAL';
    
    // Simple time extraction
    const timeMatch = normalized.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeMatch) metadata.time = timeMatch[1];
    
  } else if (isAction) {
    category = 'ACTION_ITEM';
    priority = /\b(urgent|asap|now|critical)\b/i.test(normalized) ? 'HIGH' : 'NORMAL';
  }

  return {
    id: crypto.randomUUID(),
    raw_text: rawText,
    category: category,
    priority: priority,
    event_timestamp: null, // Would require date math lib or complex logic, omitting for MVP
    metadata_json: JSON.stringify(metadata),
    created_at: Date.now()
  };
};
