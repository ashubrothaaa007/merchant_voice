---
name: Generated client TypeScript libs
description: TypeScript library requirement for the generated API client.
---

Keep `dom.iterable` in the generated React API client's TypeScript `lib` list.

**Why:** The current Orval fetch helper calls `Headers.entries()`, which is absent from the plain `dom` type library and causes generated-client typechecking to fail.

**How to apply:** Preserve this compiler library whenever changing or regenerating the shared API client configuration.