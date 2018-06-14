import { Host } from "./core";
import * as Path from 'path';
import * as fs from 'fs';

export const nodeHost: Host = {
    dirname(path: string) {
        return Path.dirname(path);
    },
    readFile(filePath: string) {
        return fs.readFileSync(filePath, 'utf8');
    },
    resolvePath(relativeToPath: string, targetPath: string) {
        return Path.resolve(relativeToPath, targetPath);
    }
};
