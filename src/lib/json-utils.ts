/**
 * JSON serialization utilities for handling BigInt values
 * 
 * BigInt values cannot be serialized by JSON.stringify by default.
 * This module provides utilities to convert BigInt to string for safe serialization.
 */

/**
 * Converts BigInt values in an object to strings for JSON serialization.
 * This handles nested objects and arrays recursively.
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value)
    }
    return result as T
  }

  return obj
}

/**
 * Custom JSON replacer function for BigInt values.
 * Use with JSON.stringify: JSON.stringify(obj, bigIntReplacer)
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

/**
 * Safely stringify an object that may contain BigInt values.
 */
export function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, bigIntReplacer)
}
