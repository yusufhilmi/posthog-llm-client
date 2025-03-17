import * as posthog from "posthog-node"
import { v4 as uuidv4 } from "uuid"

/**
 * Options for initializing the PostHogLLM client
 */
export interface PostHogLLMOptions {
  apiKey?: string // PostHog API key
  host?: string // PostHog host URL
  defaultPrivacyMode?: boolean // Default privacy mode
  defaultDistinctId?: string // Default distinct ID (user email)
}

/**
 * Options for creating a trace
 */
export interface TraceOptions {
  id?: string // Optional trace ID
  name: string // Name of the trace
  inputState?: Record<string, any> // Input state
  outputState?: Record<string, any> // Output state
  privacy?: boolean // Privacy mode
  userEmail?: string // User email used as distinct ID
  distinctId?: string // Alternative to userEmail, will be used as distinctId
  metadata?: Record<string, any> // Additional metadata
  properties?: Record<string, string> // Additional properties to be passed to PostHog with each event (string values only)
  isError?: boolean // Whether there was an error
  error?: Error | string // Optional error
}

/**
 * Options for ending a trace
 */
export interface TraceEndOptions {
  outputState?: Record<string, any> // Final output state
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
}

/**
 * Options for creating a span
 */
export interface SpanOptions {
  id?: string // Optional span ID
  name: string // Name of the span
  inputState?: Record<string, any> // Input state
  outputState?: Record<string, any> // Output state
  metadata?: Record<string, any> // Additional metadata
  properties?: Record<string, string> // Additional properties to be passed to PostHog with each event (string values only)
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
  distinctId?: string // Will be set from trace's userEmail or distinctId
}

/**
 * Options for ending a span
 */
export interface SpanEndOptions {
  outputState?: Record<string, any> // Final output state
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
}

/**
 * Options for creating a generation
 */
export interface GenerationOptions {
  name: string // Name of the generation
  model: string // Model name
  provider: string // Provider name (e.g., "openai", "anthropic")
  input: any // Input to the model
  output?: any // Output from the model
  inputTokens?: number // Number of input tokens
  outputTokens?: number // Number of output tokens
  latency?: number // Latency in seconds
  httpStatus?: number // HTTP status code
  baseUrl?: string // Base URL for the provider
  metadata?: Record<string, any> // Additional metadata
  properties?: Record<string, string> // Additional properties to be passed to PostHog with each event (string values only)
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
  distinctId?: string // Will be set from trace's userEmail or distinctId
}

/**
 * Options for ending a generation
 */
export interface GenerationEndOptions {
  output: any // Output from the model
  inputTokens?: number // Number of input tokens
  outputTokens?: number // Number of output tokens
  latency?: number // Latency in seconds
  httpStatus?: number // HTTP status code
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
}

/**
 * Options for creating an embedding
 */
export interface EmbeddingOptions {
  name: string // Name of the embedding
  model: string // Model name
  provider: string // Provider name (e.g., "openai", "anthropic")
  input: string | string[] // Input text(s) to embed
  inputTokens?: number // Number of input tokens
  latency?: number // Latency in seconds
  httpStatus?: number // HTTP status code
  baseUrl?: string // Base URL for the provider
  metadata?: Record<string, any> // Additional metadata
  properties?: Record<string, string> // Additional properties to be passed to PostHog with each event (string values only)
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
  distinctId?: string // Will be set from trace's userEmail or distinctId
}

/**
 * Options for ending an embedding
 */
export interface EmbeddingEndOptions {
  inputTokens?: number // Number of input tokens
  latency?: number // Latency in seconds
  httpStatus?: number // HTTP status code
  error?: Error | string // Optional error
  isError?: boolean // Whether there was an error
}

/**
 * Main class for the PostHog LLM SDK
 */
export class PostHogLLM {
  private static client: posthog.PostHog | null = null
  private static options: PostHogLLMOptions = {
    defaultPrivacyMode: false,
    defaultDistinctId: undefined, // This will not be used by default
  }

