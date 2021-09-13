# RevExp

This library calculates the possible inputs for a given regular expression.

It currently supports all `RegExp` features except lookaheads, lookbehinds, backreferences,
flags, and unicode character classes. Word boundaries (`\b` / `\B`) are partially supported
(may not be fully resolved).

## Usage

### Library

```javascript
import { RevExp, CharacterRange } from 'revexp';

// compile the pattern
const pattern = new RevExp('a[bc]|x[yz]');

// provide already known information - the first character is unknown, the second must be "c"
const known = CharacterRange.string('?c', '?');

// resolve as much of the data as possible
const resolved = pattern.reverse(known);

// print it in a human-friendly format
console.log(CharacterRange.print(resolved)); // "ac"
```

### CLI

```bash
npx revexp 'a[bc]|x[yz]' '?c'
```

You can also optionally change the "unknown character":

```bash
npx revexp -u'.' 'a[bc]|x[yz]' '.c'
```

## Examples

| pattern            | input      | output                 |
|--------------------|------------|------------------------|
| `(hello|hi)`       | `??`       | `hi`                   |
| `(hello|hi)`       | `?????`    | `hello`                |
| `(hello|hi) *`     | `?????`    | `h[ei][ l][ l][ o]`    |
| `(hello|hi) *`     | `???? `    | `hi   `                |
| `(a[bc]d|e(f|gh))` | `???`      | `[ae][bcg][dh]`        |
| `(a[bc]d|e(f|gh))` | `?g?`      | `egh`                  |
| ` *a{4} +a{2} *`   | `????????` | `[ a]aaa[ a][ a]a[ a]` |
