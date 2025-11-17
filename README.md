# json-extend

Custom JSON patch processor that keeps your data immutable while supporting a lightweight DSL for nested objects and arrays.

## Features

- TypeScript-first codebase with strict checks.
- `$extend`, `$prepend`, `$append`, `$remove`, and `$replace` operators.
- Works on plain JSON data but keeps user-provided predicates or mappers callable.
- Dual ESM/CJS outputs via `tsup`.

## Usage

```ts
import { jsonExtend } from 'json-extend';

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