  /**
   * Get the default distinct ID
   */
  public static getDefaultDistinctId(): string | undefined {
    return this.options.defaultDistinctId
  }

  /**
   * Initialize the PostHog client
   */
  public static init(options?: PostHogLLMOptions): void {
    this.options = { ...this.options, ...options }

    // Only create client on server side
    if (typeof window === "undefined") {
      const apiKey =
        options?.apiKey || process.env.NEXT_PUBLIC_POSTHOG_KEY || ""
      const host =
        options?.host ||
        process.env.NEXT_PUBLIC_POSTHOG_HOST ||
        "https://us.i.posthog.com"

      this.client = new posthog.PostHog(apiKey, {
        host,
        flushAt: 1, // Immediately send events
      })
    }
  }

  /**
   * Create a new trace
   */
  public static trace(options: TraceOptions): Trace {
    return new Trace({
      ...options,
      privacy: options.privacy ?? this.options.defaultPrivacyMode ?? false,
    })
  }

  /**
   * Get the PostHog client (creating with default options if needed)
   */
  public static getClient(): posthog.PostHog | null {
    if (!this.client && typeof window === "undefined") {
      this.init()
    }
    return this.client
  }
}

/**
 * Trace class for tracking operations
 */
export class Trace {
  private id: string

  /**
   * Get the trace ID
   */
  get traceId(): string {
    return this.id
  }
  private name: string
  private startTime: number
  private inputState?: Record<string, any>
  private outputState?: Record<string, any>
  private privacy: boolean
  private distinctId: string
  private metadata?: Record<string, any>
  private properties?: Record<string, string>
  private isError: boolean = false
  private error?: Error | string

  constructor(options: TraceOptions) {
    this.id = options.id || uuidv4()
    this.name = options.name
    this.startTime = Date.now()
    this.inputState = options.inputState
    this.outputState = options.outputState
    this.privacy = options.privacy ?? false

    // Get distinctId from userEmail or distinctId, throw error if none provided
    if (options.userEmail) {
      this.distinctId = options.userEmail
    } else if (options.distinctId) {
      this.distinctId = options.distinctId
    } else {
      throw new Error(
        "A user email (userEmail) is required for PostHog tracing",
      )
    }

    this.metadata = options.metadata
    this.properties = options.properties
    this.isError = options.isError || false
    this.error = options.error
  }

  /**
   * Update trace properties
   */
  public update(options: Partial<TraceOptions>): this {
    if (options.name) this.name = options.name
    if (options.inputState) this.inputState = options.inputState
    if (options.outputState) this.outputState = options.outputState
    if (options.properties)
      this.properties = { ...this.properties, ...options.properties }
    if (options.metadata)
      this.metadata = { ...this.metadata, ...options.metadata }
    if (options.privacy !== undefined) this.privacy = options.privacy
    if (options.isError !== undefined) this.isError = options.isError
    if (options.error) this.error = options.error
    return this
  }

  /**
   * End the trace and record it to PostHog
   */
  public end(options?: Partial<TraceEndOptions>): this {
    const endTime = Date.now()
    const latency = (endTime - this.startTime) / 1000 // Convert to seconds

    if (options) {
      if (options.outputState) this.outputState = options.outputState
      if (options.error) this.error = options.error
      if (options.isError !== undefined) this.isError = options.isError
    }

    const client = PostHogLLM.getClient()
    if (client) {
      const properties: Record<string, unknown> = {
        $ai_trace_id: this.id,
        $ai_span_id: this.id, // Same as trace_id for traces
        $ai_span_name: this.name,
        $ai_latency: latency,
        $ai_is_error: this.isError,
        ...this.properties, // Include custom properties
      }

      // Only include input/output if privacy mode is off
      if (!this.privacy) {
        if (this.inputState)
          properties.$ai_input_state = JSON.stringify(this.inputState)
        if (this.outputState)
          properties.$ai_output_state = JSON.stringify(this.outputState)
      }

      if (this.metadata) properties.$ai_metadata = JSON.stringify(this.metadata)

      if (this.isError && this.error) {
        properties.$ai_error =
          typeof this.error === "object"
            ? JSON.stringify(this.error)
            : this.error.toString()
      }

      client.capture({
        distinctId: this.distinctId,
        event: "$ai_trace",
        properties,
      })
    }

    return this
  }

