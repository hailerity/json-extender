# json-extender

[![npm version](https://img.shields.io/npm/v/json-extender.svg)](https://www.npmjs.com/package/json-extender)
[![npm downloads](https://img.shields.io/npm/dm/json-extender.svg)](https://www.npmjs.com/package/json-extender)
[![license](https://img.shields.io/github/license/hailerity/json-extender.svg)](LICENSE)

Custom JSON patch processor that keeps your data immutable while supporting a lightweight DSL for nested objects and arrays.

## Features

- TypeScript-first codebase with strict checks.
- `$extend`, `$override`, `$prepend`, `$append`, `$remove`, and `$replace` operators.
- Works on plain JSON data but keeps user-provided predicates or mappers callable.
- Dual ESM/CJS outputs via `tsup`.

## Installation

```bash
npm install json-extender
# or
pnpm add json-extender
# or
yarn add json-extender
```

## Usage

```ts
import { jsonExtend } from 'json-extender';

const result = jsonExtend(
  {
    profile: { name: 'Ada', tags: ['math'] },
    list: [2, 3]
  },
  {
    profile: { $extend: { company: 'Analytical Engines' } },
    list: { $prepend: [1], $append: [4] }
  }
);

console.log(result);
// {
//   profile: { name: 'Ada', tags: ['math'], company: 'Analytical Engines' },
//   list: [1, 2, 3, 4]
// }
```

### Mutating vs. immutable mode

By default, `jsonExtend` returns a new object, leaving the input untouched. Pass `{ mutate: true }` as the third argument to update the original structure (and its nested arrays) in place:

```ts
const state = { list: [1, 2] };
jsonExtend(state, { list: { $append: [3] } }, { mutate: true });

console.log(state.list); // [1, 2, 3]
```

Array operators accept inline predicates or mapping functions:

```ts
const patched = jsonExtend(
  { tags: ['red', 'green', 'blue'] },
  {
    tags: {
      $replace: [{ filter: t => t === 'green', replacement: 'lime' }],
      $remove: color => color === 'blue'
    }
  }
);
```

## Operators

### `$extend` – deep object merge

- **Use when:** You want to merge in nested properties without replacing the entire object.
- **Behavior:** Deep merges a plain-object payload into the existing object. Keys in the patch override target keys; unmatched keys are preserved.
- **Example:**

```ts
jsonExtend(
  { profile: { name: 'Ada', links: { github: '@ada' } } },
  { profile: { $extend: { links: { twitter: '@ada' } } } }
);
// → { profile: { name: 'Ada', links: { github: '@ada', twitter: '@ada' } } }
```

### `$override` – replace object properties

- **Use when:** You want to replace the keys of an object with new ones, effectively removing keys not in the patch.
- **Behavior:** Replaces the target object's keys with those in the `$override` value. Properties that are present in both the target and the patch are merged recursively.
- **Example:**

```ts
jsonExtend(
  { profile: { name: 'Ada', avatar: 'ada.png' } },
  { profile: { $override: { company: 'Analytical Engines' } } }
);
// → { profile: { company: 'Analytical Engines' } }
// Note: 'name' and 'avatar' are removed.
```

If properties overlap, they are still merged:

```ts
jsonExtend(
  { settings: { theme: 'dark', notifications: true } },
  { settings: { $override: { theme: 'light' } } }
);
// → { settings: { theme: 'light' } }
```

### `$prepend` – add items to the beginning of an array

- **Use when:** You need to insert items at the front without mutating the source array.
- **Behavior:** Treats the existing value as an array (or empty if absent) and concatenates new values before it.
- **Example:**

```ts
jsonExtend({ queue: ['b', 'c'] }, { queue: { $prepend: ['a'] } });
// → { queue: ['a', 'b', 'c'] }
```

### `$append` – add items to the end of an array

- **Use when:** You want to push items to the tail immutably.
- **Behavior:** Treats the existing value as an array (or empty) and concatenates new values after it.
- **Example:**

```ts
jsonExtend({ queue: ['a', 'b'] }, { queue: { $append: ['c'] } });
// → { queue: ['a', 'b', 'c'] }
```

### `$remove` – filter array entries

- **Use when:** You need to drop items matching a predicate.
- **Behavior:** Accepts a predicate `(item, index, array) => boolean`. Items for which the predicate returns `true` are removed.
- **Example:**

```ts
jsonExtend(
  { list: [1, 2, 3, 4] },
  { list: { $remove: n => n % 2 === 0 } }
);
// → { list: [1, 3] }
```

### `$replace` – replace items in place

- **Use when:** You want to substitute items based on custom logic.
- **Behavior:** Takes an array of rules. Each rule has a `filter` predicate and a `replacement`. When `filter` returns `true`, the replacement value is used. Replacement can be:
  - A literal value
  - A function `(item, index, array) => value | value[]`
  - An array to splice multiple items in place of one
- **Example (single value):**

```ts
jsonExtend(
  { tags: ['red', 'green', 'blue'] },
  {
    tags: {
      $replace: [{ filter: tag => tag === 'green', replacement: 'lime' }]
    }
  }
);
// → { tags: ['red', 'lime', 'blue'] }
```

- **Example (multiple values):**

```ts
jsonExtend(
  { items: [2, 3, 4] },
  {
    items: {
      $replace: [
        {
          filter: n => n === 3,
          replacement: n => [n * 10, n * 10 + 1]
        }
      ]
    }
  }
);
// → { items: [2, 30, 31, 4] }
```

## Scripts

- `npm run build` – bundler output (`dist/`) with types and sourcemaps.
- `npm run dev` – watch mode for iterative development.
- `npm run test` – run Jest once.
- `npm run test:watch` – re-run tests on change.
- `npm run clean` – remove build artifacts.

## Publishing

1. `npm test`
2. `npm run build`
3. `npm version <patch|minor|major>`
4. `npm publish`

