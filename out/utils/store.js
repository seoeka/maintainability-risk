"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisStore = void 0;
class AnalysisStore {
    files = new Map();
    lastHoveredFunction;
    upsert(file) {
        this.files.set(file.uri, file);
    }
    remove(uri) {
        this.files.delete(uri);
        if (this.lastHoveredFunction?.location.uri === uri) {
            this.lastHoveredFunction = undefined;
        }
    }
    getFile(uri) {
        return this.files.get(uri);
    }
    getAllFiles() {
        return Array.from(this.files.values()).sort((a, b) => a.fileName.localeCompare(b.fileName));
    }
    getWorkspaceResult() {
        return {
            analyzedAt: new Date().toISOString(),
            files: this.getAllFiles()
        };
    }
    findFunctionById(uri, id) {
        const file = this.getFile(uri);
        return file?.functions.find((fn) => fn.id === id);
    }
    findFunctionAt(uri, position) {
        const file = this.getFile(uri);
        if (!file) {
            return undefined;
        }
        return file.functions.find((fn) => fn.location.range.contains(position));
    }
    setLastHoveredFunction(fn) {
        this.lastHoveredFunction = fn;
    }
    getLastHoveredFunction() {
        return this.lastHoveredFunction;
    }
}
exports.AnalysisStore = AnalysisStore;
//# sourceMappingURL=store.js.map