  /**
   * Create a new span within this trace
   */
  public span(options: SpanOptions): Span {
    return new Span(this.id, undefined, {
      ...options,
      distinctId: this.distinctId, // Always use the trace's distinctId
      properties: { ...this.properties, ...options.properties }, // Merge trace properties with span properties
    })
  }

  /**
   * Create a new generation within this trace
   */
  public generation(options: GenerationOptions): Generation {
    return new Generation(this.id, {
      ...options,
      distinctId: this.distinctId, // Always use the trace's distinctId
      properties: { ...this.properties, ...options.properties }, // Merge trace properties with generation properties
    })
  }

  /**
   * Create a new embedding within this trace
   */
  public embedding(options: EmbeddingOptions): Embedding {
    return new Embedding(this.id, {
      ...options,
      distinctId: this.distinctId, // Always use the trace's distinctId
      properties: { ...this.properties, ...options.properties }, // Merge trace properties with embedding properties
    })
  }

  /**
   * Get the trace ID
   */
  public getId(): string {
    return this.id
  }
}

/**
 * Span class for tracking operations within a trace
 */
export class Span {
  private id: string
  private distinctId: string

  /**
   * Get the span ID
   */
  get spanId(): string {
    return this.id
  }
  private traceId: string
  private parentId?: string
  private name: string
  private startTime: number
  private inputState?: Record<string, any>
  private outputState?: Record<string, any>
  private metadata?: Record<string, any>
  private properties?: Record<string, string>
  private isError: boolean = false
  private error?: Error | string

  constructor(
    traceId: string,
    parentId: string | undefined,
    options: SpanOptions,
  ) {
    this.id = options.id || uuidv4()
    this.traceId = traceId
    this.parentId = parentId // Spans can have parent spans
    this.name = options.name

    // distinctId should always be passed from trace
    if (!options.distinctId) {
      throw new Error("Span must have a distinctId (passed from trace)")
    }
    this.distinctId = options.distinctId
    this.startTime = Date.now()
    this.inputState = options.inputState
    this.outputState = options.outputState
    this.metadata = options.metadata
    this.properties = options.properties
    this.isError = options.isError || false
    this.error = options.error
  }

  /**
   * Update span properties
   */
  public update(options: Partial<SpanOptions>): this {
    if (options.name) this.name = options.name
    if (options.inputState) this.inputState = options.inputState
    if (options.outputState) this.outputState = options.outputState
    if (options.metadata)
      this.metadata = { ...this.metadata, ...options.metadata }
    if (options.isError !== undefined) this.isError = options.isError
    if (options.error) this.error = options.error
    return this
  }

  /**
   * End the span and record it to PostHog
   */
  public end(options?: Partial<SpanEndOptions>): this {
    const endTime = Date.now()
    const latency = (endTime - this.startTime) / 1000 // Convert to seconds

    if (options) {
      if (options.outputState) this.outputState = options.outputState
      if (options.error) this.error = options.error
      if (options.isError !== undefined) this.isError = options.isError
    }

    const client = PostHogLLM.getClient()
    if (client) {
      const properties: Record<string, unknown> = {
        $ai_trace_id: this.traceId,
        $ai_span_id: this.id,
        $ai_span_name: this.name,
        $ai_parent_id: this.parentId || this.traceId,
        $ai_latency: latency,
        $ai_is_error: this.isError,
        ...this.properties, // Include custom properties
      }

      if (this.inputState)
        properties.$ai_input_state = JSON.stringify(this.inputState)
      if (this.outputState)
        properties.$ai_output_state = JSON.stringify(this.outputState)
      if (this.metadata) properties.$ai_metadata = JSON.stringify(this.metadata)

      if (this.isError && this.error) {
        properties.$ai_error =
          typeof this.error === "object"
            ? JSON.stringify(this.error)
            : this.error.toString()
      }

      client.capture({
        distinctId: this.distinctId,
        event: "$ai_span",
        properties,
      })
    }

    return this
  }

