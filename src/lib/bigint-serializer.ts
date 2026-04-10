// BigInt serialization utility
// JSON.stringify cannot serialize BigInt values by default
// This utility provides functions to safely serialize objects containing BigInts

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
    for (const key of Object.keys(obj)) {
      const value = (obj as Record<string, unknown>)[key]
      result[key] = serializeBigInt(value)
    }
    return result as T
  }

  return obj
}

export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

export function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, bigIntReplacer)
}