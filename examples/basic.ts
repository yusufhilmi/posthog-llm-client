import { PostHogLLM } from '../src';

// Initialize the PostHogLLM client
PostHogLLM.init({
  apiKey: process.env.POSTHOG_API_KEY,
  host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  defaultPrivacyMode: false
});

// Create a simple example function
async function runAIOperation() {
  // Create a trace for the entire operation
  const trace = PostHogLLM.trace({
    name: 'example-operation',
    inputState: { query: 'What is the weather like today?' },
    distinctId: 'user-123', // Or use userEmail
    metadata: { source: 'example' }
  });

  // Create a preprocessing span
  const preprocessSpan = trace.span({
    name: 'preprocess-query',
    inputState: { rawQuery: 'What is the weather like today?' }
  });

  // Simulate some preprocessing work
  await new Promise(resolve => setTimeout(resolve, 100));

  // End the preprocessing span
  preprocessSpan.end({
    outputState: { processedQuery: 'get_weather(today)' }
  });

  // Simulate a call to an LLM
  const generation = trace.generation({
    name: 'weather-response',
    model: 'gpt-4',
    provider: 'openai',
    input: { query: 'get_weather(today)' },
    inputTokens: 5
  });

  // Simulate the LLM call
  await new Promise(resolve => setTimeout(resolve, 500));

  // End the generation
  generation.end({
    output: { response: 'It is sunny and 75°F today.' },
    outputTokens: 10,
    latency: 0.5,
    httpStatus: 200
  });

  // End the trace
  trace.end({
    outputState: { result: 'It is sunny and 75°F today.' }
  });

  console.log('AI operation completed and traced to PostHog!');
}

// Run the example
runAIOperation().catch(console.error);
