# RevExp

This library calculates the possible inputs for a given regular expression.

The supported syntax is modelled on the standard Javascript `RegExp` object's syntax.

You can [try it online](https://regex.davidje13.com/) or in the terminal:

```bash
npx revexp 'H(alp|el{2,}[o]) (Wor|wo)lds?' '??????W????'
```

## Supported Features

| Pattern Feature          | Examples                    | Support       |
|--------------------------|-----------------------------|---------------|
| Character classes        | `a` `[aeiou]` `[^a-z]` `\d` | &#x2705; Full |
| Character escapes        | `\u0020` `\\` `\n` `\(`     | &#x2705; Full |
| Unicode property escapes | `\p{Letter}`                | &#x274C; None |
| Branching                | `x\|y`                      | &#x2705; Full |
| Anchors                  | `^` `$`                     | &#x2705; Full |
| Word boundary assertions | `\b` `\B`                   | Partial &dagger; |
| Standard quantifiers     | `a*` `a+` `a?`              | &#x2705; Full |
| Range quantifiers        | `a{2}` `a{2,}` `a{2,3}`     | &#x2705; Full |
| Lazy quantifiers         | `a+?` `a*?` `a??` `a{2,}?`  | &#x2705; Full |
| Possessive quantifiers   | `a++` `a*+` `a?+` `a{2,}+`  | &#x274C; None |
| Groups                   | `(abc)` `(?<name>abc)`      | &#x2705; Full |
| Backreferences           | `(abc)\1` `(?<x>abc)\k<x>`  | &#x274C; None |
| Non-capturing groups     | `(?:abc)`                   | &#x2705; Full |
| Positive lookaheads      | `(?=abc)`                   | &#x274C; None |
| Negative lookaheads      | `(?!abc)`                   | &#x274C; None |
| Positive lookbehinds     | `(?<=abc)`                  | &#x274C; None |
| Negative lookbehinds     | `(?<!abc)`                  | &#x274C; None |

&dagger;: This syntax is accepted and invalid inputs will be rejected, but the library may not be
able to fully narrow inputs when using patterns which include this feature.

| Flag | Meaning                        | Support        |
|------|--------------------------------|----------------|
| `d`  | Output substring match indices | Not applicable |
| `g`  | Global search                  | Not applicable |
| `i`  | Case-insensitive search        | None (`false`) |
| `m`  | Multi-line search              | None (`false`) |
| `s`  | `.` matches newline            | &#x2705; Full  |
| `u`  | Unicode mode                   | None (`false`) |
| `y`  | Sticky search                  | Not applicable |

## Usage

### Library

```shell
npm install --save revexp
```

```javascript
import RevExp from 'revexp';

// compile the pattern
const pattern = new RevExp('a[bc]|x[yz]');

// provide already known information - the first character is unknown, the second must be "c"
const known = RevExp.string('?c', '?');

// resolve as much of the data as possible
const resolved = pattern.reverse(known);

// print it in a human-friendly format
console.log(String(resolved)); // "ac"
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

| pattern              | input      | output                 |
|----------------------|------------|------------------------|
| `(hello\|hi)`        | `??`       | `hi`                   |
| `(hello\|hi)`        | `?????`    | `hello`                |
| `(hello\|hi) *`      | `?????`    | `h[ei][ l][ l][ o]`    |
| `(hello\|hi) *`      | `???? `    | `hi  `                 |
| `(a[bc]d\|e(f\|gh))` | `???`      | `[ae][bcg][dh]`        |
| `(a[bc]d\|e(f\|gh))` | `?g?`      | `egh`                  |
| ` *a{4} +a{2} *`     | `????????` | `[ a]aaa[ a][ a]a[ a]` |

## Performance and Security Considerations

Matching is performed using an algorithm which executes in linear time on the size of the input
for a given pattern. This means it is not vulnerable to catastrophic backtracking (but note that
untrusted patterns can take arbitrarily long to compile and use an unbounded amount of memory).

## API

### `RevExp`

This object stores a compiled regular expression. It is analogous to Javascript's native `RegExp`.
Construction is expensive, as it must compile the regular expression into a graph form. Once created,
the `RevExp` object can be used repeatedly.

#### constructor

```javascript
const revexp = new RevExp('pattern');
const revexp = new RevExp(/existing regex/);
const revexp = RevExp.compile('pattern');
```

Creates a new `RevExp` object, compiling the pattern into an internal graph ready for use.
The `.compile` form is just an alias; functionally both forms are the same.

If you pass in a `RegExp` or `RevExp` object, the pattern will be extracted and compiled.
Note that this project is not 100% compatible with `RegExp` features (see above for details).

#### `RevExp.string(input[, unknown])`

```javascript
const characterClassString = RevExp.string('foobar');
const characterClassString = RevExp.string('foob**', '*');
const characterClassString = RevExp.string(myCharClassArray);
```

Converts `input` into a character class array.

When invoked with a string `input` and no `unknown` parameter, the string is taken literally
(i.e. it assumes all characters are known).

When invoked with a string `input` and an `unknown` parameter, any occurence of `unknown`
within `input` is replaced with `CharacterClass.ANY`.

When invoked with an existing character class array, this will copy the array but make no
changes to the values (this can be used to avoid mutating the original, for example).

The returned array has an overloaded `toString` which allows easy pretty-printing.

#### `.test(input[, unknown])`

```javascript
const success = myRevExp.test('foobar');
const success = myRevExp.test('foob**', '*');
const success = myRevExp.test(myCharClassArray);
```

Tests if `input` matches (or can match) the regular expression. Returns `true` if a match
is possible, or `false` if no match is possible.

For an explanation of the `input` and `unknown` parameters, see the information for
`RevExp.string` above.

For the most control, invoke with a character class array. This allows you to pass in exact
ranges for each character. For example:

```javascript
const input = [
  RevExp.CharacterClass.of('f'), // literal 'f'
  RevExp.CharacterClass.of('o'),
  RevExp.CharacterClass.of('o'),
  RevExp.CharacterClass.of('bz'), // 'b' or 'z'
  RevExp.CharacterClass.WORD, // a-zA-Z0-9_
  RevExp.CharacterClass.ANY, // anything
];
// input is equivalent to a pattern of 'foo[bz]\w.'
const success = myRevExp.test(input);
```

##### Examples

```javascript
const revexp = new RevExp('(hello|hi+)');

console.log(revexp.test('hello')); // true
console.log(revexp.test('hi')); // true
console.log(revexp.test('nope')); // false
console.log(revexp.test('words hello words')); // false
console.log(revexp.test('h????')); // false
console.log(revexp.test('he???', '?')); // true
console.log(revexp.test('he??', '?')); // false
```

#### `.reverse(input[, unknown])`

```javascript
const restrictions = myRevExp.reverse('foobar');
const restrictions = myRevExp.reverse('foob**', '*');
const restrictions = myRevExp.reverse(myCharClassArray);
```

Returns a character class array with the tightest possible restrictions on the characters
based on the regular expression and the given `input`. If no matches are possible, returns
`null`.

For an explanation of the `input` and `unknown` parameters, see the information for
`RevExp.string` above.

The returned array has an overloaded `toString` which allows easy pretty-printing.

##### Examples

```javascript
const revexp = new RevExp('(hello|hi+)');

console.log(String(revexp.reverse('hello'))); // hello
console.log(String(revexp.reverse('nope'))); // null
console.log(String(revexp.reverse('he???'))); // null
console.log(String(revexp.reverse('he???', '?'))); // hello
console.log(String(revexp.reverse('h????', '?'))); // h[ei][il][il][io]
```

### `RevExp.CharacterClass`

This object stores character class information (e.g. `[a-z]`). It also has various
convenience constants defined for common character classes.

The `CharacterClass` object is immutable.

#### constants

```javascript
RevExp.CharacterClass.ANY     // .
RevExp.CharacterClass.NONE    // [^]
RevExp.CharacterClass.NUMERIC // [0-9]
RevExp.CharacterClass.WORD    // [a-zA-Z0-9_]
RevExp.CharacterClass.NEWLINE // various unicode newline characters
RevExp.CharacterClass.SPACE   // various unicode space characters
```

#### constructor

There are various helpers available for building custom `CharacterClass`es:

```javascript
RevExp.CharacterClass.of('c')
RevExp.CharacterClass.of('ax')
RevExp.CharacterClass.of(['a', 'x'])
RevExp.CharacterClass.ofCode(0x20)
RevExp.CharacterClass.range('a', 'z')
RevExp.CharacterClass.union(cc1, cc2, cc3, ...)
```

#### `toString`

As a convenience, `CharacterClass` has a `toString` which will render the class in the
standard regular expression format;

```javascript
console.log(String(RevExp.CharacterClass.of('c'))) // 'c'
console.log(String(RevExp.CharacterClass.of('ax'))) // '[ax]'
console.log(String(RevExp.CharacterClass.range('a', 'z'))) // '[a-z]'
console.log(String(RevExp.CharacterClass.of('abcdz'))) // '[a-dz]'
console.log(String(RevExp.CharacterClass.of('a').inverse())) // '[^a]'
```

#### `includes(char)`

Returns `true` if the character class contains the given character.

#### `isEmpty()`

Returns `true` if the character class contains no characters (i.e. is impossible).

#### `isSingular()`

Returns `true` if the character class contains exactly one character (i.e. is fully resolved).

#### `singularChar()`

Returns the single character represented by this character class. If the class represents more
than one character (or no characters), this throws an error.

#### `intersects(other)`

Returns `true` if there is any overlap between the two character classes.

#### `intersect(other)`

Returns a new character class which contains only the characters shared by both character classes.

#### `union(other)`

Returns a new character class which contains all characters contained in either character class.

#### `rangeTo(other)`

Returns a new character class which represents the range of characters from the current character
to the target character (inclusive at both sides). The order does not matter.

This method can only be invoked on `singular` character classes.

#### `inverse()`

Returns a new character class which is the inverse of the current class (i.e. any character in
this class is not in the returned class, and vice-versa).
