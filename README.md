# @cspotcode/preprocessor

Simple JS-powered preprocessor for code.

## Goals

* Allow arbitrary JS in preprocessor directives for maximum flexibility and simplicity, at the cost of a few extra characters.
* Expose a small set of helper functions to enable common preprocessor scenarios like `include()`ing one file within another.
* Use comments for preprocessor directives so that code is valid even before preprocessing.

## Example

```typescript

// # if(data.EXPORT) {
export {
    foo,
    bar
};
// # include('./other-export-statements.js');
// # }
```

## Helpers

These are available within template directives.

#### `include(relativeFilePath: string): void`

#### `If(conditional: any, callback: () => void): void`

#### `uncommentIf(conditional: any, callback: () => void): void`

#### `print(text: string): void`

#### `capture(callback: () => void)`

## TODO

* `printFile()`
* `uncomment()`
* Sourcemaps?  
* webpack loader (basically requires sourcemap support)
* CLI
