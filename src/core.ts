import { nodeHost } from "./node-host";
import {template, pick, mapValues} from 'lodash'; 
import { TI } from 'typescript-toolbelt';

/** Abstraction for OS filesystem access */
export interface Host {
    dirname(path: string): string;
    /** synchronously read a file from disc */
    readFile(filePath: string): string;
    /** If `targetPath` is relative, gets full path relative to `relateToPath` */
    resolvePath(relativeToPath: string, targetPath: string): string;
}

/** regexp that can never match anything and has a single capture group */
const neverMatch = /^(b)/;
/** regexp that matches //#-style single-line comments */
const jsSlashSlashHash = /(?:\r?\n|^)\s*\/\/+\s*#(.*?)(?=\r?\n|$)/;

export interface PreprocessOptions {
    /** Available as `data` variable within template code.  Use, e.g., to pass #define variables */
    data?: object;
    /**
     * Abstraction for filesystem access, in case one template tries to reference or render another
     * Default implementation uses node's `fs` and `path` modules.
     */
    host?: Host;
}

export function preprocessFile(filePath: string) {
    return preprocess(filePath, nodeHost.readFile(filePath));
}

export function preprocess(filePath: string, sourceText: string, {data = {}, host = nodeHost}: PreprocessOptions = {}) {
    const lib = new Lib(filePath, data, host);

    const preamble = `
        __grantLexicalAccess({__getAcc() {return __p}, __setAcc(s) {__p = s}});
        __grantLexicalAccess = undefined;
    `;

    // Compile with lodash to get source code, but discard the function
    const compiled = template(preamble + sourceText, {
        escape: neverMatch,
        interpolate: neverMatch,
        evaluate: jsSlashSlashHash,
        variable: 'data',
        imports: lib.exposedMethods
    });
    // Recompile, injecting our own code
    const reCompiled = new Function(
        // Use object destructuring to bind all helpers into lexical scope
        `{${ Object.keys(lib.exposedMethods).join(', ') }}`,
        // Inject our init logic
        `return ${ compiled.source.replace('\n', preamble) };`
    )(lib.exposedMethods);
    return reCompiled(data || {});
}

/**
 * Helper functions available in-scope for templates.
 */
class Lib {
    constructor(private filePath: string, private data: object, private host: Host) {}

    /** Expose these methods to templates. */
    private __exposedMethodNames = TI<Array<keyof this>>()([
        'capture',
        'print',
        'include',
        'readFile',
        'resolveFile',
        'If',
        // 'uncommentIf',
        '__grantLexicalAccess'
    ]);
    exposedMethods = mapValues(pick(this, ...this.__exposedMethodNames), v => v.bind(this) as typeof v);

    /**
     * Invoke a callback, capturing and returning the rendered string.
     * Useful to grab a chunk of template into a string and then postprocess it in some way
     * before `print()`ing.
     * @param cb
     */
    capture(cb: () => void): string {
        const __acc = this.__getAcc();
        this.__setAcc('');
        cb();
        const captured = this.__getAcc();
        this.__setAcc(__acc);
        return captured;
    }

    uncommentIf(conditional: any, cb: () => void) {
        throw new Error('TODO: not implemented yet');
    }

    /**
     * Conditionally invoke a callback.
     * Usually used to conditionally render a chunk of the file.
     */
    If(conditional: any, cb: () => void) {
        if(conditional) cb();
    }

    /** Insert a string of text verbatim */
    print(s: string) {
        this.__setAcc(this.__getAcc() + s);
    }

    resolveFile(relativePath: string) {
        const targetPath = this.host.resolvePath(this.host.dirname(this.filePath), relativePath);
        return targetPath;
    }

    readFile(relativePath: string) {
        const targetPath = this.resolveFile(relativePath);
        const targetSourceText = this.host.readFile(targetPath);
        return targetSourceText;
    }

    /**
     * Include and render another file as a template.  File is located on filesystem using
     * relative path resolution similar to require() but without all the automagical `package.json`,
     * `index.js`, file extension behavior
     */
    include(relativePath: string, data: object = this.data) {
        const targetPath = this.resolveFile(relativePath);
        const targetSourceText = this.host.readFile(targetPath);
        this.print(preprocess(targetPath, targetSourceText, data));
    }

    /** Getter for template's internal string buffer / accumulator */
    __getAcc!: () => string;
    /** Setter for template's internal string buffer / accumulator */
    __setAcc!: (s: string) => void;

    /** Called once by injected init code to grant us access to the template's internal state */
    __grantLexicalAccess(fns: Pick<Lib, '__getAcc' | '__setAcc'>) {
        Object.assign(this, fns);
    }
}
