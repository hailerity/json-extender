type PlainObject = Record<string, unknown>;

type ArrayPredicate = (
  item: unknown,
  index: number,
  array: readonly unknown[]
) => boolean;

type ReplacementValue =
  | unknown
  | readonly unknown[]
  | ((
      item: unknown,
      index: number,
      array: readonly unknown[]
    ) => unknown | readonly unknown[]);

type ArrayPatch = {
  readonly $prepend?: readonly unknown[];
  readonly $append?: readonly unknown[];
  readonly $remove?: ArrayPredicate;
  readonly $replace?: readonly {
    readonly filter: ArrayPredicate;
    readonly replacement: ReplacementValue;
  }[];
};

type ObjectPatch = PlainObject & {
  readonly $extend?: PlainObject;
  readonly $override?: PlainObject;
};

export interface JsonExtendOptions {
  readonly mutate?: boolean;
}

const ARRAY_OPERATOR_KEYS = new Set<keyof ArrayPatch>([
  '$prepend',
  '$append',
  '$remove',
  '$replace'
]);

const OBJECT_OPERATOR_KEYS = new Set<keyof ObjectPatch>(['$extend', '$override']);

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  if (isPlainObject(value)) {
    return Object.entries(value).reduce<PlainObject>((acc, [key, entry]) => {
      acc[key] = cloneValue(entry);
      return acc;
    }, {}) as T;
  }

  if (Array.isArray(value)) {
    return value.map(entry => cloneValue(entry)) as T;
  }

  return value;
};

const isArrayOperatorPatch = (value: unknown): value is ArrayPatch =>
  isPlainObject(value) &&
  Object.keys(value).some(key => ARRAY_OPERATOR_KEYS.has(key as keyof ArrayPatch));

const extractObjectOperators = (
  patch: ObjectPatch
): { operators: Partial<ObjectPatch>; rest: PlainObject } => {
  const operators: Partial<ObjectPatch> = {};
  const rest: PlainObject = {};

  for (const [key, value] of Object.entries(patch)) {
    if (OBJECT_OPERATOR_KEYS.has(key as keyof ObjectPatch)) {
      operators[key as keyof ObjectPatch] = value;
    } else {
      rest[key] = value;
    }
  }

  return { operators, rest };
};

const applyArrayPatch = (target: unknown, patch: ArrayPatch): unknown[] => {
  const prependItems =
    patch.$prepend?.map(item => cloneValue(item)) ?? ([] as unknown[]);
  const appendItems =
    patch.$append?.map(item => cloneValue(item)) ?? ([] as unknown[]);

  let result = Array.isArray(target)
    ? target.map(item => cloneValue(item))
    : ([] as unknown[]);

  if (patch.$remove) {
    result = result.filter((item, index, array) => !patch.$remove!(item, index, array));
  }

  if (patch.$replace) {
    result = result.flatMap((item, index, array) => {
      for (const rule of patch.$replace!) {
        if (rule.filter(item, index, array)) {
          const replacement =
            typeof rule.replacement === 'function'
              ? rule.replacement(item, index, array)
              : rule.replacement;

          if (Array.isArray(replacement)) {
            return replacement.map(entry => cloneValue(entry));
          }

          return [cloneValue(replacement)];
        }
      }

      return [item];
    });
  }

  result = [...prependItems, ...result, ...appendItems];

  return result;
};

const mergeObjects = (
  target: unknown,
  patch: PlainObject,
  options?: { override?: boolean }
): PlainObject => {
  const targetObject = isPlainObject(target) ? target : {};
  const result: PlainObject = {};

  const keys = options?.override
    ? new Set(Object.keys(patch))
    : new Set([...Object.keys(targetObject), ...Object.keys(patch)]);

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      result[key] = applyNode(targetObject[key], patch[key]);
    } else {
      result[key] = cloneValue(targetObject[key]);
    }
  }

  return result;
};

const applyObjectPatch = (target: unknown, patch: ObjectPatch): PlainObject => {
  const { operators, rest } = extractObjectOperators(patch);
  let base = isPlainObject(target) ? target : {};

  if (operators.$override) {
    if (!isPlainObject(operators.$override)) {
      throw new TypeError('$override expects a plain object');
    }

    base = mergeObjects(base, operators.$override, { override: true });
  } else if (operators.$extend) {
    if (!isPlainObject(operators.$extend)) {
      throw new TypeError('$extend expects a plain object');
    }

    base = mergeObjects(base, operators.$extend);
  } else {
    base = cloneValue(base);
  }

  if (Object.keys(rest).length === 0) {
    return base;
  }

  return mergeObjects(base, rest);
};

const applyNode = (target: unknown, patch: unknown): unknown => {
  if (isArrayOperatorPatch(patch)) {
    return applyArrayPatch(target, patch);
  }

  if (isPlainObject(patch)) {
    return applyObjectPatch(target, patch);
  }

  if (Array.isArray(patch)) {
    return patch.map(item => cloneValue(item));
  }

  return cloneValue(patch);
};

const syncArrays = (target: unknown[], source: unknown[]): unknown[] => {
  target.length = 0;
  for (const item of source) {
    target.push(item);
  }
  return target;
};

const syncPlainObjects = (target: PlainObject, source: PlainObject): PlainObject => {
  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      delete target[key];
    }
  }

  for (const [key, value] of Object.entries(source)) {
    const current = target[key];

    if (isPlainObject(value) && isPlainObject(current)) {
      syncPlainObjects(current, value);
      continue;
    }

    if (Array.isArray(value) && Array.isArray(current)) {
      syncArrays(current, value);
      continue;
    }

    target[key] = value;
  }

  return target;
};

const applyPatch = (target: unknown, patch: unknown): unknown => {
  return applyNode(target, patch);
};

export const jsonExtend = <T>(
  target: T,
  patch: unknown,
  options?: JsonExtendOptions
): T => {
  const result = applyPatch(target, patch) as T;

  if (!options?.mutate) {
    return result;
  }

  if (Array.isArray(target) && Array.isArray(result)) {
    syncArrays(target, result);
    return target;
  }

  if (isPlainObject(target) && isPlainObject(result)) {
    syncPlainObjects(target, result);
    return target;
  }

  return result;
};