  /**
   * Create a new span within this span
   */
  public span(options: SpanOptions): Span {
    return new Span(this.traceId, this.id, {
      ...options,
      distinctId: this.distinctId, // Always use parent span's distinctId
      properties: { ...this.properties, ...options.properties }, // Merge parent span properties with child span properties
    })
  }

  // According to PostHog's model, spans can only have spans as children.
  // Generations and embeddings can only be created from traces, not spans.

  /**
   * Get the span ID
   */
  public getId(): string {
    return this.id
  }
}

/**
 * Generation class for tracking LLM operations
 */
export class Generation {
  private traceId: string
  private name: string
  private distinctId: string
  private startTime: number
  private model: string
  private provider: string
  private input: any
  private output?: any
  private inputTokens?: number
  private outputTokens?: number
  private latency?: number
  private httpStatus?: number
  private baseUrl?: string
  private metadata?: Record<string, any>
  private properties?: Record<string, string>
  private isError: boolean = false
  private error?: Error | string

  constructor(traceId: string, options: GenerationOptions) {
    this.traceId = traceId
    this.name = options.name

    // distinctId should always be passed from trace
    if (!options.distinctId) {
      throw new Error("Generation must have a distinctId (passed from trace)")
    }
    this.distinctId = options.distinctId
    this.startTime = Date.now()
    this.model = options.model
    this.provider = options.provider
    this.input = options.input
    this.output = options.output
    this.inputTokens = options.inputTokens
    this.outputTokens = options.outputTokens
    this.httpStatus = options.httpStatus
    this.baseUrl = options.baseUrl
    this.metadata = options.metadata
    this.properties = options.properties
    this.isError = options.isError || false
    this.error = options.error
  }

  /**
   * Update generation properties
   */
  public update(options: Partial<GenerationOptions>): this {
    if (options.name) this.name = options.name
    if (options.model) this.model = options.model
    if (options.provider) this.provider = options.provider
    if (options.input) this.input = options.input
    if (options.output) this.output = options.output
    if (options.inputTokens !== undefined)
      this.inputTokens = options.inputTokens
    if (options.outputTokens !== undefined)
      this.outputTokens = options.outputTokens
    if (options.httpStatus !== undefined) this.httpStatus = options.httpStatus
    if (options.baseUrl) this.baseUrl = options.baseUrl
    if (options.metadata)
      this.metadata = { ...this.metadata, ...options.metadata }
    if (options.isError !== undefined) this.isError = options.isError
    if (options.error) this.error = options.error
    return this
  }

