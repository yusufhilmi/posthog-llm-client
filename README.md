# PostHog LLM SDK

A lightweight SDK for tracing AI operations in your applications with PostHog. This SDK provides a simple interface for tracking traces, spans, and generations, allowing you to monitor the performance and behavior of your AI operations.

## Features

- **Hierarchical Tracing**: Create traces containing spans, generations, and embeddings
- **Nested Spans**: Spans can have parent spans for detailed operation tracking
- **Performance Monitoring**: Automatically track latency for all operations
- **Error Tracking**: Record errors and their details
- **Privacy Controls**: Control what data is sent to PostHog
- **Flexible Metadata**: Add custom metadata to any operation
- **Custom Properties**: Add custom string properties that get passed to PostHog with each event
- **Inheritable Properties**: Properties defined on a trace are inherited by all child spans, generations, and embeddings
- **Non-blocking**: All operations send events directly to PostHog without blocking your application

## Installation

Not published on npm, hopefully posthog team just does this for us on `@posthog/ai` package so that i dont have to maintain this.

The package depends on:

- `posthog-node`: For sending events to PostHog
- `uuid`: For generating unique IDs

## Quick Start

```typescript
import { PostHogLLM } from 'posthog-llm';

// Initialize the PostHogLLM client (do this once at app startup)
PostHogLLM.init({
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaultPrivacyMode: false,
});

// Create a trace for your operation
const trace = PostHogLLM.trace({
  name: 'my-operation',
  inputState: { query: 'What is the capital of France?' },
  distinctId: 'user-123', // Optional user ID
});

// End the trace when your operation is complete
trace.end({
  outputState: { result: 'Paris' },
});
```

## Creating Traces, Spans, Generations, and Embeddings

### Traces

Traces represent the top-level operation being performed:

```typescript
const trace = PostHogLLM.trace({
  name: 'my-operation',
  inputState: { query: 'What is the capital of France?' },
  userEmail: 'user@example.com', // User email as distinct ID
  privacy: false, // Whether to hide input/output data
  metadata: { additionalInfo: 'value' }, // Any extra data to record
  properties: { project_id: 'my-project', environment: 'production' }, // Custom properties (string values only)
});

// Update trace properties
trace.update({
  metadata: { moreInfo: 'updated value' },
  properties: { feature_flag: 'enabled', user_type: 'premium' }, // Add/update custom properties
});

// End the trace and send to PostHog
trace.end({
  outputState: { result: 'Paris' },
  isError: false,
});
```

### Spans

Spans represent sub-operations within a trace or another span:

```typescript
const span = trace.span({
  name: 'data-preparation',
  inputState: { rawQuery: 'What is the capital of France?' },
  properties: { operation_type: 'preprocessing' }, // Add span-specific properties
});

// Do some work...

// End the span
span.end({
  outputState: { processedQuery: 'capital of France' },
});

// Create a nested span
const nestedSpan = span.span({
  name: 'tokenization',
  inputState: { text: 'capital of France' },
});

// End the nested span
nestedSpan.end({
  outputState: { tokens: ['capital', 'of', 'France'] },
});
```

### Generations

Generations represent calls to AI models:

```typescript
const generation = trace.generation({
  name: 'llm-response',
  model: 'gpt-4',
  provider: 'openai',
  input: [{ role: 'user', content: 'What is the capital of France?' }],
  inputTokens: 10,
  properties: { request_id: 'req-123', model_version: 'latest' }, // Add generation-specific properties
});

// After getting the AI response
generation.end({
  output: [{ role: 'assistant', content: 'The capital of France is Paris.' }],
  outputTokens: 8,
  latency: 0.5, // Optional: provide exact latency in seconds
  httpStatus: 200,
});

// Note: According to PostHog's model, generations can't have child operations
// If you need to capture a post-processing operation, create a span directly from the trace
const postProcessSpan = trace.span({
  name: 'post-processing',
  inputState: { aiResponse: 'The capital of France is Paris.' },
});

// End the post-process span
postProcessSpan.end({
  outputState: { finalResponse: 'Paris' },
});
```

### Embeddings

Embeddings track vector embeddings of text:

