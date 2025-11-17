import { jsonExtend } from '../src/index.js';

describe('jsonExtend', () => {
  it('replaces primitive properties (basic merge)', () => {
    const result = jsonExtend({ name: 'Old' }, { name: 'New' });

    expect(result).toEqual({ name: 'New' });
  });

  it('extends nested objects via $extend', () => {
    const result = jsonExtend(
      { config: { a: 1 } },
      { config: { $extend: { b: 2 } } }
    );

    expect(result).toEqual({ config: { a: 1, b: 2 } });
  });

  it('supports $prepend and $append for arrays', () => {
    const result = jsonExtend(
      { list: [2, 3] },
      { list: { $prepend: [1], $append: [4] } }
    );

    expect(result).toEqual({ list: [1, 2, 3, 4] });
  });

  it('removes items using $remove', () => {
    const result = jsonExtend(
      { list: [1, 2, 3, 4] },
      { list: { $remove: (n: number) => n % 2 === 0 } }
    );

    expect(result).toEqual({ list: [1, 3] });
  });

  it('replaces items using $replace', () => {
    const result = jsonExtend(
      { tags: ['red', 'green', 'blue'] },
      {
        tags: {
          $replace: [
            {
              filter: (tag: string) => tag === 'green',
              replacement: 'lime'
            }
          ]
        }
      }
    );

    expect(result).toEqual({ tags: ['red', 'lime', 'blue'] });
  });

  it('allows $replace to emit multiple items', () => {
    const result = jsonExtend(
      { items: [2, 3, 4] },
      {
        items: {
          $replace: [
            {
              filter: (n: number) => n === 3,
              replacement: (n: number) => [n * 10, n * 10 + 1]
            }
          ]
        }
      }
    );

    expect(result).toEqual({ items: [2, 30, 31, 4] });
  });

  it('composes multiple operators together', () => {
    const result = jsonExtend(
      { a: 1, list: [1, 2], config: { a: 1 } },
      {
        a: 2,
        list: { $append: [3], $prepend: [0] },
        config: { $extend: { b: 2 } }
      }
    );

    expect(result).toEqual({ a: 2, list: [0, 1, 2, 3], config: { a: 1, b: 2 } });
  });
});