  /**
   * End the generation and record it to PostHog
   */
  public end(options?: Partial<GenerationEndOptions>): this {
    const endTime = Date.now()
    this.latency =
      options?.latency !== undefined
        ? options.latency
        : (endTime - this.startTime) / 1000 // Convert to seconds

    if (options) {
      if (options.output) this.output = options.output
      if (options.outputTokens !== undefined)
        this.outputTokens = options.outputTokens
      if (options.httpStatus !== undefined) this.httpStatus = options.httpStatus
      if (options.error) this.error = options.error
      if (options.isError !== undefined) this.isError = options.isError
    }

    const client = PostHogLLM.getClient()
    if (client) {
      const properties: Record<string, unknown> = {
        $ai_trace_id: this.traceId,
        $ai_model: this.model,
        $ai_provider: this.provider,
        $ai_input: JSON.stringify(this.input),
        $ai_latency: this.latency,
        $ai_is_error: this.isError,
        ...this.properties, // Include custom properties
      }

      if (this.output) {
        if (Array.isArray(this.output)) {
          properties.$ai_output_choices = JSON.stringify(this.output)
        } else {
          // If output is not an array, wrap it in an array with a default role
          properties.$ai_output_choices = JSON.stringify([
            { role: "assistant", content: this.output },
          ])
        }
      }
      if (this.inputTokens !== undefined)
        properties.$ai_input_tokens = this.inputTokens
      if (this.outputTokens !== undefined)
        properties.$ai_output_tokens = this.outputTokens
      if (this.httpStatus !== undefined)
        properties.$ai_http_status = this.httpStatus
      if (this.baseUrl) properties.$ai_base_url = this.baseUrl
      if (this.metadata) properties.$ai_metadata = JSON.stringify(this.metadata)

      if (this.isError && this.error) {
        properties.$ai_error =
          typeof this.error === "object"
            ? JSON.stringify(this.error)
            : this.error.toString()
      }

      client.capture({
        distinctId: this.distinctId,
        event: "$ai_generation",
        properties,
      })
    }

    return this
  }

  /**
   * Generations cannot have child spans, generations, or embeddings according to PostHog's model
   */
}

/**
 * Embedding class for tracking embedding operations
 * TODO: needs testing!
 */
export class Embedding {
  private traceId: string
  private name: string
  private distinctId: string
  private startTime: number
  private model: string
  private provider: string
  private input: string | string[]
  private inputTokens?: number
  private latency?: number
  private httpStatus?: number
  private baseUrl?: string
  private metadata?: Record<string, any>
  private properties?: Record<string, string>
  private isError: boolean = false
  private error?: Error | string

  constructor(traceId: string, options: EmbeddingOptions) {
    this.traceId = traceId
    this.name = options.name

    // distinctId should always be passed from trace
    if (!options.distinctId) {
      throw new Error("Embedding must have a distinctId (passed from trace)")
    }
    this.distinctId = options.distinctId
    this.startTime = Date.now()
    this.model = options.model
    this.provider = options.provider
    this.input = options.input
    this.inputTokens = options.inputTokens
    this.httpStatus = options.httpStatus
    this.baseUrl = options.baseUrl
    this.metadata = options.metadata
    this.properties = options.properties
    this.isError = options.isError || false
    this.error = options.error
  }

  /**
   * End the embedding and record it to PostHog
   */
  public end(options?: Partial<EmbeddingEndOptions>): this {
    const endTime = Date.now()
    this.latency =
      options?.latency !== undefined
        ? options.latency
        : (endTime - this.startTime) / 1000 // Convert to seconds

    if (options) {
      if (options.httpStatus !== undefined) this.httpStatus = options.httpStatus
      if (options.error) this.error = options.error
      if (options.isError !== undefined) this.isError = options.isError
    }

    const client = PostHogLLM.getClient()
    if (client) {
      const properties: Record<string, unknown> = {
        $ai_trace_id: this.traceId,
        $ai_model: this.model,
        $ai_provider: this.provider,
        $ai_input:
          typeof this.input === "string"
            ? this.input
            : JSON.stringify(this.input),
        $ai_latency: this.latency,
        $ai_is_error: this.isError,
        ...this.properties, // Include custom properties
      }
      if (this.inputTokens !== undefined)
        properties.$ai_input_tokens = this.inputTokens
      if (this.httpStatus !== undefined)
        properties.$ai_http_status = this.httpStatus
      if (this.baseUrl) properties.$ai_base_url = this.baseUrl
      if (this.metadata) properties.$ai_metadata = JSON.stringify(this.metadata)

      if (this.isError && this.error) {
        properties.$ai_error =
          typeof this.error === "object"
            ? JSON.stringify(this.error)
            : this.error.toString()
      }

      client.capture({
        distinctId: this.distinctId,
        event: "$ai_embedding",
        properties,
      })
    }

    return this
  }

  /**
   * Embeddings cannot have child spans, generations, or embeddings according to PostHog's model
   */
}