```typescript
const embedding = trace.embedding({
  name: 'text-embedding',
  model: 'text-embedding-3-small',
  provider: 'openai',
  input: 'What is the capital of France?',
  inputTokens: 10,
  properties: { index_name: 'knowledge-base', embedding_type: 'query' }, // Add embedding-specific properties
});

// End the embedding once complete
embedding.end({
  httpStatus: 200,
  latency: 0.3, // Optional: provide exact latency in seconds
});

// Note: According to PostHog's model, embeddings can't have child operations
// If you need to capture a vector search operation, create a span directly from the trace
const vectorSearchSpan = trace.span({
  name: 'vector-search',
  inputState: { query: 'What is the capital of France?' },
});

// End the span
vectorSearchSpan.end({
  outputState: { results: ['Paris', 'France', 'Europe'] },
});
```

## Error Handling

You can track errors at any level:

```typescript
try {
  // Do some work that might fail
} catch (error) {
  span.end({
    error, // The error object
    isError: true,
    outputState: { failed: true },
  });
}
```

## Complete Example

Here's a complete example of using the SDK for a typical AI operation:

```typescript
// Initialize the client (once at app startup)
PostHogLLM.init({
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

async function getAnswerFromAI(question, userId) {
  // Create a trace for the overall operation
  const trace = PostHogLLM.trace({
    name: 'answer-question',
    inputState: { question },
    userEmail: userId,
    properties: { platform: 'web', session_id: 'sess-789' },
  });

  try {
    // Create a span for preprocessing
    const preprocessSpan = trace.span({
      name: 'preprocess-question',
      inputState: { rawQuestion: question },
    });

    // Do preprocessing
    const enhancedQuestion = enhanceQuestion(question);

    // End preprocessing span
    preprocessSpan.end({
      outputState: { enhancedQuestion },
    });

    // Create a generation for the AI call
    const aiGeneration = trace.generation({
      name: 'llm-call',
      model: 'gpt-4',
      provider: 'openai',
      input: [{ role: 'user', content: enhancedQuestion }],
    });

    // Make the AI call
    const startTime = Date.now();
    const response = await callAI(enhancedQuestion);
    const latency = (Date.now() - startTime) / 1000;

    // End the generation
    aiGeneration.end({
      output: response.content,
      outputTokens: response.usage.completion_tokens,
      latency,
      httpStatus: 200,
    });

    // Create a span for postprocessing
    const postprocessSpan = trace.span({
      name: 'postprocess-answer',
      inputState: { rawAnswer: response.content },
    });

    // Do postprocessing
    const finalAnswer = formatAnswer(response.content);

    // End postprocessing span
    postprocessSpan.end({
      outputState: { finalAnswer },
    });

    // End the trace successfully
    trace.end({
      outputState: { answer: finalAnswer, success: true },
    });

    return finalAnswer;
  } catch (error) {
    // End the trace with error
    trace.end({
      error,
      isError: true,
      outputState: { success: false },
    });

    throw error; // Re-throw the error
  }
}
```

## PostHog Event Structure

The SDK sends the following events to PostHog:

- `$ai_trace`: For traces
- `$ai_span`: For spans
- `$ai_generation`: For generations
- `$ai_embedding`: For embeddings

Each event includes:
- `$ai_trace_id`: The ID of the trace
- `$ai_parent_id`: The ID of the parent operation (if applicable)
- `$ai_latency`: The latency in seconds
- `$ai_is_error`: Whether there was an error
- Additional properties specific to the type of operation
- Any custom properties passed to the trace or operation

## Notes on Privacy

- Set `privacy: true` on a trace to prevent input and output states from being sent to PostHog
- You can set a default privacy mode when initializing the client with `defaultPrivacyMode: true`
- Consider what information you include in `inputState` and `outputState`

## Working with Properties

- Properties are always key-value pairs with string values only
- Properties defined on a trace are automatically passed to all child operations (spans, generations, embeddings)
- Child operations can define their own properties that will be merged with the trace properties
- Properties added to a trace after creating child operations won't be automatically added to previously created children
- Use snake_case for property names (e.g., `project_id` instead of `projectId`) to follow PostHog naming conventions
