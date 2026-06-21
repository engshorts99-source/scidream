import { createRequire } from "node:module";
import { BrowserWindow, app, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { EventEmitter } from "node:events";
import { stat, unwatchFile, watch, watchFile } from "node:fs";
import { lstat, open, readdir, realpath, stat as stat$1 } from "node:fs/promises";
import * as sp from "node:path";
import { join, normalize, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { type } from "node:os";
import { spawn } from "child_process";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames$1 = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps$1 = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames$1(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp$1.call(to, key) && key !== except) __defProp$1(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc$1(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps$1(isNodeMode || !mod || !mod.__esModule ? __defProp$1(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ createRequire(import.meta.url);
//#endregion
//#region node_modules/readdirp/index.js
var EntryTypes = {
	FILE_TYPE: "files",
	DIR_TYPE: "directories",
	FILE_DIR_TYPE: "files_directories",
	EVERYTHING_TYPE: "all"
};
var defaultOptions$1 = {
	root: ".",
	fileFilter: (_entryInfo) => true,
	directoryFilter: (_entryInfo) => true,
	type: EntryTypes.FILE_TYPE,
	lstat: false,
	depth: 2147483648,
	alwaysStat: false,
	highWaterMark: 4096
};
Object.freeze(defaultOptions$1);
var RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
var NORMAL_FLOW_ERRORS = new Set([
	"ENOENT",
	"EPERM",
	"EACCES",
	"ELOOP",
	RECURSIVE_ERROR_CODE
]);
var ALL_TYPES = [
	EntryTypes.DIR_TYPE,
	EntryTypes.EVERYTHING_TYPE,
	EntryTypes.FILE_DIR_TYPE,
	EntryTypes.FILE_TYPE
];
var DIR_TYPES = new Set([
	EntryTypes.DIR_TYPE,
	EntryTypes.EVERYTHING_TYPE,
	EntryTypes.FILE_DIR_TYPE
]);
var FILE_TYPES = new Set([
	EntryTypes.EVERYTHING_TYPE,
	EntryTypes.FILE_DIR_TYPE,
	EntryTypes.FILE_TYPE
]);
var isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
var wantBigintFsStats = process.platform === "win32";
var emptyFn = (_entryInfo) => true;
var normalizeFilter = (filter) => {
	if (filter === void 0) return emptyFn;
	if (typeof filter === "function") return filter;
	if (typeof filter === "string") {
		const fl = filter.trim();
		return (entry) => entry.basename === fl;
	}
	if (Array.isArray(filter)) {
		const trItems = filter.map((item) => item.trim());
		return (entry) => trItems.some((f) => entry.basename === f);
	}
	return emptyFn;
};
/** Readable readdir stream, emitting new files as they're being listed. */
var ReaddirpStream = class extends Readable {
	parents;
	reading;
	parent;
	_stat;
	_maxDepth;
	_wantsDir;
	_wantsFile;
	_wantsEverything;
	_root;
	_isDirent;
	_statsProp;
	_rdOptions;
	_fileFilter;
	_directoryFilter;
	constructor(options = {}) {
		super({
			objectMode: true,
			autoDestroy: true,
			highWaterMark: options.highWaterMark
		});
		const opts = {
			...defaultOptions$1,
			...options
		};
		const { root, type } = opts;
		this._fileFilter = normalizeFilter(opts.fileFilter);
		this._directoryFilter = normalizeFilter(opts.directoryFilter);
		const statMethod = opts.lstat ? lstat : stat$1;
		if (wantBigintFsStats) this._stat = (path) => statMethod(path, { bigint: true });
		else this._stat = statMethod;
		this._maxDepth = opts.depth != null && Number.isSafeInteger(opts.depth) ? opts.depth : defaultOptions$1.depth;
		this._wantsDir = type ? DIR_TYPES.has(type) : false;
		this._wantsFile = type ? FILE_TYPES.has(type) : false;
		this._wantsEverything = type === EntryTypes.EVERYTHING_TYPE;
		this._root = resolve(root);
		this._isDirent = !opts.alwaysStat;
		this._statsProp = this._isDirent ? "dirent" : "stats";
		this._rdOptions = {
			encoding: "utf8",
			withFileTypes: this._isDirent
		};
		this.parents = [this._exploreDir(root, 1)];
		this.reading = false;
		this.parent = void 0;
	}
	async _read(batch) {
		if (this.reading) return;
		this.reading = true;
		try {
			while (!this.destroyed && batch > 0) {
				const par = this.parent;
				const fil = par && par.files;
				if (fil && fil.length > 0) {
					const { path, depth } = par;
					const slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path));
					const awaited = await Promise.all(slice);
					for (const entry of awaited) {
						if (!entry) continue;
						if (this.destroyed) return;
						const entryType = await this._getEntryType(entry);
						if (entryType === "directory" && this._directoryFilter(entry)) {
							if (depth <= this._maxDepth) this.parents.push(this._exploreDir(entry.fullPath, depth + 1));
							if (this._wantsDir) {
								this.push(entry);
								batch--;
							}
						} else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
							if (this._wantsFile) {
								this.push(entry);
								batch--;
							}
						}
					}
				} else {
					const parent = this.parents.pop();
					if (!parent) {
						this.push(null);
						break;
					}
					this.parent = await parent;
					if (this.destroyed) return;
				}
			}
		} catch (error) {
			this.destroy(error);
		} finally {
			this.reading = false;
		}
	}
	async _exploreDir(path, depth) {
		let files;
		try {
			files = await readdir(path, this._rdOptions);
		} catch (error) {
			this._onError(error);
		}
		return {
			files,
			depth,
			path
		};
	}
	async _formatEntry(dirent, path) {
		let entry;
		const basename = this._isDirent ? dirent.name : dirent;
		try {
			const fullPath = resolve(join(path, basename));
			entry = {
				path: relative(this._root, fullPath),
				fullPath,
				basename
			};
			entry[this._statsProp] = this._isDirent ? dirent : await this._stat(fullPath);
		} catch (err) {
			this._onError(err);
			return;
		}
		return entry;
	}
	_onError(err) {
		if (isNormalFlowError(err) && !this.destroyed) this.emit("warn", err);
		else this.destroy(err);
	}
	async _getEntryType(entry) {
		if (!entry && this._statsProp in entry) return "";
		const stats = entry[this._statsProp];
		if (stats.isFile()) return "file";
		if (stats.isDirectory()) return "directory";
		if (stats && stats.isSymbolicLink()) {
			const full = entry.fullPath;
			try {
				const entryRealPath = await realpath(full);
				const entryRealPathStats = await lstat(entryRealPath);
				if (entryRealPathStats.isFile()) return "file";
				if (entryRealPathStats.isDirectory()) {
					const len = entryRealPath.length;
					if (full.startsWith(entryRealPath) && full.substr(len, 1) === sep) {
						const recursiveError = /* @__PURE__ */ new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
						recursiveError.code = RECURSIVE_ERROR_CODE;
						return this._onError(recursiveError);
					}
					return "directory";
				}
			} catch (error) {
				this._onError(error);
				return "";
			}
		}
	}
	_includeAsFile(entry) {
		const stats = entry && entry[this._statsProp];
		return stats && this._wantsEverything && !stats.isDirectory();
	}
};
/**
* Streaming version: Reads all files and directories in given root recursively.
* Consumes ~constant small amount of RAM.
* @param root Root directory
* @param options Options to specify root (start directory), filters and recursion depth
*/
function readdirp(root, options = {}) {
	let type = options.entryType || options.type;
	if (type === "both") type = EntryTypes.FILE_DIR_TYPE;
	if (type) options.type = type;
	if (!root) throw new Error("readdirp: root argument is required. Usage: readdirp(root, options)");
	else if (typeof root !== "string") throw new TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
	else if (type && !ALL_TYPES.includes(type)) throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
	options.root = root;
	return new ReaddirpStream(options);
}
//#endregion
//#region node_modules/chokidar/handler.js
var STR_DATA = "data";
var STR_END = "end";
var STR_CLOSE = "close";
var EMPTY_FN = () => {};
var pl = process.platform;
var isWindows = pl === "win32";
var isMacos = pl === "darwin";
var isLinux = pl === "linux";
var isFreeBSD = pl === "freebsd";
var isIBMi = type() === "OS400";
var EVENTS = {
	ALL: "all",
	READY: "ready",
	ADD: "add",
	CHANGE: "change",
	ADD_DIR: "addDir",
	UNLINK: "unlink",
	UNLINK_DIR: "unlinkDir",
	RAW: "raw",
	ERROR: "error"
};
var EV = EVENTS;
var THROTTLE_MODE_WATCH = "watch";
var statMethods = {
	lstat,
	stat: stat$1
};
var KEY_LISTENERS = "listeners";
var KEY_ERR = "errHandlers";
var KEY_RAW = "rawEmitters";
var HANDLER_KEYS = [
	KEY_LISTENERS,
	KEY_ERR,
	KEY_RAW
];
var binaryExtensions = new Set([
	"3dm",
	"3ds",
	"3g2",
	"3gp",
	"7z",
	"a",
	"aac",
	"adp",
	"afdesign",
	"afphoto",
	"afpub",
	"ai",
	"aif",
	"aiff",
	"alz",
	"ape",
	"apk",
	"appimage",
	"ar",
	"arj",
	"asf",
	"au",
	"avi",
	"bak",
	"baml",
	"bh",
	"bin",
	"bk",
	"bmp",
	"btif",
	"bz2",
	"bzip2",
	"cab",
	"caf",
	"cgm",
	"class",
	"cmx",
	"cpio",
	"cr2",
	"cur",
	"dat",
	"dcm",
	"deb",
	"dex",
	"djvu",
	"dll",
	"dmg",
	"dng",
	"doc",
	"docm",
	"docx",
	"dot",
	"dotm",
	"dra",
	"DS_Store",
	"dsk",
	"dts",
	"dtshd",
	"dvb",
	"dwg",
	"dxf",
	"ecelp4800",
	"ecelp7470",
	"ecelp9600",
	"egg",
	"eol",
	"eot",
	"epub",
	"exe",
	"f4v",
	"fbs",
	"fh",
	"fla",
	"flac",
	"flatpak",
	"fli",
	"flv",
	"fpx",
	"fst",
	"fvt",
	"g3",
	"gh",
	"gif",
	"graffle",
	"gz",
	"gzip",
	"h261",
	"h263",
	"h264",
	"icns",
	"ico",
	"ief",
	"img",
	"ipa",
	"iso",
	"jar",
	"jpeg",
	"jpg",
	"jpgv",
	"jpm",
	"jxr",
	"key",
	"ktx",
	"lha",
	"lib",
	"lvp",
	"lz",
	"lzh",
	"lzma",
	"lzo",
	"m3u",
	"m4a",
	"m4v",
	"mar",
	"mdi",
	"mht",
	"mid",
	"midi",
	"mj2",
	"mka",
	"mkv",
	"mmr",
	"mng",
	"mobi",
	"mov",
	"movie",
	"mp3",
	"mp4",
	"mp4a",
	"mpeg",
	"mpg",
	"mpga",
	"mxu",
	"nef",
	"npx",
	"numbers",
	"nupkg",
	"o",
	"odp",
	"ods",
	"odt",
	"oga",
	"ogg",
	"ogv",
	"otf",
	"ott",
	"pages",
	"pbm",
	"pcx",
	"pdb",
	"pdf",
	"pea",
	"pgm",
	"pic",
	"png",
	"pnm",
	"pot",
	"potm",
	"potx",
	"ppa",
	"ppam",
	"ppm",
	"pps",
	"ppsm",
	"ppsx",
	"ppt",
	"pptm",
	"pptx",
	"psd",
	"pya",
	"pyc",
	"pyo",
	"pyv",
	"qt",
	"rar",
	"ras",
	"raw",
	"resources",
	"rgb",
	"rip",
	"rlc",
	"rmf",
	"rmvb",
	"rpm",
	"rtf",
	"rz",
	"s3m",
	"s7z",
	"scpt",
	"sgi",
	"shar",
	"snap",
	"sil",
	"sketch",
	"slk",
	"smv",
	"snk",
	"so",
	"stl",
	"suo",
	"sub",
	"swf",
	"tar",
	"tbz",
	"tbz2",
	"tga",
	"tgz",
	"thmx",
	"tif",
	"tiff",
	"tlz",
	"ttc",
	"ttf",
	"txz",
	"udf",
	"uvh",
	"uvi",
	"uvm",
	"uvp",
	"uvs",
	"uvu",
	"viv",
	"vob",
	"war",
	"wav",
	"wax",
	"wbmp",
	"wdp",
	"weba",
	"webm",
	"webp",
	"whl",
	"wim",
	"wm",
	"wma",
	"wmv",
	"wmx",
	"woff",
	"woff2",
	"wrm",
	"wvx",
	"xbm",
	"xif",
	"xla",
	"xlam",
	"xls",
	"xlsb",
	"xlsm",
	"xlsx",
	"xlt",
	"xltm",
	"xltx",
	"xm",
	"xmind",
	"xpi",
	"xpm",
	"xwd",
	"xz",
	"z",
	"zip",
	"zipx"
]);
var isBinaryPath = (filePath) => binaryExtensions.has(sp.extname(filePath).slice(1).toLowerCase());
var foreach = (val, fn) => {
	if (val instanceof Set) val.forEach(fn);
	else fn(val);
};
var addAndConvert = (main, prop, item) => {
	let container = main[prop];
	if (!(container instanceof Set)) main[prop] = container = new Set([container]);
	container.add(item);
};
var clearItem = (cont) => (key) => {
	const set = cont[key];
	if (set instanceof Set) set.clear();
	else delete cont[key];
};
var delFromSet = (main, prop, item) => {
	const container = main[prop];
	if (container instanceof Set) container.delete(item);
	else if (container === item) delete main[prop];
};
var isEmptySet = (val) => val instanceof Set ? val.size === 0 : !val;
var FsWatchInstances = /* @__PURE__ */ new Map();
/**
* Instantiates the fs_watch interface
* @param path to be watched
* @param options to be passed to fs_watch
* @param listener main event handler
* @param errHandler emits info about errors
* @param emitRaw emits raw event data
* @returns {NativeFsWatcher}
*/
function createFsWatchInstance(path, options, listener, errHandler, emitRaw) {
	const handleEvent = (rawEvent, evPath) => {
		listener(path);
		emitRaw(rawEvent, evPath, { watchedPath: path });
		if (evPath && path !== evPath) fsWatchBroadcast(sp.resolve(path, evPath), KEY_LISTENERS, sp.join(path, evPath));
	};
	try {
		return watch(path, { persistent: options.persistent }, handleEvent);
	} catch (error) {
		errHandler(error);
		return;
	}
}
/**
* Helper for passing fs_watch event data to a collection of listeners
* @param fullPath absolute path bound to fs_watch instance
*/
var fsWatchBroadcast = (fullPath, listenerType, val1, val2, val3) => {
	const cont = FsWatchInstances.get(fullPath);
	if (!cont) return;
	foreach(cont[listenerType], (listener) => {
		listener(val1, val2, val3);
	});
};
/**
* Instantiates the fs_watch interface or binds listeners
* to an existing one covering the same file system entry
* @param path
* @param fullPath absolute path
* @param options to be passed to fs_watch
* @param handlers container for event listener functions
*/
var setFsWatchListener = (path, fullPath, options, handlers) => {
	const { listener, errHandler, rawEmitter } = handlers;
	let cont = FsWatchInstances.get(fullPath);
	let watcher;
	if (!options.persistent) {
		watcher = createFsWatchInstance(path, options, listener, errHandler, rawEmitter);
		if (!watcher) return;
		return watcher.close.bind(watcher);
	}
	if (cont) {
		addAndConvert(cont, KEY_LISTENERS, listener);
		addAndConvert(cont, KEY_ERR, errHandler);
		addAndConvert(cont, KEY_RAW, rawEmitter);
	} else {
		watcher = createFsWatchInstance(path, options, fsWatchBroadcast.bind(null, fullPath, KEY_LISTENERS), errHandler, fsWatchBroadcast.bind(null, fullPath, KEY_RAW));
		if (!watcher) return;
		watcher.on(EV.ERROR, async (error) => {
			const broadcastErr = fsWatchBroadcast.bind(null, fullPath, KEY_ERR);
			if (cont) cont.watcherUnusable = true;
			if (isWindows && error.code === "EPERM") try {
				await (await open(path, "r")).close();
				broadcastErr(error);
			} catch (err) {}
			else broadcastErr(error);
		});
		cont = {
			listeners: listener,
			errHandlers: errHandler,
			rawEmitters: rawEmitter,
			watcher
		};
		FsWatchInstances.set(fullPath, cont);
	}
	return () => {
		delFromSet(cont, KEY_LISTENERS, listener);
		delFromSet(cont, KEY_ERR, errHandler);
		delFromSet(cont, KEY_RAW, rawEmitter);
		if (isEmptySet(cont.listeners)) {
			cont.watcher.close();
			FsWatchInstances.delete(fullPath);
			HANDLER_KEYS.forEach(clearItem(cont));
			cont.watcher = void 0;
			Object.freeze(cont);
		}
	};
};
var FsWatchFileInstances = /* @__PURE__ */ new Map();
/**
* Instantiates the fs_watchFile interface or binds listeners
* to an existing one covering the same file system entry
* @param path to be watched
* @param fullPath absolute path
* @param options options to be passed to fs_watchFile
* @param handlers container for event listener functions
* @returns closer
*/
var setFsWatchFileListener = (path, fullPath, options, handlers) => {
	const { listener, rawEmitter } = handlers;
	let cont = FsWatchFileInstances.get(fullPath);
	const copts = cont && cont.options;
	if (copts && (copts.persistent < options.persistent || copts.interval > options.interval)) {
		unwatchFile(fullPath);
		cont = void 0;
	}
	if (cont) {
		addAndConvert(cont, KEY_LISTENERS, listener);
		addAndConvert(cont, KEY_RAW, rawEmitter);
	} else {
		cont = {
			listeners: listener,
			rawEmitters: rawEmitter,
			options,
			watcher: watchFile(fullPath, options, (curr, prev) => {
				foreach(cont.rawEmitters, (rawEmitter) => {
					rawEmitter(EV.CHANGE, fullPath, {
						curr,
						prev
					});
				});
				const currmtime = curr.mtimeMs;
				if (curr.size !== prev.size || currmtime > prev.mtimeMs || currmtime === 0) foreach(cont.listeners, (listener) => listener(path, curr));
			})
		};
		FsWatchFileInstances.set(fullPath, cont);
	}
	return () => {
		delFromSet(cont, KEY_LISTENERS, listener);
		delFromSet(cont, KEY_RAW, rawEmitter);
		if (isEmptySet(cont.listeners)) {
			FsWatchFileInstances.delete(fullPath);
			unwatchFile(fullPath);
			cont.options = cont.watcher = void 0;
			Object.freeze(cont);
		}
	};
};
/**
* @mixin
*/
var NodeFsHandler = class {
	fsw;
	_boundHandleError;
	constructor(fsW) {
		this.fsw = fsW;
		this._boundHandleError = (error) => fsW._handleError(error);
	}
	/**
	* Watch file for changes with fs_watchFile or fs_watch.
	* @param path to file or dir
	* @param listener on fs change
	* @returns closer for the watcher instance
	*/
	_watchWithNodeFs(path, listener) {
		const opts = this.fsw.options;
		const directory = sp.dirname(path);
		const basename = sp.basename(path);
		this.fsw._getWatchedDir(directory).add(basename);
		const absolutePath = sp.resolve(path);
		const options = { persistent: opts.persistent };
		if (!listener) listener = EMPTY_FN;
		let closer;
		if (opts.usePolling) {
			options.interval = opts.interval !== opts.binaryInterval && isBinaryPath(basename) ? opts.binaryInterval : opts.interval;
			closer = setFsWatchFileListener(path, absolutePath, options, {
				listener,
				rawEmitter: this.fsw._emitRaw
			});
		} else closer = setFsWatchListener(path, absolutePath, options, {
			listener,
			errHandler: this._boundHandleError,
			rawEmitter: this.fsw._emitRaw
		});
		return closer;
	}
	/**
	* Watch a file and emit add event if warranted.
	* @returns closer for the watcher instance
	*/
	_handleFile(file, stats, initialAdd) {
		if (this.fsw.closed) return;
		const dirname = sp.dirname(file);
		const basename = sp.basename(file);
		const parent = this.fsw._getWatchedDir(dirname);
		let prevStats = stats;
		if (parent.has(basename)) return;
		const listener = async (path, newStats) => {
			if (!this.fsw._throttle(THROTTLE_MODE_WATCH, file, 5)) return;
			if (!newStats || newStats.mtimeMs === 0) try {
				const newStats = await stat$1(file);
				if (this.fsw.closed) return;
				const at = newStats.atimeMs;
				const mt = newStats.mtimeMs;
				if (!at || at <= mt || mt !== prevStats.mtimeMs) this.fsw._emit(EV.CHANGE, file, newStats);
				if ((isMacos || isLinux || isFreeBSD) && prevStats.ino !== newStats.ino) {
					this.fsw._closeFile(path);
					prevStats = newStats;
					const closer = this._watchWithNodeFs(file, listener);
					if (closer) this.fsw._addPathCloser(path, closer);
				} else prevStats = newStats;
			} catch (error) {
				this.fsw._remove(dirname, basename);
			}
			else if (parent.has(basename)) {
				const at = newStats.atimeMs;
				const mt = newStats.mtimeMs;
				if (!at || at <= mt || mt !== prevStats.mtimeMs) this.fsw._emit(EV.CHANGE, file, newStats);
				prevStats = newStats;
			}
		};
		const closer = this._watchWithNodeFs(file, listener);
		if (!(initialAdd && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(file)) {
			if (!this.fsw._throttle(EV.ADD, file, 0)) return;
			this.fsw._emit(EV.ADD, file, stats);
		}
		return closer;
	}
	/**
	* Handle symlinks encountered while reading a dir.
	* @param entry returned by readdirp
	* @param directory path of dir being read
	* @param path of this item
	* @param item basename of this item
	* @returns true if no more processing is needed for this entry.
	*/
	async _handleSymlink(entry, directory, path, item) {
		if (this.fsw.closed) return;
		const full = entry.fullPath;
		const dir = this.fsw._getWatchedDir(directory);
		if (!this.fsw.options.followSymlinks) {
			this.fsw._incrReadyCount();
			let linkPath;
			try {
				linkPath = await realpath(path);
			} catch (e) {
				this.fsw._emitReady();
				return true;
			}
			if (this.fsw.closed) return;
			if (dir.has(item)) {
				if (this.fsw._symlinkPaths.get(full) !== linkPath) {
					this.fsw._symlinkPaths.set(full, linkPath);
					this.fsw._emit(EV.CHANGE, path, entry.stats);
				}
			} else {
				dir.add(item);
				this.fsw._symlinkPaths.set(full, linkPath);
				this.fsw._emit(EV.ADD, path, entry.stats);
			}
			this.fsw._emitReady();
			return true;
		}
		if (this.fsw._symlinkPaths.has(full)) return true;
		this.fsw._symlinkPaths.set(full, true);
	}
	_handleRead(directory, initialAdd, wh, target, dir, depth, throttler) {
		directory = sp.join(directory, "");
		const throttleKey = target ? `${directory}:${target}` : directory;
		throttler = this.fsw._throttle("readdir", throttleKey, 1e3);
		if (!throttler) return;
		const previous = this.fsw._getWatchedDir(wh.path);
		const current = /* @__PURE__ */ new Set();
		let stream = this.fsw._readdirp(directory, {
			fileFilter: (entry) => wh.filterPath(entry),
			directoryFilter: (entry) => wh.filterDir(entry)
		});
		if (!stream) return;
		stream.on(STR_DATA, async (entry) => {
			if (this.fsw.closed) {
				stream = void 0;
				return;
			}
			const item = entry.path;
			let path = sp.join(directory, item);
			current.add(item);
			if (entry.stats.isSymbolicLink() && await this._handleSymlink(entry, directory, path, item)) return;
			if (this.fsw.closed) {
				stream = void 0;
				return;
			}
			if (item === target || !target && !previous.has(item)) {
				this.fsw._incrReadyCount();
				path = sp.join(dir, sp.relative(dir, path));
				this._addToNodeFs(path, initialAdd, wh, depth + 1);
			}
		}).on(EV.ERROR, this._boundHandleError);
		return new Promise((resolve, reject) => {
			if (!stream) return reject();
			stream.once("end", () => {
				if (this.fsw.closed) {
					stream = void 0;
					return;
				}
				const wasThrottled = throttler ? throttler.clear() : false;
				resolve(void 0);
				previous.getChildren().filter((item) => {
					return item !== directory && !current.has(item);
				}).forEach((item) => {
					this.fsw._remove(directory, item);
				});
				stream = void 0;
				if (wasThrottled) this._handleRead(directory, false, wh, target, dir, depth, throttler);
			});
		});
	}
	/**
	* Read directory to add / remove files from `@watched` list and re-read it on change.
	* @param dir fs path
	* @param stats
	* @param initialAdd
	* @param depth relative to user-supplied path
	* @param target child path targeted for watch
	* @param wh Common watch helpers for this path
	* @param realpath
	* @returns closer for the watcher instance.
	*/
	async _handleDir(dir, stats, initialAdd, depth, target, wh, realpath) {
		const parentDir = this.fsw._getWatchedDir(sp.dirname(dir));
		const tracked = parentDir.has(sp.basename(dir));
		if (!(initialAdd && this.fsw.options.ignoreInitial) && !target && !tracked) this.fsw._emit(EV.ADD_DIR, dir, stats);
		parentDir.add(sp.basename(dir));
		this.fsw._getWatchedDir(dir);
		let throttler;
		let closer;
		const oDepth = this.fsw.options.depth;
		if ((oDepth == null || depth <= oDepth) && !this.fsw._symlinkPaths.has(realpath)) {
			if (!target) {
				await this._handleRead(dir, initialAdd, wh, target, dir, depth, throttler);
				if (this.fsw.closed) return;
			}
			closer = this._watchWithNodeFs(dir, (dirPath, stats) => {
				if (stats && stats.mtimeMs === 0) return;
				this._handleRead(dirPath, false, wh, target, dir, depth, throttler);
			});
		}
		return closer;
	}
	/**
	* Handle added file, directory, or glob pattern.
	* Delegates call to _handleFile / _handleDir after checks.
	* @param path to file or ir
	* @param initialAdd was the file added at watch instantiation?
	* @param priorWh depth relative to user-supplied path
	* @param depth Child path actually targeted for watch
	* @param target Child path actually targeted for watch
	*/
	async _addToNodeFs(path, initialAdd, priorWh, depth, target) {
		const ready = this.fsw._emitReady;
		if (this.fsw._isIgnored(path) || this.fsw.closed) {
			ready();
			return false;
		}
		const wh = this.fsw._getWatchHelpers(path);
		if (priorWh) {
			wh.filterPath = (entry) => priorWh.filterPath(entry);
			wh.filterDir = (entry) => priorWh.filterDir(entry);
		}
		try {
			const stats = await statMethods[wh.statMethod](wh.watchPath);
			if (this.fsw.closed) return;
			if (this.fsw._isIgnored(wh.watchPath, stats)) {
				ready();
				return false;
			}
			const follow = this.fsw.options.followSymlinks;
			let closer;
			if (stats.isDirectory()) {
				const absPath = sp.resolve(path);
				const targetPath = follow ? await realpath(path) : path;
				if (this.fsw.closed) return;
				closer = await this._handleDir(wh.watchPath, stats, initialAdd, depth, target, wh, targetPath);
				if (this.fsw.closed) return;
				if (absPath !== targetPath && targetPath !== void 0) this.fsw._symlinkPaths.set(absPath, targetPath);
			} else if (stats.isSymbolicLink()) {
				const targetPath = follow ? await realpath(path) : path;
				if (this.fsw.closed) return;
				const parent = sp.dirname(wh.watchPath);
				this.fsw._getWatchedDir(parent).add(wh.watchPath);
				this.fsw._emit(EV.ADD, wh.watchPath, stats);
				closer = await this._handleDir(parent, stats, initialAdd, depth, path, wh, targetPath);
				if (this.fsw.closed) return;
				if (targetPath !== void 0) this.fsw._symlinkPaths.set(sp.resolve(path), targetPath);
			} else closer = this._handleFile(wh.watchPath, stats, initialAdd);
			ready();
			if (closer) this.fsw._addPathCloser(path, closer);
			return false;
		} catch (error) {
			if (this.fsw._handleError(error)) {
				ready();
				return path;
			}
		}
	}
};
//#endregion
//#region node_modules/chokidar/index.js
/*! chokidar - MIT License (c) 2012 Paul Miller (paulmillr.com) */
var SLASH = "/";
var SLASH_SLASH = "//";
var ONE_DOT = ".";
var TWO_DOTS = "..";
var STRING_TYPE = "string";
var BACK_SLASH_RE = /\\/g;
var DOUBLE_SLASH_RE = /\/\//g;
var DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
var REPLACER_RE = /^\.[/\\]/;
function arrify(item) {
	return Array.isArray(item) ? item : [item];
}
var isMatcherObject = (matcher) => typeof matcher === "object" && matcher !== null && !(matcher instanceof RegExp);
function createPattern(matcher) {
	if (typeof matcher === "function") return matcher;
	if (typeof matcher === "string") return (string) => matcher === string;
	if (matcher instanceof RegExp) return (string) => matcher.test(string);
	if (typeof matcher === "object" && matcher !== null) return (string) => {
		if (matcher.path === string) return true;
		if (matcher.recursive) {
			const relative = sp.relative(matcher.path, string);
			if (!relative) return false;
			return !relative.startsWith("..") && !sp.isAbsolute(relative);
		}
		return false;
	};
	return () => false;
}
function normalizePath(path) {
	if (typeof path !== "string") throw new Error("string expected");
	path = sp.normalize(path);
	path = path.replace(/\\/g, "/");
	let prepend = false;
	if (path.startsWith("//")) prepend = true;
	path = path.replace(DOUBLE_SLASH_RE, "/");
	if (prepend) path = "/" + path;
	return path;
}
function matchPatterns(patterns, testString, stats) {
	const path = normalizePath(testString);
	for (let index = 0; index < patterns.length; index++) {
		const pattern = patterns[index];
		if (pattern(path, stats)) return true;
	}
	return false;
}
function anymatch(matchers, testString) {
	if (matchers == null) throw new TypeError("anymatch: specify first argument");
	const patterns = arrify(matchers).map((matcher) => createPattern(matcher));
	if (testString == null) return (testString, stats) => {
		return matchPatterns(patterns, testString, stats);
	};
	return matchPatterns(patterns, testString);
}
var unifyPaths = (paths_) => {
	const paths = arrify(paths_).flat();
	if (!paths.every((p) => typeof p === STRING_TYPE)) throw new TypeError(`Non-string provided as watch path: ${paths}`);
	return paths.map(normalizePathToUnix);
};
var toUnix = (string) => {
	let str = string.replace(BACK_SLASH_RE, SLASH);
	let prepend = false;
	if (str.startsWith(SLASH_SLASH)) prepend = true;
	str = str.replace(DOUBLE_SLASH_RE, SLASH);
	if (prepend) str = SLASH + str;
	return str;
};
var normalizePathToUnix = (path) => toUnix(sp.normalize(toUnix(path)));
var normalizeIgnored = (cwd = "") => (path) => {
	if (typeof path === "string") return normalizePathToUnix(sp.isAbsolute(path) ? path : sp.join(cwd, path));
	else return path;
};
var getAbsolutePath = (path, cwd) => {
	if (sp.isAbsolute(path)) return path;
	return sp.join(cwd, path);
};
var EMPTY_SET = Object.freeze(/* @__PURE__ */ new Set());
/**
* Directory entry.
*/
var DirEntry = class {
	path;
	_removeWatcher;
	items;
	constructor(dir, removeWatcher) {
		this.path = dir;
		this._removeWatcher = removeWatcher;
		this.items = /* @__PURE__ */ new Set();
	}
	add(item) {
		const { items } = this;
		if (!items) return;
		if (item !== ONE_DOT && item !== TWO_DOTS) items.add(item);
	}
	async remove(item) {
		const { items } = this;
		if (!items) return;
		items.delete(item);
		if (items.size > 0) return;
		const dir = this.path;
		try {
			await readdir(dir);
		} catch (err) {
			if (this._removeWatcher) this._removeWatcher(sp.dirname(dir), sp.basename(dir));
		}
	}
	has(item) {
		const { items } = this;
		if (!items) return;
		return items.has(item);
	}
	getChildren() {
		const { items } = this;
		if (!items) return [];
		return [...items.values()];
	}
	dispose() {
		this.items.clear();
		this.path = "";
		this._removeWatcher = EMPTY_FN;
		this.items = EMPTY_SET;
		Object.freeze(this);
	}
};
var STAT_METHOD_F = "stat";
var STAT_METHOD_L = "lstat";
var WatchHelper = class {
	fsw;
	path;
	watchPath;
	fullWatchPath;
	dirParts;
	followSymlinks;
	statMethod;
	constructor(path, follow, fsw) {
		this.fsw = fsw;
		const watchPath = path;
		this.path = path = path.replace(REPLACER_RE, "");
		this.watchPath = watchPath;
		this.fullWatchPath = sp.resolve(watchPath);
		this.dirParts = [];
		this.dirParts.forEach((parts) => {
			if (parts.length > 1) parts.pop();
		});
		this.followSymlinks = follow;
		this.statMethod = follow ? STAT_METHOD_F : STAT_METHOD_L;
	}
	entryPath(entry) {
		return sp.join(this.watchPath, sp.relative(this.watchPath, entry.fullPath));
	}
	filterPath(entry) {
		const { stats } = entry;
		if (stats && stats.isSymbolicLink()) return this.filterDir(entry);
		const resolvedPath = this.entryPath(entry);
		return this.fsw._isntIgnored(resolvedPath, stats) && this.fsw._hasReadPermissions(stats);
	}
	filterDir(entry) {
		return this.fsw._isntIgnored(this.entryPath(entry), entry.stats);
	}
};
/**
* Watches files & directories for changes. Emitted events:
* `add`, `addDir`, `change`, `unlink`, `unlinkDir`, `all`, `error`
*
*     new FSWatcher()
*       .add(directories)
*       .on('add', path => log('File', path, 'was added'))
*/
var FSWatcher = class extends EventEmitter {
	closed;
	options;
	_closers;
	_ignoredPaths;
	_throttled;
	_streams;
	_symlinkPaths;
	_watched;
	_pendingWrites;
	_pendingUnlinks;
	_readyCount;
	_emitReady;
	_closePromise;
	_userIgnored;
	_readyEmitted;
	_emitRaw;
	_boundRemove;
	_nodeFsHandler;
	constructor(_opts = {}) {
		super();
		this.closed = false;
		this._closers = /* @__PURE__ */ new Map();
		this._ignoredPaths = /* @__PURE__ */ new Set();
		this._throttled = /* @__PURE__ */ new Map();
		this._streams = /* @__PURE__ */ new Set();
		this._symlinkPaths = /* @__PURE__ */ new Map();
		this._watched = /* @__PURE__ */ new Map();
		this._pendingWrites = /* @__PURE__ */ new Map();
		this._pendingUnlinks = /* @__PURE__ */ new Map();
		this._readyCount = 0;
		this._readyEmitted = false;
		const awf = _opts.awaitWriteFinish;
		const DEF_AWF = {
			stabilityThreshold: 2e3,
			pollInterval: 100
		};
		const opts = {
			persistent: true,
			ignoreInitial: false,
			ignorePermissionErrors: false,
			interval: 100,
			binaryInterval: 300,
			followSymlinks: true,
			usePolling: false,
			atomic: true,
			..._opts,
			ignored: _opts.ignored ? arrify(_opts.ignored) : arrify([]),
			awaitWriteFinish: awf === true ? DEF_AWF : typeof awf === "object" ? {
				...DEF_AWF,
				...awf
			} : false
		};
		if (isIBMi) opts.usePolling = true;
		if (opts.atomic === void 0) opts.atomic = !opts.usePolling;
		const envPoll = process.env.CHOKIDAR_USEPOLLING;
		if (envPoll !== void 0) {
			const envLower = envPoll.toLowerCase();
			if (envLower === "false" || envLower === "0") opts.usePolling = false;
			else if (envLower === "true" || envLower === "1") opts.usePolling = true;
			else opts.usePolling = !!envLower;
		}
		const envInterval = process.env.CHOKIDAR_INTERVAL;
		if (envInterval) opts.interval = Number.parseInt(envInterval, 10);
		let readyCalls = 0;
		this._emitReady = () => {
			readyCalls++;
			if (readyCalls >= this._readyCount) {
				this._emitReady = EMPTY_FN;
				this._readyEmitted = true;
				process.nextTick(() => this.emit(EVENTS.READY));
			}
		};
		this._emitRaw = (...args) => this.emit(EVENTS.RAW, ...args);
		this._boundRemove = this._remove.bind(this);
		this.options = opts;
		this._nodeFsHandler = new NodeFsHandler(this);
		Object.freeze(opts);
	}
	_addIgnoredPath(matcher) {
		if (isMatcherObject(matcher)) {
			for (const ignored of this._ignoredPaths) if (isMatcherObject(ignored) && ignored.path === matcher.path && ignored.recursive === matcher.recursive) return;
		}
		this._ignoredPaths.add(matcher);
	}
	_removeIgnoredPath(matcher) {
		this._ignoredPaths.delete(matcher);
		if (typeof matcher === "string") {
			for (const ignored of this._ignoredPaths) if (isMatcherObject(ignored) && ignored.path === matcher) this._ignoredPaths.delete(ignored);
		}
	}
	/**
	* Adds paths to be watched on an existing FSWatcher instance.
	* @param paths_ file or file list. Other arguments are unused
	*/
	add(paths_, _origAdd, _internal) {
		const { cwd } = this.options;
		this.closed = false;
		this._closePromise = void 0;
		let paths = unifyPaths(paths_);
		if (cwd) paths = paths.map((path) => {
			return getAbsolutePath(path, cwd);
		});
		paths.forEach((path) => {
			this._removeIgnoredPath(path);
		});
		this._userIgnored = void 0;
		if (!this._readyCount) this._readyCount = 0;
		this._readyCount += paths.length;
		Promise.all(paths.map(async (path) => {
			const res = await this._nodeFsHandler._addToNodeFs(path, !_internal, void 0, 0, _origAdd);
			if (res) this._emitReady();
			return res;
		})).then((results) => {
			if (this.closed) return;
			results.forEach((item) => {
				if (item) this.add(sp.dirname(item), sp.basename(_origAdd || item));
			});
		});
		return this;
	}
	/**
	* Close watchers or start ignoring events from specified paths.
	*/
	unwatch(paths_) {
		if (this.closed) return this;
		const paths = unifyPaths(paths_);
		const { cwd } = this.options;
		paths.forEach((path) => {
			if (!sp.isAbsolute(path) && !this._closers.has(path)) {
				if (cwd) path = sp.join(cwd, path);
				path = sp.resolve(path);
			}
			this._closePath(path);
			this._addIgnoredPath(path);
			if (this._watched.has(path)) this._addIgnoredPath({
				path,
				recursive: true
			});
			this._userIgnored = void 0;
		});
		return this;
	}
	/**
	* Close watchers and remove all listeners from watched paths.
	*/
	close() {
		if (this._closePromise) return this._closePromise;
		this.closed = true;
		this.removeAllListeners();
		const closers = [];
		this._closers.forEach((closerList) => closerList.forEach((closer) => {
			const promise = closer();
			if (promise instanceof Promise) closers.push(promise);
		}));
		this._streams.forEach((stream) => stream.destroy());
		this._userIgnored = void 0;
		this._readyCount = 0;
		this._readyEmitted = false;
		this._watched.forEach((dirent) => dirent.dispose());
		this._closers.clear();
		this._watched.clear();
		this._streams.clear();
		this._symlinkPaths.clear();
		this._throttled.clear();
		this._closePromise = closers.length ? Promise.all(closers).then(() => void 0) : Promise.resolve();
		return this._closePromise;
	}
	/**
	* Expose list of watched paths
	* @returns for chaining
	*/
	getWatched() {
		const watchList = {};
		this._watched.forEach((entry, dir) => {
			const index = (this.options.cwd ? sp.relative(this.options.cwd, dir) : dir) || ONE_DOT;
			watchList[index] = entry.getChildren().sort();
		});
		return watchList;
	}
	emitWithAll(event, args) {
		this.emit(event, ...args);
		if (event !== EVENTS.ERROR) this.emit(EVENTS.ALL, event, ...args);
	}
	/**
	* Normalize and emit events.
	* Calling _emit DOES NOT MEAN emit() would be called!
	* @param event Type of event
	* @param path File or directory path
	* @param stats arguments to be passed with event
	* @returns the error if defined, otherwise the value of the FSWatcher instance's `closed` flag
	*/
	async _emit(event, path, stats) {
		if (this.closed) return;
		const opts = this.options;
		if (isWindows) path = sp.normalize(path);
		if (opts.cwd) path = sp.relative(opts.cwd, path);
		const args = [path];
		if (stats != null) args.push(stats);
		const awf = opts.awaitWriteFinish;
		let pw;
		if (awf && (pw = this._pendingWrites.get(path))) {
			pw.lastChange = /* @__PURE__ */ new Date();
			return this;
		}
		if (opts.atomic) {
			if (event === EVENTS.UNLINK) {
				this._pendingUnlinks.set(path, [event, ...args]);
				setTimeout(() => {
					this._pendingUnlinks.forEach((entry, path) => {
						this.emit(...entry);
						this.emit(EVENTS.ALL, ...entry);
						this._pendingUnlinks.delete(path);
					});
				}, typeof opts.atomic === "number" ? opts.atomic : 100);
				return this;
			}
			if (event === EVENTS.ADD && this._pendingUnlinks.has(path)) {
				event = EVENTS.CHANGE;
				this._pendingUnlinks.delete(path);
			}
		}
		if (awf && (event === EVENTS.ADD || event === EVENTS.CHANGE) && this._readyEmitted) {
			const awfEmit = (err, stats) => {
				if (err) {
					event = EVENTS.ERROR;
					args[0] = err;
					this.emitWithAll(event, args);
				} else if (stats) {
					if (args.length > 1) args[1] = stats;
					else args.push(stats);
					this.emitWithAll(event, args);
				}
			};
			this._awaitWriteFinish(path, awf.stabilityThreshold, event, awfEmit);
			return this;
		}
		if (event === EVENTS.CHANGE) {
			if (!this._throttle(EVENTS.CHANGE, path, 50)) return this;
		}
		if (opts.alwaysStat && stats === void 0 && (event === EVENTS.ADD || event === EVENTS.ADD_DIR || event === EVENTS.CHANGE)) {
			const fullPath = opts.cwd ? sp.join(opts.cwd, path) : path;
			let stats;
			try {
				stats = await stat$1(fullPath);
			} catch (err) {}
			if (!stats || this.closed) return;
			args.push(stats);
		}
		this.emitWithAll(event, args);
		return this;
	}
	/**
	* Common handler for errors
	* @returns The error if defined, otherwise the value of the FSWatcher instance's `closed` flag
	*/
	_handleError(error) {
		const code = error && error.code;
		if (error && code !== "ENOENT" && code !== "ENOTDIR" && (!this.options.ignorePermissionErrors || code !== "EPERM" && code !== "EACCES")) this.emit(EVENTS.ERROR, error);
		return error || this.closed;
	}
	/**
	* Helper utility for throttling
	* @param actionType type being throttled
	* @param path being acted upon
	* @param timeout duration of time to suppress duplicate actions
	* @returns tracking object or false if action should be suppressed
	*/
	_throttle(actionType, path, timeout) {
		if (!this._throttled.has(actionType)) this._throttled.set(actionType, /* @__PURE__ */ new Map());
		const action = this._throttled.get(actionType);
		if (!action) throw new Error("invalid throttle");
		const actionPath = action.get(path);
		if (actionPath) {
			actionPath.count++;
			return false;
		}
		let timeoutObject;
		const clear = () => {
			const item = action.get(path);
			const count = item ? item.count : 0;
			action.delete(path);
			clearTimeout(timeoutObject);
			if (item) clearTimeout(item.timeoutObject);
			return count;
		};
		timeoutObject = setTimeout(clear, timeout);
		const thr = {
			timeoutObject,
			clear,
			count: 0
		};
		action.set(path, thr);
		return thr;
	}
	_incrReadyCount() {
		return this._readyCount++;
	}
	/**
	* Awaits write operation to finish.
	* Polls a newly created file for size variations. When files size does not change for 'threshold' milliseconds calls callback.
	* @param path being acted upon
	* @param threshold Time in milliseconds a file size must be fixed before acknowledging write OP is finished
	* @param event
	* @param awfEmit Callback to be called when ready for event to be emitted.
	*/
	_awaitWriteFinish(path, threshold, event, awfEmit) {
		const awf = this.options.awaitWriteFinish;
		if (typeof awf !== "object") return;
		const pollInterval = awf.pollInterval;
		let timeoutHandler;
		let fullPath = path;
		if (this.options.cwd && !sp.isAbsolute(path)) fullPath = sp.join(this.options.cwd, path);
		const now = /* @__PURE__ */ new Date();
		const writes = this._pendingWrites;
		function awaitWriteFinishFn(prevStat) {
			stat(fullPath, (err, curStat) => {
				if (err || !writes.has(path)) {
					if (err && err.code !== "ENOENT") awfEmit(err);
					return;
				}
				const now = Number(/* @__PURE__ */ new Date());
				if (prevStat && curStat.size !== prevStat.size) writes.get(path).lastChange = now;
				if (now - writes.get(path).lastChange >= threshold) {
					writes.delete(path);
					awfEmit(void 0, curStat);
				} else timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval, curStat);
			});
		}
		if (!writes.has(path)) {
			writes.set(path, {
				lastChange: now,
				cancelWait: () => {
					writes.delete(path);
					clearTimeout(timeoutHandler);
					return event;
				}
			});
			timeoutHandler = setTimeout(awaitWriteFinishFn, pollInterval);
		}
	}
	/**
	* Determines whether user has asked to ignore this path.
	*/
	_isIgnored(path, stats) {
		if (this.options.atomic && DOT_RE.test(path)) return true;
		if (!this._userIgnored) {
			const { cwd } = this.options;
			const ignored = (this.options.ignored || []).map(normalizeIgnored(cwd));
			const list = [...[...this._ignoredPaths].map(normalizeIgnored(cwd)), ...ignored];
			this._userIgnored = anymatch(list, void 0);
		}
		return this._userIgnored(path, stats);
	}
	_isntIgnored(path, stat) {
		return !this._isIgnored(path, stat);
	}
	/**
	* Provides a set of common helpers and properties relating to symlink handling.
	* @param path file or directory pattern being watched
	*/
	_getWatchHelpers(path) {
		return new WatchHelper(path, this.options.followSymlinks, this);
	}
	/**
	* Provides directory tracking objects
	* @param directory path of the directory
	*/
	_getWatchedDir(directory) {
		const dir = sp.resolve(directory);
		if (!this._watched.has(dir)) this._watched.set(dir, new DirEntry(dir, this._boundRemove));
		return this._watched.get(dir);
	}
	/**
	* Check for read permissions: https://stackoverflow.com/a/11781404/1358405
	*/
	_hasReadPermissions(stats) {
		if (this.options.ignorePermissionErrors) return true;
		return Boolean(Number(stats.mode) & 256);
	}
	/**
	* Handles emitting unlink events for
	* files and directories, and via recursion, for
	* files and directories within directories that are unlinked
	* @param directory within which the following item is located
	* @param item      base path of item/directory
	*/
	_remove(directory, item, isDirectory) {
		const path = sp.join(directory, item);
		const fullPath = sp.resolve(path);
		isDirectory = isDirectory != null ? isDirectory : this._watched.has(path) || this._watched.has(fullPath);
		if (!this._throttle("remove", path, 100)) return;
		if (!isDirectory && this._watched.size === 1) this.add(directory, item, true);
		this._getWatchedDir(path).getChildren().forEach((nested) => this._remove(path, nested));
		const parent = this._getWatchedDir(directory);
		const wasTracked = parent.has(item);
		parent.remove(item);
		if (this._symlinkPaths.has(fullPath)) this._symlinkPaths.delete(fullPath);
		let relPath = path;
		if (this.options.cwd) relPath = sp.relative(this.options.cwd, path);
		if (this.options.awaitWriteFinish && this._pendingWrites.has(relPath)) {
			if (this._pendingWrites.get(relPath).cancelWait() === EVENTS.ADD) return;
		}
		this._watched.delete(path);
		this._watched.delete(fullPath);
		const eventName = isDirectory ? EVENTS.UNLINK_DIR : EVENTS.UNLINK;
		if (wasTracked && !this._isIgnored(path)) this._emit(eventName, path);
		this._closePath(path);
	}
	/**
	* Closes all watchers for a path
	*/
	_closePath(path) {
		this._closeFile(path);
		const dir = sp.dirname(path);
		this._getWatchedDir(dir).remove(sp.basename(path));
	}
	/**
	* Closes only file-specific watchers
	*/
	_closeFile(path) {
		const closers = this._closers.get(path);
		if (!closers) return;
		closers.forEach((closer) => closer());
		this._closers.delete(path);
	}
	_addPathCloser(path, closer) {
		if (!closer) return;
		let list = this._closers.get(path);
		if (!list) {
			list = [];
			this._closers.set(path, list);
		}
		list.push(closer);
	}
	_readdirp(root, opts) {
		if (this.closed) return;
		let stream = readdirp(root, {
			type: EVENTS.ALL,
			alwaysStat: true,
			lstat: true,
			...opts,
			depth: 0
		});
		this._streams.add(stream);
		stream.once(STR_CLOSE, () => {
			stream = void 0;
		});
		stream.once("end", () => {
			if (stream) {
				this._streams.delete(stream);
				stream = void 0;
			}
		});
		return stream;
	}
};
/**
* Instantiates watcher with paths to be tracked.
* @param paths file / directory paths
* @param options opts, such as `atomic`, `awaitWriteFinish`, `ignored`, and others
* @returns an instance of FSWatcher for chaining.
* @example
* const watcher = watch('.').on('all', (event, path) => { console.log(event, path); });
* watch('.', { atomic: true, awaitWriteFinish: true, ignored: (f, stats) => stats?.isFile() && !f.endsWith('.js') })
*/
function watch$1(paths, options = {}) {
	const watcher = new FSWatcher(options);
	watcher.add(paths);
	return watcher;
}
var chokidar_default = {
	watch: watch$1,
	FSWatcher
};
//#endregion
//#region node_modules/kind-of/index.js
var require_kind_of = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var toString = Object.prototype.toString;
	module.exports = function kindOf(val) {
		if (val === void 0) return "undefined";
		if (val === null) return "null";
		var type = typeof val;
		if (type === "boolean") return "boolean";
		if (type === "string") return "string";
		if (type === "number") return "number";
		if (type === "symbol") return "symbol";
		if (type === "function") return isGeneratorFn(val) ? "generatorfunction" : "function";
		if (isArray(val)) return "array";
		if (isBuffer(val)) return "buffer";
		if (isArguments(val)) return "arguments";
		if (isDate(val)) return "date";
		if (isError(val)) return "error";
		if (isRegexp(val)) return "regexp";
		switch (ctorName(val)) {
			case "Symbol": return "symbol";
			case "Promise": return "promise";
			case "WeakMap": return "weakmap";
			case "WeakSet": return "weakset";
			case "Map": return "map";
			case "Set": return "set";
			case "Int8Array": return "int8array";
			case "Uint8Array": return "uint8array";
			case "Uint8ClampedArray": return "uint8clampedarray";
			case "Int16Array": return "int16array";
			case "Uint16Array": return "uint16array";
			case "Int32Array": return "int32array";
			case "Uint32Array": return "uint32array";
			case "Float32Array": return "float32array";
			case "Float64Array": return "float64array";
		}
		if (isGeneratorObj(val)) return "generator";
		type = toString.call(val);
		switch (type) {
			case "[object Object]": return "object";
			case "[object Map Iterator]": return "mapiterator";
			case "[object Set Iterator]": return "setiterator";
			case "[object String Iterator]": return "stringiterator";
			case "[object Array Iterator]": return "arrayiterator";
		}
		return type.slice(8, -1).toLowerCase().replace(/\s/g, "");
	};
	function ctorName(val) {
		return typeof val.constructor === "function" ? val.constructor.name : null;
	}
	function isArray(val) {
		if (Array.isArray) return Array.isArray(val);
		return val instanceof Array;
	}
	function isError(val) {
		return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
	}
	function isDate(val) {
		if (val instanceof Date) return true;
		return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
	}
	function isRegexp(val) {
		if (val instanceof RegExp) return true;
		return typeof val.flags === "string" && typeof val.ignoreCase === "boolean" && typeof val.multiline === "boolean" && typeof val.global === "boolean";
	}
	function isGeneratorFn(name, val) {
		return ctorName(name) === "GeneratorFunction";
	}
	function isGeneratorObj(val) {
		return typeof val.throw === "function" && typeof val.return === "function" && typeof val.next === "function";
	}
	function isArguments(val) {
		try {
			if (typeof val.length === "number" && typeof val.callee === "function") return true;
		} catch (err) {
			if (err.message.indexOf("callee") !== -1) return true;
		}
		return false;
	}
	/**
	* If you need to support Safari 5-7 (8-10 yr-old browser),
	* take a look at https://github.com/feross/is-buffer
	*/
	function isBuffer(val) {
		if (val.constructor && typeof val.constructor.isBuffer === "function") return val.constructor.isBuffer(val);
		return false;
	}
}));
//#endregion
//#region node_modules/is-extendable/index.js
/*!
* is-extendable <https://github.com/jonschlinkert/is-extendable>
*
* Copyright (c) 2015, Jon Schlinkert.
* Licensed under the MIT License.
*/
var require_is_extendable = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function isExtendable(val) {
		return typeof val !== "undefined" && val !== null && (typeof val === "object" || typeof val === "function");
	};
}));
//#endregion
//#region node_modules/extend-shallow/index.js
var require_extend_shallow = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isObject = require_is_extendable();
	module.exports = function extend(o) {
		if (!isObject(o)) o = {};
		var len = arguments.length;
		for (var i = 1; i < len; i++) {
			var obj = arguments[i];
			if (isObject(obj)) assign(o, obj);
		}
		return o;
	};
	function assign(a, b) {
		for (var key in b) if (hasOwn(b, key)) a[key] = b[key];
	}
	/**
	* Returns true if the given `key` is an own property of `obj`.
	*/
	function hasOwn(obj, key) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	}
}));
//#endregion
//#region node_modules/section-matter/index.js
var require_section_matter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var typeOf = require_kind_of();
	var extend = require_extend_shallow();
	/**
	* Parse sections in `input` with the given `options`.
	*
	* ```js
	* var sections = require('{%= name %}');
	* var result = sections(input, options);
	* // { content: 'Content before sections', sections: [] }
	* ```
	* @param {String|Buffer|Object} `input` If input is an object, it's `content` property must be a string or buffer.
	* @param {Object} options
	* @return {Object} Returns an object with a `content` string and an array of `sections` objects.
	* @api public
	*/
	module.exports = function(input, options) {
		if (typeof options === "function") options = { parse: options };
		var file = toObject(input);
		var opts = extend({}, {
			section_delimiter: "---",
			parse: identity
		}, options);
		var delim = opts.section_delimiter;
		var lines = file.content.split(/\r?\n/);
		var sections = null;
		var section = createSection();
		var content = [];
		var stack = [];
		function initSections(val) {
			file.content = val;
			sections = [];
			content = [];
		}
		function closeSection(val) {
			if (stack.length) {
				section.key = getKey(stack[0], delim);
				section.content = val;
				opts.parse(section, sections);
				sections.push(section);
				section = createSection();
				content = [];
				stack = [];
			}
		}
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var len = stack.length;
			var ln = line.trim();
			if (isDelimiter(ln, delim)) {
				if (ln.length === 3 && i !== 0) {
					if (len === 0 || len === 2) {
						content.push(line);
						continue;
					}
					stack.push(ln);
					section.data = content.join("\n");
					content = [];
					continue;
				}
				if (sections === null) initSections(content.join("\n"));
				if (len === 2) closeSection(content.join("\n"));
				stack.push(ln);
				continue;
			}
			content.push(line);
		}
		if (sections === null) initSections(content.join("\n"));
		else closeSection(content.join("\n"));
		file.sections = sections;
		return file;
	};
	function isDelimiter(line, delim) {
		if (line.slice(0, delim.length) !== delim) return false;
		if (line.charAt(delim.length + 1) === delim.slice(-1)) return false;
		return true;
	}
	function toObject(input) {
		if (typeOf(input) !== "object") input = { content: input };
		if (typeof input.content !== "string" && !isBuffer(input.content)) throw new TypeError("expected a buffer or string");
		input.content = input.content.toString();
		input.sections = [];
		return input;
	}
	function getKey(val, delim) {
		return val ? val.slice(delim.length).trim() : "";
	}
	function createSection() {
		return {
			key: "",
			data: "",
			content: ""
		};
	}
	function identity(val) {
		return val;
	}
	function isBuffer(val) {
		if (val && val.constructor && typeof val.constructor.isBuffer === "function") return val.constructor.isBuffer(val);
		return false;
	}
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/common.js
var require_common$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function isNothing(subject) {
		return typeof subject === "undefined" || subject === null;
	}
	function isObject(subject) {
		return typeof subject === "object" && subject !== null;
	}
	function toArray(sequence) {
		if (Array.isArray(sequence)) return sequence;
		else if (isNothing(sequence)) return [];
		return [sequence];
	}
	function extend(target, source) {
		var index, length, key, sourceKeys;
		if (source) {
			sourceKeys = Object.keys(source);
			for (index = 0, length = sourceKeys.length; index < length; index += 1) {
				key = sourceKeys[index];
				target[key] = source[key];
			}
		}
		return target;
	}
	function repeat(string, count) {
		var result = "", cycle;
		for (cycle = 0; cycle < count; cycle += 1) result += string;
		return result;
	}
	function isNegativeZero(number) {
		return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
	}
	module.exports.isNothing = isNothing;
	module.exports.isObject = isObject;
	module.exports.toArray = toArray;
	module.exports.repeat = repeat;
	module.exports.isNegativeZero = isNegativeZero;
	module.exports.extend = extend;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/exception.js
var require_exception = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function YAMLException(reason, mark) {
		Error.call(this);
		this.name = "YAMLException";
		this.reason = reason;
		this.mark = mark;
		this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : "");
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
		else this.stack = (/* @__PURE__ */ new Error()).stack || "";
	}
	YAMLException.prototype = Object.create(Error.prototype);
	YAMLException.prototype.constructor = YAMLException;
	YAMLException.prototype.toString = function toString(compact) {
		var result = this.name + ": ";
		result += this.reason || "(unknown reason)";
		if (!compact && this.mark) result += " " + this.mark.toString();
		return result;
	};
	module.exports = YAMLException;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/mark.js
var require_mark = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	function Mark(name, buffer, position, line, column) {
		this.name = name;
		this.buffer = buffer;
		this.position = position;
		this.line = line;
		this.column = column;
	}
	Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
		var head, start, tail, end, snippet;
		if (!this.buffer) return null;
		indent = indent || 4;
		maxLength = maxLength || 75;
		head = "";
		start = this.position;
		while (start > 0 && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1) {
			start -= 1;
			if (this.position - start > maxLength / 2 - 1) {
				head = " ... ";
				start += 5;
				break;
			}
		}
		tail = "";
		end = this.position;
		while (end < this.buffer.length && "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1) {
			end += 1;
			if (end - this.position > maxLength / 2 - 1) {
				tail = " ... ";
				end -= 5;
				break;
			}
		}
		snippet = this.buffer.slice(start, end);
		return common.repeat(" ", indent) + head + snippet + tail + "\n" + common.repeat(" ", indent + this.position - start + head.length) + "^";
	};
	Mark.prototype.toString = function toString(compact) {
		var snippet, where = "";
		if (this.name) where += "in \"" + this.name + "\" ";
		where += "at line " + (this.line + 1) + ", column " + (this.column + 1);
		if (!compact) {
			snippet = this.getSnippet();
			if (snippet) where += ":\n" + snippet;
		}
		return where;
	};
	module.exports = Mark;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type.js
var require_type = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var YAMLException = require_exception();
	var TYPE_CONSTRUCTOR_OPTIONS = [
		"kind",
		"resolve",
		"construct",
		"instanceOf",
		"predicate",
		"represent",
		"defaultStyle",
		"styleAliases"
	];
	var YAML_NODE_KINDS = [
		"scalar",
		"sequence",
		"mapping"
	];
	function compileStyleAliases(map) {
		var result = {};
		if (map !== null) Object.keys(map).forEach(function(style) {
			map[style].forEach(function(alias) {
				result[String(alias)] = style;
			});
		});
		return result;
	}
	function Type(tag, options) {
		options = options || {};
		Object.keys(options).forEach(function(name) {
			if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) throw new YAMLException("Unknown option \"" + name + "\" is met in definition of \"" + tag + "\" YAML type.");
		});
		this.tag = tag;
		this.kind = options["kind"] || null;
		this.resolve = options["resolve"] || function() {
			return true;
		};
		this.construct = options["construct"] || function(data) {
			return data;
		};
		this.instanceOf = options["instanceOf"] || null;
		this.predicate = options["predicate"] || null;
		this.represent = options["represent"] || null;
		this.defaultStyle = options["defaultStyle"] || null;
		this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
		if (YAML_NODE_KINDS.indexOf(this.kind) === -1) throw new YAMLException("Unknown kind \"" + this.kind + "\" is specified for \"" + tag + "\" YAML type.");
	}
	module.exports = Type;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema.js
var require_schema = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	var YAMLException = require_exception();
	var Type = require_type();
	function compileList(schema, name, result) {
		var exclude = [];
		schema.include.forEach(function(includedSchema) {
			result = compileList(includedSchema, name, result);
		});
		schema[name].forEach(function(currentType) {
			result.forEach(function(previousType, previousIndex) {
				if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) exclude.push(previousIndex);
			});
			result.push(currentType);
		});
		return result.filter(function(type, index) {
			return exclude.indexOf(index) === -1;
		});
	}
	function compileMap() {
		var result = {
			scalar: {},
			sequence: {},
			mapping: {},
			fallback: {}
		}, index, length;
		function collectType(type) {
			result[type.kind][type.tag] = result["fallback"][type.tag] = type;
		}
		for (index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
		return result;
	}
	function Schema(definition) {
		this.include = definition.include || [];
		this.implicit = definition.implicit || [];
		this.explicit = definition.explicit || [];
		this.implicit.forEach(function(type) {
			if (type.loadKind && type.loadKind !== "scalar") throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
		});
		this.compiledImplicit = compileList(this, "implicit", []);
		this.compiledExplicit = compileList(this, "explicit", []);
		this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
	}
	Schema.DEFAULT = null;
	Schema.create = function createSchema() {
		var schemas, types;
		switch (arguments.length) {
			case 1:
				schemas = Schema.DEFAULT;
				types = arguments[0];
				break;
			case 2:
				schemas = arguments[0];
				types = arguments[1];
				break;
			default: throw new YAMLException("Wrong number of arguments for Schema.create function");
		}
		schemas = common.toArray(schemas);
		types = common.toArray(types);
		if (!schemas.every(function(schema) {
			return schema instanceof Schema;
		})) throw new YAMLException("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
		if (!types.every(function(type) {
			return type instanceof Type;
		})) throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
		return new Schema({
			include: schemas,
			explicit: types
		});
	};
	module.exports = Schema;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/str.js
var require_str = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:str", {
		kind: "scalar",
		construct: function(data) {
			return data !== null ? data : "";
		}
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/seq.js
var require_seq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:seq", {
		kind: "sequence",
		construct: function(data) {
			return data !== null ? data : [];
		}
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/map.js
var require_map = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_type())("tag:yaml.org,2002:map", {
		kind: "mapping",
		construct: function(data) {
			return data !== null ? data : {};
		}
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/failsafe.js
var require_failsafe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({ explicit: [
		require_str(),
		require_seq(),
		require_map()
	] });
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/null.js
var require_null = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlNull(data) {
		if (data === null) return true;
		var max = data.length;
		return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
	}
	function constructYamlNull() {
		return null;
	}
	function isNull(object) {
		return object === null;
	}
	module.exports = new Type("tag:yaml.org,2002:null", {
		kind: "scalar",
		resolve: resolveYamlNull,
		construct: constructYamlNull,
		predicate: isNull,
		represent: {
			canonical: function() {
				return "~";
			},
			lowercase: function() {
				return "null";
			},
			uppercase: function() {
				return "NULL";
			},
			camelcase: function() {
				return "Null";
			}
		},
		defaultStyle: "lowercase"
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/bool.js
var require_bool = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlBoolean(data) {
		if (data === null) return false;
		var max = data.length;
		return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
	}
	function constructYamlBoolean(data) {
		return data === "true" || data === "True" || data === "TRUE";
	}
	function isBoolean(object) {
		return Object.prototype.toString.call(object) === "[object Boolean]";
	}
	module.exports = new Type("tag:yaml.org,2002:bool", {
		kind: "scalar",
		resolve: resolveYamlBoolean,
		construct: constructYamlBoolean,
		predicate: isBoolean,
		represent: {
			lowercase: function(object) {
				return object ? "true" : "false";
			},
			uppercase: function(object) {
				return object ? "TRUE" : "FALSE";
			},
			camelcase: function(object) {
				return object ? "True" : "False";
			}
		},
		defaultStyle: "lowercase"
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/int.js
var require_int = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	var Type = require_type();
	function isHexCode(c) {
		return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
	}
	function isOctCode(c) {
		return 48 <= c && c <= 55;
	}
	function isDecCode(c) {
		return 48 <= c && c <= 57;
	}
	function resolveYamlInteger(data) {
		if (data === null) return false;
		var max = data.length, index = 0, hasDigits = false, ch;
		if (!max) return false;
		ch = data[index];
		if (ch === "-" || ch === "+") ch = data[++index];
		if (ch === "0") {
			if (index + 1 === max) return true;
			ch = data[++index];
			if (ch === "b") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch === "_") continue;
					if (ch !== "0" && ch !== "1") return false;
					hasDigits = true;
				}
				return hasDigits && ch !== "_";
			}
			if (ch === "x") {
				index++;
				for (; index < max; index++) {
					ch = data[index];
					if (ch === "_") continue;
					if (!isHexCode(data.charCodeAt(index))) return false;
					hasDigits = true;
				}
				return hasDigits && ch !== "_";
			}
			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isOctCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
		if (ch === "_") return false;
		for (; index < max; index++) {
			ch = data[index];
			if (ch === "_") continue;
			if (ch === ":") break;
			if (!isDecCode(data.charCodeAt(index))) return false;
			hasDigits = true;
		}
		if (!hasDigits || ch === "_") return false;
		if (ch !== ":") return true;
		return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
	}
	function constructYamlInteger(data) {
		var value = data, sign = 1, ch, base, digits = [];
		if (value.indexOf("_") !== -1) value = value.replace(/_/g, "");
		ch = value[0];
		if (ch === "-" || ch === "+") {
			if (ch === "-") sign = -1;
			value = value.slice(1);
			ch = value[0];
		}
		if (value === "0") return 0;
		if (ch === "0") {
			if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
			if (value[1] === "x") return sign * parseInt(value, 16);
			return sign * parseInt(value, 8);
		}
		if (value.indexOf(":") !== -1) {
			value.split(":").forEach(function(v) {
				digits.unshift(parseInt(v, 10));
			});
			value = 0;
			base = 1;
			digits.forEach(function(d) {
				value += d * base;
				base *= 60;
			});
			return sign * value;
		}
		return sign * parseInt(value, 10);
	}
	function isInteger(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && object % 1 === 0 && !common.isNegativeZero(object);
	}
	module.exports = new Type("tag:yaml.org,2002:int", {
		kind: "scalar",
		resolve: resolveYamlInteger,
		construct: constructYamlInteger,
		predicate: isInteger,
		represent: {
			binary: function(obj) {
				return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
			},
			octal: function(obj) {
				return obj >= 0 ? "0" + obj.toString(8) : "-0" + obj.toString(8).slice(1);
			},
			decimal: function(obj) {
				return obj.toString(10);
			},
			hexadecimal: function(obj) {
				return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
			}
		},
		defaultStyle: "decimal",
		styleAliases: {
			binary: [2, "bin"],
			octal: [8, "oct"],
			decimal: [10, "dec"],
			hexadecimal: [16, "hex"]
		}
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/float.js
var require_float = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	var Type = require_type();
	var YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
	function resolveYamlFloat(data) {
		if (data === null) return false;
		if (!YAML_FLOAT_PATTERN.test(data) || data[data.length - 1] === "_") return false;
		return true;
	}
	function constructYamlFloat(data) {
		var value = data.replace(/_/g, "").toLowerCase(), sign = value[0] === "-" ? -1 : 1, base, digits = [];
		if ("+-".indexOf(value[0]) >= 0) value = value.slice(1);
		if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
		else if (value === ".nan") return NaN;
		else if (value.indexOf(":") >= 0) {
			value.split(":").forEach(function(v) {
				digits.unshift(parseFloat(v, 10));
			});
			value = 0;
			base = 1;
			digits.forEach(function(d) {
				value += d * base;
				base *= 60;
			});
			return sign * value;
		}
		return sign * parseFloat(value, 10);
	}
	var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
	function representYamlFloat(object, style) {
		var res;
		if (isNaN(object)) switch (style) {
			case "lowercase": return ".nan";
			case "uppercase": return ".NAN";
			case "camelcase": return ".NaN";
		}
		else if (Number.POSITIVE_INFINITY === object) switch (style) {
			case "lowercase": return ".inf";
			case "uppercase": return ".INF";
			case "camelcase": return ".Inf";
		}
		else if (Number.NEGATIVE_INFINITY === object) switch (style) {
			case "lowercase": return "-.inf";
			case "uppercase": return "-.INF";
			case "camelcase": return "-.Inf";
		}
		else if (common.isNegativeZero(object)) return "-0.0";
		res = object.toString(10);
		return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
	}
	function isFloat(object) {
		return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
	}
	module.exports = new Type("tag:yaml.org,2002:float", {
		kind: "scalar",
		resolve: resolveYamlFloat,
		construct: constructYamlFloat,
		predicate: isFloat,
		represent: representYamlFloat,
		defaultStyle: "lowercase"
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/json.js
var require_json = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({
		include: [require_failsafe()],
		implicit: [
			require_null(),
			require_bool(),
			require_int(),
			require_float()
		]
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/core.js
var require_core = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({ include: [require_json()] });
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/timestamp.js
var require_timestamp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
	var YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
	function resolveYamlTimestamp(data) {
		if (data === null) return false;
		if (YAML_DATE_REGEXP.exec(data) !== null) return true;
		if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
		return false;
	}
	function constructYamlTimestamp(data) {
		var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
		match = YAML_DATE_REGEXP.exec(data);
		if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
		if (match === null) throw new Error("Date resolve error");
		year = +match[1];
		month = +match[2] - 1;
		day = +match[3];
		if (!match[4]) return new Date(Date.UTC(year, month, day));
		hour = +match[4];
		minute = +match[5];
		second = +match[6];
		if (match[7]) {
			fraction = match[7].slice(0, 3);
			while (fraction.length < 3) fraction += "0";
			fraction = +fraction;
		}
		if (match[9]) {
			tz_hour = +match[10];
			tz_minute = +(match[11] || 0);
			delta = (tz_hour * 60 + tz_minute) * 6e4;
			if (match[9] === "-") delta = -delta;
		}
		date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
		if (delta) date.setTime(date.getTime() - delta);
		return date;
	}
	function representYamlTimestamp(object) {
		return object.toISOString();
	}
	module.exports = new Type("tag:yaml.org,2002:timestamp", {
		kind: "scalar",
		resolve: resolveYamlTimestamp,
		construct: constructYamlTimestamp,
		instanceOf: Date,
		represent: representYamlTimestamp
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/merge.js
var require_merge = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveYamlMerge(data) {
		return data === "<<" || data === null;
	}
	module.exports = new Type("tag:yaml.org,2002:merge", {
		kind: "scalar",
		resolve: resolveYamlMerge
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/binary.js
var require_binary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var NodeBuffer;
	try {
		NodeBuffer = __require("buffer").Buffer;
	} catch (__) {}
	var Type = require_type();
	var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
	function resolveYamlBinary(data) {
		if (data === null) return false;
		var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
		for (idx = 0; idx < max; idx++) {
			code = map.indexOf(data.charAt(idx));
			if (code > 64) continue;
			if (code < 0) return false;
			bitlen += 6;
		}
		return bitlen % 8 === 0;
	}
	function constructYamlBinary(data) {
		var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
		for (idx = 0; idx < max; idx++) {
			if (idx % 4 === 0 && idx) {
				result.push(bits >> 16 & 255);
				result.push(bits >> 8 & 255);
				result.push(bits & 255);
			}
			bits = bits << 6 | map.indexOf(input.charAt(idx));
		}
		tailbits = max % 4 * 6;
		if (tailbits === 0) {
			result.push(bits >> 16 & 255);
			result.push(bits >> 8 & 255);
			result.push(bits & 255);
		} else if (tailbits === 18) {
			result.push(bits >> 10 & 255);
			result.push(bits >> 2 & 255);
		} else if (tailbits === 12) result.push(bits >> 4 & 255);
		if (NodeBuffer) return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
		return result;
	}
	function representYamlBinary(object) {
		var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
		for (idx = 0; idx < max; idx++) {
			if (idx % 3 === 0 && idx) {
				result += map[bits >> 18 & 63];
				result += map[bits >> 12 & 63];
				result += map[bits >> 6 & 63];
				result += map[bits & 63];
			}
			bits = (bits << 8) + object[idx];
		}
		tail = max % 3;
		if (tail === 0) {
			result += map[bits >> 18 & 63];
			result += map[bits >> 12 & 63];
			result += map[bits >> 6 & 63];
			result += map[bits & 63];
		} else if (tail === 2) {
			result += map[bits >> 10 & 63];
			result += map[bits >> 4 & 63];
			result += map[bits << 2 & 63];
			result += map[64];
		} else if (tail === 1) {
			result += map[bits >> 2 & 63];
			result += map[bits << 4 & 63];
			result += map[64];
			result += map[64];
		}
		return result;
	}
	function isBinary(object) {
		return NodeBuffer && NodeBuffer.isBuffer(object);
	}
	module.exports = new Type("tag:yaml.org,2002:binary", {
		kind: "scalar",
		resolve: resolveYamlBinary,
		construct: constructYamlBinary,
		predicate: isBinary,
		represent: representYamlBinary
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/omap.js
var require_omap = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var _toString = Object.prototype.toString;
	function resolveYamlOmap(data) {
		if (data === null) return true;
		var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			pairHasKey = false;
			if (_toString.call(pair) !== "[object Object]") return false;
			for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) if (!pairHasKey) pairHasKey = true;
			else return false;
			if (!pairHasKey) return false;
			if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
			else return false;
		}
		return true;
	}
	function constructYamlOmap(data) {
		return data !== null ? data : [];
	}
	module.exports = new Type("tag:yaml.org,2002:omap", {
		kind: "sequence",
		resolve: resolveYamlOmap,
		construct: constructYamlOmap
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/pairs.js
var require_pairs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _toString = Object.prototype.toString;
	function resolveYamlPairs(data) {
		if (data === null) return true;
		var index, length, pair, keys, result, object = data;
		result = new Array(object.length);
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			if (_toString.call(pair) !== "[object Object]") return false;
			keys = Object.keys(pair);
			if (keys.length !== 1) return false;
			result[index] = [keys[0], pair[keys[0]]];
		}
		return true;
	}
	function constructYamlPairs(data) {
		if (data === null) return [];
		var index, length, pair, keys, result, object = data;
		result = new Array(object.length);
		for (index = 0, length = object.length; index < length; index += 1) {
			pair = object[index];
			keys = Object.keys(pair);
			result[index] = [keys[0], pair[keys[0]]];
		}
		return result;
	}
	module.exports = new Type("tag:yaml.org,2002:pairs", {
		kind: "sequence",
		resolve: resolveYamlPairs,
		construct: constructYamlPairs
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/set.js
var require_set = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	function resolveYamlSet(data) {
		if (data === null) return true;
		var key, object = data;
		for (key in object) if (_hasOwnProperty.call(object, key)) {
			if (object[key] !== null) return false;
		}
		return true;
	}
	function constructYamlSet(data) {
		return data !== null ? data : {};
	}
	module.exports = new Type("tag:yaml.org,2002:set", {
		kind: "mapping",
		resolve: resolveYamlSet,
		construct: constructYamlSet
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_safe.js
var require_default_safe = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = new (require_schema())({
		include: [require_core()],
		implicit: [require_timestamp(), require_merge()],
		explicit: [
			require_binary(),
			require_omap(),
			require_pairs(),
			require_set()
		]
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/undefined.js
var require_undefined = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveJavascriptUndefined() {
		return true;
	}
	function constructJavascriptUndefined() {}
	function representJavascriptUndefined() {
		return "";
	}
	function isUndefined(object) {
		return typeof object === "undefined";
	}
	module.exports = new Type("tag:yaml.org,2002:js/undefined", {
		kind: "scalar",
		resolve: resolveJavascriptUndefined,
		construct: constructJavascriptUndefined,
		predicate: isUndefined,
		represent: representJavascriptUndefined
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/regexp.js
var require_regexp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Type = require_type();
	function resolveJavascriptRegExp(data) {
		if (data === null) return false;
		if (data.length === 0) return false;
		var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
		if (regexp[0] === "/") {
			if (tail) modifiers = tail[1];
			if (modifiers.length > 3) return false;
			if (regexp[regexp.length - modifiers.length - 1] !== "/") return false;
		}
		return true;
	}
	function constructJavascriptRegExp(data) {
		var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
		if (regexp[0] === "/") {
			if (tail) modifiers = tail[1];
			regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
		}
		return new RegExp(regexp, modifiers);
	}
	function representJavascriptRegExp(object) {
		var result = "/" + object.source + "/";
		if (object.global) result += "g";
		if (object.multiline) result += "m";
		if (object.ignoreCase) result += "i";
		return result;
	}
	function isRegExp(object) {
		return Object.prototype.toString.call(object) === "[object RegExp]";
	}
	module.exports = new Type("tag:yaml.org,2002:js/regexp", {
		kind: "scalar",
		resolve: resolveJavascriptRegExp,
		construct: constructJavascriptRegExp,
		predicate: isRegExp,
		represent: representJavascriptRegExp
	});
}));
//#endregion
//#region node_modules/esprima/dist/esprima.js
var require_esprima = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function webpackUniversalModuleDefinition(root, factory) {
		/* istanbul ignore next */
		if (typeof exports === "object" && typeof module === "object") module.exports = factory();
		else if (typeof define === "function" && define.amd) define([], factory);
		else if (typeof exports === "object") exports["esprima"] = factory();
		else root["esprima"] = factory();
	})(exports, function() {
		return (function(modules) {
			var installedModules = {};
			function __webpack_require__(moduleId) {
				/* istanbul ignore if */
				if (installedModules[moduleId]) return installedModules[moduleId].exports;
				var module$1 = installedModules[moduleId] = {
					exports: {},
					id: moduleId,
					loaded: false
				};
				modules[moduleId].call(module$1.exports, module$1, module$1.exports, __webpack_require__);
				module$1.loaded = true;
				return module$1.exports;
			}
			__webpack_require__.m = modules;
			__webpack_require__.c = installedModules;
			__webpack_require__.p = "";
			return __webpack_require__(0);
		})([
			function(module$2, exports$1, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$1, "__esModule", { value: true });
				var comment_handler_1 = __webpack_require__(1);
				var jsx_parser_1 = __webpack_require__(3);
				var parser_1 = __webpack_require__(8);
				var tokenizer_1 = __webpack_require__(15);
				function parse(code, options, delegate) {
					var commentHandler = null;
					var proxyDelegate = function(node, metadata) {
						if (delegate) delegate(node, metadata);
						if (commentHandler) commentHandler.visit(node, metadata);
					};
					var parserDelegate = typeof delegate === "function" ? proxyDelegate : null;
					var collectComment = false;
					if (options) {
						collectComment = typeof options.comment === "boolean" && options.comment;
						var attachComment = typeof options.attachComment === "boolean" && options.attachComment;
						if (collectComment || attachComment) {
							commentHandler = new comment_handler_1.CommentHandler();
							commentHandler.attach = attachComment;
							options.comment = true;
							parserDelegate = proxyDelegate;
						}
					}
					var isModule = false;
					if (options && typeof options.sourceType === "string") isModule = options.sourceType === "module";
					var parser;
					if (options && typeof options.jsx === "boolean" && options.jsx) parser = new jsx_parser_1.JSXParser(code, options, parserDelegate);
					else parser = new parser_1.Parser(code, options, parserDelegate);
					var ast = isModule ? parser.parseModule() : parser.parseScript();
					if (collectComment && commentHandler) ast.comments = commentHandler.comments;
					if (parser.config.tokens) ast.tokens = parser.tokens;
					if (parser.config.tolerant) ast.errors = parser.errorHandler.errors;
					return ast;
				}
				exports$1.parse = parse;
				function parseModule(code, options, delegate) {
					var parsingOptions = options || {};
					parsingOptions.sourceType = "module";
					return parse(code, parsingOptions, delegate);
				}
				exports$1.parseModule = parseModule;
				function parseScript(code, options, delegate) {
					var parsingOptions = options || {};
					parsingOptions.sourceType = "script";
					return parse(code, parsingOptions, delegate);
				}
				exports$1.parseScript = parseScript;
				function tokenize(code, options, delegate) {
					var tokenizer = new tokenizer_1.Tokenizer(code, options);
					var tokens = [];
					try {
						while (true) {
							var token = tokenizer.getNextToken();
							if (!token) break;
							if (delegate) token = delegate(token);
							tokens.push(token);
						}
					} catch (e) {
						tokenizer.errorHandler.tolerate(e);
					}
					if (tokenizer.errorHandler.tolerant) tokens.errors = tokenizer.errors();
					return tokens;
				}
				exports$1.tokenize = tokenize;
				exports$1.Syntax = __webpack_require__(2).Syntax;
				exports$1.version = "4.0.1";
			},
			function(module$3, exports$2, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$2, "__esModule", { value: true });
				var syntax_1 = __webpack_require__(2);
				exports$2.CommentHandler = function() {
					function CommentHandler() {
						this.attach = false;
						this.comments = [];
						this.stack = [];
						this.leading = [];
						this.trailing = [];
					}
					CommentHandler.prototype.insertInnerComments = function(node, metadata) {
						if (node.type === syntax_1.Syntax.BlockStatement && node.body.length === 0) {
							var innerComments = [];
							for (var i = this.leading.length - 1; i >= 0; --i) {
								var entry = this.leading[i];
								if (metadata.end.offset >= entry.start) {
									innerComments.unshift(entry.comment);
									this.leading.splice(i, 1);
									this.trailing.splice(i, 1);
								}
							}
							if (innerComments.length) node.innerComments = innerComments;
						}
					};
					CommentHandler.prototype.findTrailingComments = function(metadata) {
						var trailingComments = [];
						if (this.trailing.length > 0) {
							for (var i = this.trailing.length - 1; i >= 0; --i) {
								var entry_1 = this.trailing[i];
								if (entry_1.start >= metadata.end.offset) trailingComments.unshift(entry_1.comment);
							}
							this.trailing.length = 0;
							return trailingComments;
						}
						var entry = this.stack[this.stack.length - 1];
						if (entry && entry.node.trailingComments) {
							var firstComment = entry.node.trailingComments[0];
							if (firstComment && firstComment.range[0] >= metadata.end.offset) {
								trailingComments = entry.node.trailingComments;
								delete entry.node.trailingComments;
							}
						}
						return trailingComments;
					};
					CommentHandler.prototype.findLeadingComments = function(metadata) {
						var leadingComments = [];
						var target;
						while (this.stack.length > 0) {
							var entry = this.stack[this.stack.length - 1];
							if (entry && entry.start >= metadata.start.offset) {
								target = entry.node;
								this.stack.pop();
							} else break;
						}
						if (target) {
							for (var i = (target.leadingComments ? target.leadingComments.length : 0) - 1; i >= 0; --i) {
								var comment = target.leadingComments[i];
								if (comment.range[1] <= metadata.start.offset) {
									leadingComments.unshift(comment);
									target.leadingComments.splice(i, 1);
								}
							}
							if (target.leadingComments && target.leadingComments.length === 0) delete target.leadingComments;
							return leadingComments;
						}
						for (var i = this.leading.length - 1; i >= 0; --i) {
							var entry = this.leading[i];
							if (entry.start <= metadata.start.offset) {
								leadingComments.unshift(entry.comment);
								this.leading.splice(i, 1);
							}
						}
						return leadingComments;
					};
					CommentHandler.prototype.visitNode = function(node, metadata) {
						if (node.type === syntax_1.Syntax.Program && node.body.length > 0) return;
						this.insertInnerComments(node, metadata);
						var trailingComments = this.findTrailingComments(metadata);
						var leadingComments = this.findLeadingComments(metadata);
						if (leadingComments.length > 0) node.leadingComments = leadingComments;
						if (trailingComments.length > 0) node.trailingComments = trailingComments;
						this.stack.push({
							node,
							start: metadata.start.offset
						});
					};
					CommentHandler.prototype.visitComment = function(node, metadata) {
						var type = node.type[0] === "L" ? "Line" : "Block";
						var comment = {
							type,
							value: node.value
						};
						if (node.range) comment.range = node.range;
						if (node.loc) comment.loc = node.loc;
						this.comments.push(comment);
						if (this.attach) {
							var entry = {
								comment: {
									type,
									value: node.value,
									range: [metadata.start.offset, metadata.end.offset]
								},
								start: metadata.start.offset
							};
							if (node.loc) entry.comment.loc = node.loc;
							node.type = type;
							this.leading.push(entry);
							this.trailing.push(entry);
						}
					};
					CommentHandler.prototype.visit = function(node, metadata) {
						if (node.type === "LineComment") this.visitComment(node, metadata);
						else if (node.type === "BlockComment") this.visitComment(node, metadata);
						else if (this.attach) this.visitNode(node, metadata);
					};
					return CommentHandler;
				}();
			},
			function(module$4, exports$3) {
				"use strict";
				Object.defineProperty(exports$3, "__esModule", { value: true });
				exports$3.Syntax = {
					AssignmentExpression: "AssignmentExpression",
					AssignmentPattern: "AssignmentPattern",
					ArrayExpression: "ArrayExpression",
					ArrayPattern: "ArrayPattern",
					ArrowFunctionExpression: "ArrowFunctionExpression",
					AwaitExpression: "AwaitExpression",
					BlockStatement: "BlockStatement",
					BinaryExpression: "BinaryExpression",
					BreakStatement: "BreakStatement",
					CallExpression: "CallExpression",
					CatchClause: "CatchClause",
					ClassBody: "ClassBody",
					ClassDeclaration: "ClassDeclaration",
					ClassExpression: "ClassExpression",
					ConditionalExpression: "ConditionalExpression",
					ContinueStatement: "ContinueStatement",
					DoWhileStatement: "DoWhileStatement",
					DebuggerStatement: "DebuggerStatement",
					EmptyStatement: "EmptyStatement",
					ExportAllDeclaration: "ExportAllDeclaration",
					ExportDefaultDeclaration: "ExportDefaultDeclaration",
					ExportNamedDeclaration: "ExportNamedDeclaration",
					ExportSpecifier: "ExportSpecifier",
					ExpressionStatement: "ExpressionStatement",
					ForStatement: "ForStatement",
					ForOfStatement: "ForOfStatement",
					ForInStatement: "ForInStatement",
					FunctionDeclaration: "FunctionDeclaration",
					FunctionExpression: "FunctionExpression",
					Identifier: "Identifier",
					IfStatement: "IfStatement",
					ImportDeclaration: "ImportDeclaration",
					ImportDefaultSpecifier: "ImportDefaultSpecifier",
					ImportNamespaceSpecifier: "ImportNamespaceSpecifier",
					ImportSpecifier: "ImportSpecifier",
					Literal: "Literal",
					LabeledStatement: "LabeledStatement",
					LogicalExpression: "LogicalExpression",
					MemberExpression: "MemberExpression",
					MetaProperty: "MetaProperty",
					MethodDefinition: "MethodDefinition",
					NewExpression: "NewExpression",
					ObjectExpression: "ObjectExpression",
					ObjectPattern: "ObjectPattern",
					Program: "Program",
					Property: "Property",
					RestElement: "RestElement",
					ReturnStatement: "ReturnStatement",
					SequenceExpression: "SequenceExpression",
					SpreadElement: "SpreadElement",
					Super: "Super",
					SwitchCase: "SwitchCase",
					SwitchStatement: "SwitchStatement",
					TaggedTemplateExpression: "TaggedTemplateExpression",
					TemplateElement: "TemplateElement",
					TemplateLiteral: "TemplateLiteral",
					ThisExpression: "ThisExpression",
					ThrowStatement: "ThrowStatement",
					TryStatement: "TryStatement",
					UnaryExpression: "UnaryExpression",
					UpdateExpression: "UpdateExpression",
					VariableDeclaration: "VariableDeclaration",
					VariableDeclarator: "VariableDeclarator",
					WhileStatement: "WhileStatement",
					WithStatement: "WithStatement",
					YieldExpression: "YieldExpression"
				};
			},
			function(module$5, exports$4, __webpack_require__) {
				"use strict";
				/* istanbul ignore next */
				var __extends = this && this.__extends || (function() {
					var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
						d.__proto__ = b;
					} || function(d, b) {
						for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
					};
					return function(d, b) {
						extendStatics(d, b);
						function __() {
							this.constructor = d;
						}
						d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
					};
				})();
				Object.defineProperty(exports$4, "__esModule", { value: true });
				var character_1 = __webpack_require__(4);
				var JSXNode = __webpack_require__(5);
				var jsx_syntax_1 = __webpack_require__(6);
				var Node = __webpack_require__(7);
				var parser_1 = __webpack_require__(8);
				var token_1 = __webpack_require__(13);
				var xhtml_entities_1 = __webpack_require__(14);
				token_1.TokenName[100] = "JSXIdentifier";
				token_1.TokenName[101] = "JSXText";
				function getQualifiedElementName(elementName) {
					var qualifiedName;
					switch (elementName.type) {
						case jsx_syntax_1.JSXSyntax.JSXIdentifier:
							qualifiedName = elementName.name;
							break;
						case jsx_syntax_1.JSXSyntax.JSXNamespacedName:
							var ns = elementName;
							qualifiedName = getQualifiedElementName(ns.namespace) + ":" + getQualifiedElementName(ns.name);
							break;
						case jsx_syntax_1.JSXSyntax.JSXMemberExpression:
							var expr = elementName;
							qualifiedName = getQualifiedElementName(expr.object) + "." + getQualifiedElementName(expr.property);
							break;
						/* istanbul ignore next */
						default: break;
					}
					return qualifiedName;
				}
				exports$4.JSXParser = function(_super) {
					__extends(JSXParser, _super);
					function JSXParser(code, options, delegate) {
						return _super.call(this, code, options, delegate) || this;
					}
					JSXParser.prototype.parsePrimaryExpression = function() {
						return this.match("<") ? this.parseJSXRoot() : _super.prototype.parsePrimaryExpression.call(this);
					};
					JSXParser.prototype.startJSX = function() {
						this.scanner.index = this.startMarker.index;
						this.scanner.lineNumber = this.startMarker.line;
						this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
					};
					JSXParser.prototype.finishJSX = function() {
						this.nextToken();
					};
					JSXParser.prototype.reenterJSX = function() {
						this.startJSX();
						this.expectJSX("}");
						if (this.config.tokens) this.tokens.pop();
					};
					JSXParser.prototype.createJSXNode = function() {
						this.collectComments();
						return {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					};
					JSXParser.prototype.createJSXChildNode = function() {
						return {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					};
					JSXParser.prototype.scanXHTMLEntity = function(quote) {
						var result = "&";
						var valid = true;
						var terminated = false;
						var numeric = false;
						var hex = false;
						while (!this.scanner.eof() && valid && !terminated) {
							var ch = this.scanner.source[this.scanner.index];
							if (ch === quote) break;
							terminated = ch === ";";
							result += ch;
							++this.scanner.index;
							if (!terminated) switch (result.length) {
								case 2:
									numeric = ch === "#";
									break;
								case 3:
									if (numeric) {
										hex = ch === "x";
										valid = hex || character_1.Character.isDecimalDigit(ch.charCodeAt(0));
										numeric = numeric && !hex;
									}
									break;
								default:
									valid = valid && !(numeric && !character_1.Character.isDecimalDigit(ch.charCodeAt(0)));
									valid = valid && !(hex && !character_1.Character.isHexDigit(ch.charCodeAt(0)));
									break;
							}
						}
						if (valid && terminated && result.length > 2) {
							var str = result.substr(1, result.length - 2);
							if (numeric && str.length > 1) result = String.fromCharCode(parseInt(str.substr(1), 10));
							else if (hex && str.length > 2) result = String.fromCharCode(parseInt("0" + str.substr(1), 16));
							else if (!numeric && !hex && xhtml_entities_1.XHTMLEntities[str]) result = xhtml_entities_1.XHTMLEntities[str];
						}
						return result;
					};
					JSXParser.prototype.lexJSX = function() {
						var cp = this.scanner.source.charCodeAt(this.scanner.index);
						if (cp === 60 || cp === 62 || cp === 47 || cp === 58 || cp === 61 || cp === 123 || cp === 125) {
							var value = this.scanner.source[this.scanner.index++];
							return {
								type: 7,
								value,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start: this.scanner.index - 1,
								end: this.scanner.index
							};
						}
						if (cp === 34 || cp === 39) {
							var start = this.scanner.index;
							var quote = this.scanner.source[this.scanner.index++];
							var str = "";
							while (!this.scanner.eof()) {
								var ch = this.scanner.source[this.scanner.index++];
								if (ch === quote) break;
								else if (ch === "&") str += this.scanXHTMLEntity(quote);
								else str += ch;
							}
							return {
								type: 8,
								value: str,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						if (cp === 46) {
							var n1 = this.scanner.source.charCodeAt(this.scanner.index + 1);
							var n2 = this.scanner.source.charCodeAt(this.scanner.index + 2);
							var value = n1 === 46 && n2 === 46 ? "..." : ".";
							var start = this.scanner.index;
							this.scanner.index += value.length;
							return {
								type: 7,
								value,
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						if (cp === 96) return {
							type: 10,
							value: "",
							lineNumber: this.scanner.lineNumber,
							lineStart: this.scanner.lineStart,
							start: this.scanner.index,
							end: this.scanner.index
						};
						if (character_1.Character.isIdentifierStart(cp) && cp !== 92) {
							var start = this.scanner.index;
							++this.scanner.index;
							while (!this.scanner.eof()) {
								var ch = this.scanner.source.charCodeAt(this.scanner.index);
								if (character_1.Character.isIdentifierPart(ch) && ch !== 92) ++this.scanner.index;
								else if (ch === 45) ++this.scanner.index;
								else break;
							}
							return {
								type: 100,
								value: this.scanner.source.slice(start, this.scanner.index),
								lineNumber: this.scanner.lineNumber,
								lineStart: this.scanner.lineStart,
								start,
								end: this.scanner.index
							};
						}
						return this.scanner.lex();
					};
					JSXParser.prototype.nextJSXToken = function() {
						this.collectComments();
						this.startMarker.index = this.scanner.index;
						this.startMarker.line = this.scanner.lineNumber;
						this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						var token = this.lexJSX();
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						if (this.config.tokens) this.tokens.push(this.convertToken(token));
						return token;
					};
					JSXParser.prototype.nextJSXText = function() {
						this.startMarker.index = this.scanner.index;
						this.startMarker.line = this.scanner.lineNumber;
						this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						var start = this.scanner.index;
						var text = "";
						while (!this.scanner.eof()) {
							var ch = this.scanner.source[this.scanner.index];
							if (ch === "{" || ch === "<") break;
							++this.scanner.index;
							text += ch;
							if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) {
								++this.scanner.lineNumber;
								if (ch === "\r" && this.scanner.source[this.scanner.index] === "\n") ++this.scanner.index;
								this.scanner.lineStart = this.scanner.index;
							}
						}
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						var token = {
							type: 101,
							value: text,
							lineNumber: this.scanner.lineNumber,
							lineStart: this.scanner.lineStart,
							start,
							end: this.scanner.index
						};
						if (text.length > 0 && this.config.tokens) this.tokens.push(this.convertToken(token));
						return token;
					};
					JSXParser.prototype.peekJSXToken = function() {
						var state = this.scanner.saveState();
						this.scanner.scanComments();
						var next = this.lexJSX();
						this.scanner.restoreState(state);
						return next;
					};
					JSXParser.prototype.expectJSX = function(value) {
						var token = this.nextJSXToken();
						if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
					};
					JSXParser.prototype.matchJSX = function(value) {
						var next = this.peekJSXToken();
						return next.type === 7 && next.value === value;
					};
					JSXParser.prototype.parseJSXIdentifier = function() {
						var node = this.createJSXNode();
						var token = this.nextJSXToken();
						if (token.type !== 100) this.throwUnexpectedToken(token);
						return this.finalize(node, new JSXNode.JSXIdentifier(token.value));
					};
					JSXParser.prototype.parseJSXElementName = function() {
						var node = this.createJSXNode();
						var elementName = this.parseJSXIdentifier();
						if (this.matchJSX(":")) {
							var namespace = elementName;
							this.expectJSX(":");
							var name_1 = this.parseJSXIdentifier();
							elementName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_1));
						} else if (this.matchJSX(".")) while (this.matchJSX(".")) {
							var object = elementName;
							this.expectJSX(".");
							var property = this.parseJSXIdentifier();
							elementName = this.finalize(node, new JSXNode.JSXMemberExpression(object, property));
						}
						return elementName;
					};
					JSXParser.prototype.parseJSXAttributeName = function() {
						var node = this.createJSXNode();
						var attributeName;
						var identifier = this.parseJSXIdentifier();
						if (this.matchJSX(":")) {
							var namespace = identifier;
							this.expectJSX(":");
							var name_2 = this.parseJSXIdentifier();
							attributeName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_2));
						} else attributeName = identifier;
						return attributeName;
					};
					JSXParser.prototype.parseJSXStringLiteralAttribute = function() {
						var node = this.createJSXNode();
						var token = this.nextJSXToken();
						if (token.type !== 8) this.throwUnexpectedToken(token);
						var raw = this.getTokenRaw(token);
						return this.finalize(node, new Node.Literal(token.value, raw));
					};
					JSXParser.prototype.parseJSXExpressionAttribute = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						this.finishJSX();
						if (this.match("}")) this.tolerateError("JSX attributes must only be assigned a non-empty expression");
						var expression = this.parseAssignmentExpression();
						this.reenterJSX();
						return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
					};
					JSXParser.prototype.parseJSXAttributeValue = function() {
						return this.matchJSX("{") ? this.parseJSXExpressionAttribute() : this.matchJSX("<") ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
					};
					JSXParser.prototype.parseJSXNameValueAttribute = function() {
						var node = this.createJSXNode();
						var name = this.parseJSXAttributeName();
						var value = null;
						if (this.matchJSX("=")) {
							this.expectJSX("=");
							value = this.parseJSXAttributeValue();
						}
						return this.finalize(node, new JSXNode.JSXAttribute(name, value));
					};
					JSXParser.prototype.parseJSXSpreadAttribute = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						this.expectJSX("...");
						this.finishJSX();
						var argument = this.parseAssignmentExpression();
						this.reenterJSX();
						return this.finalize(node, new JSXNode.JSXSpreadAttribute(argument));
					};
					JSXParser.prototype.parseJSXAttributes = function() {
						var attributes = [];
						while (!this.matchJSX("/") && !this.matchJSX(">")) {
							var attribute = this.matchJSX("{") ? this.parseJSXSpreadAttribute() : this.parseJSXNameValueAttribute();
							attributes.push(attribute);
						}
						return attributes;
					};
					JSXParser.prototype.parseJSXOpeningElement = function() {
						var node = this.createJSXNode();
						this.expectJSX("<");
						var name = this.parseJSXElementName();
						var attributes = this.parseJSXAttributes();
						var selfClosing = this.matchJSX("/");
						if (selfClosing) this.expectJSX("/");
						this.expectJSX(">");
						return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
					};
					JSXParser.prototype.parseJSXBoundaryElement = function() {
						var node = this.createJSXNode();
						this.expectJSX("<");
						if (this.matchJSX("/")) {
							this.expectJSX("/");
							var name_3 = this.parseJSXElementName();
							this.expectJSX(">");
							return this.finalize(node, new JSXNode.JSXClosingElement(name_3));
						}
						var name = this.parseJSXElementName();
						var attributes = this.parseJSXAttributes();
						var selfClosing = this.matchJSX("/");
						if (selfClosing) this.expectJSX("/");
						this.expectJSX(">");
						return this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
					};
					JSXParser.prototype.parseJSXEmptyExpression = function() {
						var node = this.createJSXChildNode();
						this.collectComments();
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						return this.finalize(node, new JSXNode.JSXEmptyExpression());
					};
					JSXParser.prototype.parseJSXExpressionContainer = function() {
						var node = this.createJSXNode();
						this.expectJSX("{");
						var expression;
						if (this.matchJSX("}")) {
							expression = this.parseJSXEmptyExpression();
							this.expectJSX("}");
						} else {
							this.finishJSX();
							expression = this.parseAssignmentExpression();
							this.reenterJSX();
						}
						return this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
					};
					JSXParser.prototype.parseJSXChildren = function() {
						var children = [];
						while (!this.scanner.eof()) {
							var node = this.createJSXChildNode();
							var token = this.nextJSXText();
							if (token.start < token.end) {
								var raw = this.getTokenRaw(token);
								var child = this.finalize(node, new JSXNode.JSXText(token.value, raw));
								children.push(child);
							}
							if (this.scanner.source[this.scanner.index] === "{") {
								var container = this.parseJSXExpressionContainer();
								children.push(container);
							} else break;
						}
						return children;
					};
					JSXParser.prototype.parseComplexJSXElement = function(el) {
						var stack = [];
						while (!this.scanner.eof()) {
							el.children = el.children.concat(this.parseJSXChildren());
							var node = this.createJSXChildNode();
							var element = this.parseJSXBoundaryElement();
							if (element.type === jsx_syntax_1.JSXSyntax.JSXOpeningElement) {
								var opening = element;
								if (opening.selfClosing) {
									var child = this.finalize(node, new JSXNode.JSXElement(opening, [], null));
									el.children.push(child);
								} else {
									stack.push(el);
									el = {
										node,
										opening,
										closing: null,
										children: []
									};
								}
							}
							if (element.type === jsx_syntax_1.JSXSyntax.JSXClosingElement) {
								el.closing = element;
								var open_1 = getQualifiedElementName(el.opening.name);
								if (open_1 !== getQualifiedElementName(el.closing.name)) this.tolerateError("Expected corresponding JSX closing tag for %0", open_1);
								if (stack.length > 0) {
									var child = this.finalize(el.node, new JSXNode.JSXElement(el.opening, el.children, el.closing));
									el = stack[stack.length - 1];
									el.children.push(child);
									stack.pop();
								} else break;
							}
						}
						return el;
					};
					JSXParser.prototype.parseJSXElement = function() {
						var node = this.createJSXNode();
						var opening = this.parseJSXOpeningElement();
						var children = [];
						var closing = null;
						if (!opening.selfClosing) {
							var el = this.parseComplexJSXElement({
								node,
								opening,
								closing,
								children
							});
							children = el.children;
							closing = el.closing;
						}
						return this.finalize(node, new JSXNode.JSXElement(opening, children, closing));
					};
					JSXParser.prototype.parseJSXRoot = function() {
						if (this.config.tokens) this.tokens.pop();
						this.startJSX();
						var element = this.parseJSXElement();
						this.finishJSX();
						return element;
					};
					JSXParser.prototype.isStartOfExpression = function() {
						return _super.prototype.isStartOfExpression.call(this) || this.match("<");
					};
					return JSXParser;
				}(parser_1.Parser);
			},
			function(module$6, exports$5) {
				"use strict";
				Object.defineProperty(exports$5, "__esModule", { value: true });
				var Regex = {
					NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/,
					NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
				};
				exports$5.Character = {
					fromCodePoint: function(cp) {
						return cp < 65536 ? String.fromCharCode(cp) : String.fromCharCode(55296 + (cp - 65536 >> 10)) + String.fromCharCode(56320 + (cp - 65536 & 1023));
					},
					isWhiteSpace: function(cp) {
						return cp === 32 || cp === 9 || cp === 11 || cp === 12 || cp === 160 || cp >= 5760 && [
							5760,
							8192,
							8193,
							8194,
							8195,
							8196,
							8197,
							8198,
							8199,
							8200,
							8201,
							8202,
							8239,
							8287,
							12288,
							65279
						].indexOf(cp) >= 0;
					},
					isLineTerminator: function(cp) {
						return cp === 10 || cp === 13 || cp === 8232 || cp === 8233;
					},
					isIdentifierStart: function(cp) {
						return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierStart.test(exports$5.Character.fromCodePoint(cp));
					},
					isIdentifierPart: function(cp) {
						return cp === 36 || cp === 95 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp >= 48 && cp <= 57 || cp === 92 || cp >= 128 && Regex.NonAsciiIdentifierPart.test(exports$5.Character.fromCodePoint(cp));
					},
					isDecimalDigit: function(cp) {
						return cp >= 48 && cp <= 57;
					},
					isHexDigit: function(cp) {
						return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 70 || cp >= 97 && cp <= 102;
					},
					isOctalDigit: function(cp) {
						return cp >= 48 && cp <= 55;
					}
				};
			},
			function(module$7, exports$6, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$6, "__esModule", { value: true });
				var jsx_syntax_1 = __webpack_require__(6);
				exports$6.JSXClosingElement = function() {
					function JSXClosingElement(name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXClosingElement;
						this.name = name;
					}
					return JSXClosingElement;
				}();
				exports$6.JSXElement = function() {
					function JSXElement(openingElement, children, closingElement) {
						this.type = jsx_syntax_1.JSXSyntax.JSXElement;
						this.openingElement = openingElement;
						this.children = children;
						this.closingElement = closingElement;
					}
					return JSXElement;
				}();
				exports$6.JSXEmptyExpression = function() {
					function JSXEmptyExpression() {
						this.type = jsx_syntax_1.JSXSyntax.JSXEmptyExpression;
					}
					return JSXEmptyExpression;
				}();
				exports$6.JSXExpressionContainer = function() {
					function JSXExpressionContainer(expression) {
						this.type = jsx_syntax_1.JSXSyntax.JSXExpressionContainer;
						this.expression = expression;
					}
					return JSXExpressionContainer;
				}();
				exports$6.JSXIdentifier = function() {
					function JSXIdentifier(name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXIdentifier;
						this.name = name;
					}
					return JSXIdentifier;
				}();
				exports$6.JSXMemberExpression = function() {
					function JSXMemberExpression(object, property) {
						this.type = jsx_syntax_1.JSXSyntax.JSXMemberExpression;
						this.object = object;
						this.property = property;
					}
					return JSXMemberExpression;
				}();
				exports$6.JSXAttribute = function() {
					function JSXAttribute(name, value) {
						this.type = jsx_syntax_1.JSXSyntax.JSXAttribute;
						this.name = name;
						this.value = value;
					}
					return JSXAttribute;
				}();
				exports$6.JSXNamespacedName = function() {
					function JSXNamespacedName(namespace, name) {
						this.type = jsx_syntax_1.JSXSyntax.JSXNamespacedName;
						this.namespace = namespace;
						this.name = name;
					}
					return JSXNamespacedName;
				}();
				exports$6.JSXOpeningElement = function() {
					function JSXOpeningElement(name, selfClosing, attributes) {
						this.type = jsx_syntax_1.JSXSyntax.JSXOpeningElement;
						this.name = name;
						this.selfClosing = selfClosing;
						this.attributes = attributes;
					}
					return JSXOpeningElement;
				}();
				exports$6.JSXSpreadAttribute = function() {
					function JSXSpreadAttribute(argument) {
						this.type = jsx_syntax_1.JSXSyntax.JSXSpreadAttribute;
						this.argument = argument;
					}
					return JSXSpreadAttribute;
				}();
				exports$6.JSXText = function() {
					function JSXText(value, raw) {
						this.type = jsx_syntax_1.JSXSyntax.JSXText;
						this.value = value;
						this.raw = raw;
					}
					return JSXText;
				}();
			},
			function(module$8, exports$7) {
				"use strict";
				Object.defineProperty(exports$7, "__esModule", { value: true });
				exports$7.JSXSyntax = {
					JSXAttribute: "JSXAttribute",
					JSXClosingElement: "JSXClosingElement",
					JSXElement: "JSXElement",
					JSXEmptyExpression: "JSXEmptyExpression",
					JSXExpressionContainer: "JSXExpressionContainer",
					JSXIdentifier: "JSXIdentifier",
					JSXMemberExpression: "JSXMemberExpression",
					JSXNamespacedName: "JSXNamespacedName",
					JSXOpeningElement: "JSXOpeningElement",
					JSXSpreadAttribute: "JSXSpreadAttribute",
					JSXText: "JSXText"
				};
			},
			function(module$9, exports$8, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$8, "__esModule", { value: true });
				var syntax_1 = __webpack_require__(2);
				exports$8.ArrayExpression = function() {
					function ArrayExpression(elements) {
						this.type = syntax_1.Syntax.ArrayExpression;
						this.elements = elements;
					}
					return ArrayExpression;
				}();
				exports$8.ArrayPattern = function() {
					function ArrayPattern(elements) {
						this.type = syntax_1.Syntax.ArrayPattern;
						this.elements = elements;
					}
					return ArrayPattern;
				}();
				exports$8.ArrowFunctionExpression = function() {
					function ArrowFunctionExpression(params, body, expression) {
						this.type = syntax_1.Syntax.ArrowFunctionExpression;
						this.id = null;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = expression;
						this.async = false;
					}
					return ArrowFunctionExpression;
				}();
				exports$8.AssignmentExpression = function() {
					function AssignmentExpression(operator, left, right) {
						this.type = syntax_1.Syntax.AssignmentExpression;
						this.operator = operator;
						this.left = left;
						this.right = right;
					}
					return AssignmentExpression;
				}();
				exports$8.AssignmentPattern = function() {
					function AssignmentPattern(left, right) {
						this.type = syntax_1.Syntax.AssignmentPattern;
						this.left = left;
						this.right = right;
					}
					return AssignmentPattern;
				}();
				exports$8.AsyncArrowFunctionExpression = function() {
					function AsyncArrowFunctionExpression(params, body, expression) {
						this.type = syntax_1.Syntax.ArrowFunctionExpression;
						this.id = null;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = expression;
						this.async = true;
					}
					return AsyncArrowFunctionExpression;
				}();
				exports$8.AsyncFunctionDeclaration = function() {
					function AsyncFunctionDeclaration(id, params, body) {
						this.type = syntax_1.Syntax.FunctionDeclaration;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = false;
						this.async = true;
					}
					return AsyncFunctionDeclaration;
				}();
				exports$8.AsyncFunctionExpression = function() {
					function AsyncFunctionExpression(id, params, body) {
						this.type = syntax_1.Syntax.FunctionExpression;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = false;
						this.expression = false;
						this.async = true;
					}
					return AsyncFunctionExpression;
				}();
				exports$8.AwaitExpression = function() {
					function AwaitExpression(argument) {
						this.type = syntax_1.Syntax.AwaitExpression;
						this.argument = argument;
					}
					return AwaitExpression;
				}();
				exports$8.BinaryExpression = function() {
					function BinaryExpression(operator, left, right) {
						var logical = operator === "||" || operator === "&&";
						this.type = logical ? syntax_1.Syntax.LogicalExpression : syntax_1.Syntax.BinaryExpression;
						this.operator = operator;
						this.left = left;
						this.right = right;
					}
					return BinaryExpression;
				}();
				exports$8.BlockStatement = function() {
					function BlockStatement(body) {
						this.type = syntax_1.Syntax.BlockStatement;
						this.body = body;
					}
					return BlockStatement;
				}();
				exports$8.BreakStatement = function() {
					function BreakStatement(label) {
						this.type = syntax_1.Syntax.BreakStatement;
						this.label = label;
					}
					return BreakStatement;
				}();
				exports$8.CallExpression = function() {
					function CallExpression(callee, args) {
						this.type = syntax_1.Syntax.CallExpression;
						this.callee = callee;
						this.arguments = args;
					}
					return CallExpression;
				}();
				exports$8.CatchClause = function() {
					function CatchClause(param, body) {
						this.type = syntax_1.Syntax.CatchClause;
						this.param = param;
						this.body = body;
					}
					return CatchClause;
				}();
				exports$8.ClassBody = function() {
					function ClassBody(body) {
						this.type = syntax_1.Syntax.ClassBody;
						this.body = body;
					}
					return ClassBody;
				}();
				exports$8.ClassDeclaration = function() {
					function ClassDeclaration(id, superClass, body) {
						this.type = syntax_1.Syntax.ClassDeclaration;
						this.id = id;
						this.superClass = superClass;
						this.body = body;
					}
					return ClassDeclaration;
				}();
				exports$8.ClassExpression = function() {
					function ClassExpression(id, superClass, body) {
						this.type = syntax_1.Syntax.ClassExpression;
						this.id = id;
						this.superClass = superClass;
						this.body = body;
					}
					return ClassExpression;
				}();
				exports$8.ComputedMemberExpression = function() {
					function ComputedMemberExpression(object, property) {
						this.type = syntax_1.Syntax.MemberExpression;
						this.computed = true;
						this.object = object;
						this.property = property;
					}
					return ComputedMemberExpression;
				}();
				exports$8.ConditionalExpression = function() {
					function ConditionalExpression(test, consequent, alternate) {
						this.type = syntax_1.Syntax.ConditionalExpression;
						this.test = test;
						this.consequent = consequent;
						this.alternate = alternate;
					}
					return ConditionalExpression;
				}();
				exports$8.ContinueStatement = function() {
					function ContinueStatement(label) {
						this.type = syntax_1.Syntax.ContinueStatement;
						this.label = label;
					}
					return ContinueStatement;
				}();
				exports$8.DebuggerStatement = function() {
					function DebuggerStatement() {
						this.type = syntax_1.Syntax.DebuggerStatement;
					}
					return DebuggerStatement;
				}();
				exports$8.Directive = function() {
					function Directive(expression, directive) {
						this.type = syntax_1.Syntax.ExpressionStatement;
						this.expression = expression;
						this.directive = directive;
					}
					return Directive;
				}();
				exports$8.DoWhileStatement = function() {
					function DoWhileStatement(body, test) {
						this.type = syntax_1.Syntax.DoWhileStatement;
						this.body = body;
						this.test = test;
					}
					return DoWhileStatement;
				}();
				exports$8.EmptyStatement = function() {
					function EmptyStatement() {
						this.type = syntax_1.Syntax.EmptyStatement;
					}
					return EmptyStatement;
				}();
				exports$8.ExportAllDeclaration = function() {
					function ExportAllDeclaration(source) {
						this.type = syntax_1.Syntax.ExportAllDeclaration;
						this.source = source;
					}
					return ExportAllDeclaration;
				}();
				exports$8.ExportDefaultDeclaration = function() {
					function ExportDefaultDeclaration(declaration) {
						this.type = syntax_1.Syntax.ExportDefaultDeclaration;
						this.declaration = declaration;
					}
					return ExportDefaultDeclaration;
				}();
				exports$8.ExportNamedDeclaration = function() {
					function ExportNamedDeclaration(declaration, specifiers, source) {
						this.type = syntax_1.Syntax.ExportNamedDeclaration;
						this.declaration = declaration;
						this.specifiers = specifiers;
						this.source = source;
					}
					return ExportNamedDeclaration;
				}();
				exports$8.ExportSpecifier = function() {
					function ExportSpecifier(local, exported) {
						this.type = syntax_1.Syntax.ExportSpecifier;
						this.exported = exported;
						this.local = local;
					}
					return ExportSpecifier;
				}();
				exports$8.ExpressionStatement = function() {
					function ExpressionStatement(expression) {
						this.type = syntax_1.Syntax.ExpressionStatement;
						this.expression = expression;
					}
					return ExpressionStatement;
				}();
				exports$8.ForInStatement = function() {
					function ForInStatement(left, right, body) {
						this.type = syntax_1.Syntax.ForInStatement;
						this.left = left;
						this.right = right;
						this.body = body;
						this.each = false;
					}
					return ForInStatement;
				}();
				exports$8.ForOfStatement = function() {
					function ForOfStatement(left, right, body) {
						this.type = syntax_1.Syntax.ForOfStatement;
						this.left = left;
						this.right = right;
						this.body = body;
					}
					return ForOfStatement;
				}();
				exports$8.ForStatement = function() {
					function ForStatement(init, test, update, body) {
						this.type = syntax_1.Syntax.ForStatement;
						this.init = init;
						this.test = test;
						this.update = update;
						this.body = body;
					}
					return ForStatement;
				}();
				exports$8.FunctionDeclaration = function() {
					function FunctionDeclaration(id, params, body, generator) {
						this.type = syntax_1.Syntax.FunctionDeclaration;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = generator;
						this.expression = false;
						this.async = false;
					}
					return FunctionDeclaration;
				}();
				exports$8.FunctionExpression = function() {
					function FunctionExpression(id, params, body, generator) {
						this.type = syntax_1.Syntax.FunctionExpression;
						this.id = id;
						this.params = params;
						this.body = body;
						this.generator = generator;
						this.expression = false;
						this.async = false;
					}
					return FunctionExpression;
				}();
				exports$8.Identifier = function() {
					function Identifier(name) {
						this.type = syntax_1.Syntax.Identifier;
						this.name = name;
					}
					return Identifier;
				}();
				exports$8.IfStatement = function() {
					function IfStatement(test, consequent, alternate) {
						this.type = syntax_1.Syntax.IfStatement;
						this.test = test;
						this.consequent = consequent;
						this.alternate = alternate;
					}
					return IfStatement;
				}();
				exports$8.ImportDeclaration = function() {
					function ImportDeclaration(specifiers, source) {
						this.type = syntax_1.Syntax.ImportDeclaration;
						this.specifiers = specifiers;
						this.source = source;
					}
					return ImportDeclaration;
				}();
				exports$8.ImportDefaultSpecifier = function() {
					function ImportDefaultSpecifier(local) {
						this.type = syntax_1.Syntax.ImportDefaultSpecifier;
						this.local = local;
					}
					return ImportDefaultSpecifier;
				}();
				exports$8.ImportNamespaceSpecifier = function() {
					function ImportNamespaceSpecifier(local) {
						this.type = syntax_1.Syntax.ImportNamespaceSpecifier;
						this.local = local;
					}
					return ImportNamespaceSpecifier;
				}();
				exports$8.ImportSpecifier = function() {
					function ImportSpecifier(local, imported) {
						this.type = syntax_1.Syntax.ImportSpecifier;
						this.local = local;
						this.imported = imported;
					}
					return ImportSpecifier;
				}();
				exports$8.LabeledStatement = function() {
					function LabeledStatement(label, body) {
						this.type = syntax_1.Syntax.LabeledStatement;
						this.label = label;
						this.body = body;
					}
					return LabeledStatement;
				}();
				exports$8.Literal = function() {
					function Literal(value, raw) {
						this.type = syntax_1.Syntax.Literal;
						this.value = value;
						this.raw = raw;
					}
					return Literal;
				}();
				exports$8.MetaProperty = function() {
					function MetaProperty(meta, property) {
						this.type = syntax_1.Syntax.MetaProperty;
						this.meta = meta;
						this.property = property;
					}
					return MetaProperty;
				}();
				exports$8.MethodDefinition = function() {
					function MethodDefinition(key, computed, value, kind, isStatic) {
						this.type = syntax_1.Syntax.MethodDefinition;
						this.key = key;
						this.computed = computed;
						this.value = value;
						this.kind = kind;
						this.static = isStatic;
					}
					return MethodDefinition;
				}();
				exports$8.Module = function() {
					function Module(body) {
						this.type = syntax_1.Syntax.Program;
						this.body = body;
						this.sourceType = "module";
					}
					return Module;
				}();
				exports$8.NewExpression = function() {
					function NewExpression(callee, args) {
						this.type = syntax_1.Syntax.NewExpression;
						this.callee = callee;
						this.arguments = args;
					}
					return NewExpression;
				}();
				exports$8.ObjectExpression = function() {
					function ObjectExpression(properties) {
						this.type = syntax_1.Syntax.ObjectExpression;
						this.properties = properties;
					}
					return ObjectExpression;
				}();
				exports$8.ObjectPattern = function() {
					function ObjectPattern(properties) {
						this.type = syntax_1.Syntax.ObjectPattern;
						this.properties = properties;
					}
					return ObjectPattern;
				}();
				exports$8.Property = function() {
					function Property(kind, key, computed, value, method, shorthand) {
						this.type = syntax_1.Syntax.Property;
						this.key = key;
						this.computed = computed;
						this.value = value;
						this.kind = kind;
						this.method = method;
						this.shorthand = shorthand;
					}
					return Property;
				}();
				exports$8.RegexLiteral = function() {
					function RegexLiteral(value, raw, pattern, flags) {
						this.type = syntax_1.Syntax.Literal;
						this.value = value;
						this.raw = raw;
						this.regex = {
							pattern,
							flags
						};
					}
					return RegexLiteral;
				}();
				exports$8.RestElement = function() {
					function RestElement(argument) {
						this.type = syntax_1.Syntax.RestElement;
						this.argument = argument;
					}
					return RestElement;
				}();
				exports$8.ReturnStatement = function() {
					function ReturnStatement(argument) {
						this.type = syntax_1.Syntax.ReturnStatement;
						this.argument = argument;
					}
					return ReturnStatement;
				}();
				exports$8.Script = function() {
					function Script(body) {
						this.type = syntax_1.Syntax.Program;
						this.body = body;
						this.sourceType = "script";
					}
					return Script;
				}();
				exports$8.SequenceExpression = function() {
					function SequenceExpression(expressions) {
						this.type = syntax_1.Syntax.SequenceExpression;
						this.expressions = expressions;
					}
					return SequenceExpression;
				}();
				exports$8.SpreadElement = function() {
					function SpreadElement(argument) {
						this.type = syntax_1.Syntax.SpreadElement;
						this.argument = argument;
					}
					return SpreadElement;
				}();
				exports$8.StaticMemberExpression = function() {
					function StaticMemberExpression(object, property) {
						this.type = syntax_1.Syntax.MemberExpression;
						this.computed = false;
						this.object = object;
						this.property = property;
					}
					return StaticMemberExpression;
				}();
				exports$8.Super = function() {
					function Super() {
						this.type = syntax_1.Syntax.Super;
					}
					return Super;
				}();
				exports$8.SwitchCase = function() {
					function SwitchCase(test, consequent) {
						this.type = syntax_1.Syntax.SwitchCase;
						this.test = test;
						this.consequent = consequent;
					}
					return SwitchCase;
				}();
				exports$8.SwitchStatement = function() {
					function SwitchStatement(discriminant, cases) {
						this.type = syntax_1.Syntax.SwitchStatement;
						this.discriminant = discriminant;
						this.cases = cases;
					}
					return SwitchStatement;
				}();
				exports$8.TaggedTemplateExpression = function() {
					function TaggedTemplateExpression(tag, quasi) {
						this.type = syntax_1.Syntax.TaggedTemplateExpression;
						this.tag = tag;
						this.quasi = quasi;
					}
					return TaggedTemplateExpression;
				}();
				exports$8.TemplateElement = function() {
					function TemplateElement(value, tail) {
						this.type = syntax_1.Syntax.TemplateElement;
						this.value = value;
						this.tail = tail;
					}
					return TemplateElement;
				}();
				exports$8.TemplateLiteral = function() {
					function TemplateLiteral(quasis, expressions) {
						this.type = syntax_1.Syntax.TemplateLiteral;
						this.quasis = quasis;
						this.expressions = expressions;
					}
					return TemplateLiteral;
				}();
				exports$8.ThisExpression = function() {
					function ThisExpression() {
						this.type = syntax_1.Syntax.ThisExpression;
					}
					return ThisExpression;
				}();
				exports$8.ThrowStatement = function() {
					function ThrowStatement(argument) {
						this.type = syntax_1.Syntax.ThrowStatement;
						this.argument = argument;
					}
					return ThrowStatement;
				}();
				exports$8.TryStatement = function() {
					function TryStatement(block, handler, finalizer) {
						this.type = syntax_1.Syntax.TryStatement;
						this.block = block;
						this.handler = handler;
						this.finalizer = finalizer;
					}
					return TryStatement;
				}();
				exports$8.UnaryExpression = function() {
					function UnaryExpression(operator, argument) {
						this.type = syntax_1.Syntax.UnaryExpression;
						this.operator = operator;
						this.argument = argument;
						this.prefix = true;
					}
					return UnaryExpression;
				}();
				exports$8.UpdateExpression = function() {
					function UpdateExpression(operator, argument, prefix) {
						this.type = syntax_1.Syntax.UpdateExpression;
						this.operator = operator;
						this.argument = argument;
						this.prefix = prefix;
					}
					return UpdateExpression;
				}();
				exports$8.VariableDeclaration = function() {
					function VariableDeclaration(declarations, kind) {
						this.type = syntax_1.Syntax.VariableDeclaration;
						this.declarations = declarations;
						this.kind = kind;
					}
					return VariableDeclaration;
				}();
				exports$8.VariableDeclarator = function() {
					function VariableDeclarator(id, init) {
						this.type = syntax_1.Syntax.VariableDeclarator;
						this.id = id;
						this.init = init;
					}
					return VariableDeclarator;
				}();
				exports$8.WhileStatement = function() {
					function WhileStatement(test, body) {
						this.type = syntax_1.Syntax.WhileStatement;
						this.test = test;
						this.body = body;
					}
					return WhileStatement;
				}();
				exports$8.WithStatement = function() {
					function WithStatement(object, body) {
						this.type = syntax_1.Syntax.WithStatement;
						this.object = object;
						this.body = body;
					}
					return WithStatement;
				}();
				exports$8.YieldExpression = function() {
					function YieldExpression(argument, delegate) {
						this.type = syntax_1.Syntax.YieldExpression;
						this.argument = argument;
						this.delegate = delegate;
					}
					return YieldExpression;
				}();
			},
			function(module$10, exports$9, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$9, "__esModule", { value: true });
				var assert_1 = __webpack_require__(9);
				var error_handler_1 = __webpack_require__(10);
				var messages_1 = __webpack_require__(11);
				var Node = __webpack_require__(7);
				var scanner_1 = __webpack_require__(12);
				var syntax_1 = __webpack_require__(2);
				var token_1 = __webpack_require__(13);
				var ArrowParameterPlaceHolder = "ArrowParameterPlaceHolder";
				exports$9.Parser = function() {
					function Parser(code, options, delegate) {
						if (options === void 0) options = {};
						this.config = {
							range: typeof options.range === "boolean" && options.range,
							loc: typeof options.loc === "boolean" && options.loc,
							source: null,
							tokens: typeof options.tokens === "boolean" && options.tokens,
							comment: typeof options.comment === "boolean" && options.comment,
							tolerant: typeof options.tolerant === "boolean" && options.tolerant
						};
						if (this.config.loc && options.source && options.source !== null) this.config.source = String(options.source);
						this.delegate = delegate;
						this.errorHandler = new error_handler_1.ErrorHandler();
						this.errorHandler.tolerant = this.config.tolerant;
						this.scanner = new scanner_1.Scanner(code, this.errorHandler);
						this.scanner.trackComment = this.config.comment;
						this.operatorPrecedence = {
							")": 0,
							";": 0,
							",": 0,
							"=": 0,
							"]": 0,
							"||": 1,
							"&&": 2,
							"|": 3,
							"^": 4,
							"&": 5,
							"==": 6,
							"!=": 6,
							"===": 6,
							"!==": 6,
							"<": 7,
							">": 7,
							"<=": 7,
							">=": 7,
							"<<": 8,
							">>": 8,
							">>>": 8,
							"+": 9,
							"-": 9,
							"*": 11,
							"/": 11,
							"%": 11
						};
						this.lookahead = {
							type: 2,
							value: "",
							lineNumber: this.scanner.lineNumber,
							lineStart: 0,
							start: 0,
							end: 0
						};
						this.hasLineTerminator = false;
						this.context = {
							isModule: false,
							await: false,
							allowIn: true,
							allowStrictDirective: true,
							allowYield: true,
							firstCoverInitializedNameError: null,
							isAssignmentTarget: false,
							isBindingElement: false,
							inFunctionBody: false,
							inIteration: false,
							inSwitch: false,
							labelSet: {},
							strict: false
						};
						this.tokens = [];
						this.startMarker = {
							index: 0,
							line: this.scanner.lineNumber,
							column: 0
						};
						this.lastMarker = {
							index: 0,
							line: this.scanner.lineNumber,
							column: 0
						};
						this.nextToken();
						this.lastMarker = {
							index: this.scanner.index,
							line: this.scanner.lineNumber,
							column: this.scanner.index - this.scanner.lineStart
						};
					}
					Parser.prototype.throwError = function(messageFormat) {
						var values = [];
						for (var _i = 1; _i < arguments.length; _i++) values[_i - 1] = arguments[_i];
						var args = Array.prototype.slice.call(arguments, 1);
						var msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
							assert_1.assert(idx < args.length, "Message reference must be in range");
							return args[idx];
						});
						var index = this.lastMarker.index;
						var line = this.lastMarker.line;
						var column = this.lastMarker.column + 1;
						throw this.errorHandler.createError(index, line, column, msg);
					};
					Parser.prototype.tolerateError = function(messageFormat) {
						var values = [];
						for (var _i = 1; _i < arguments.length; _i++) values[_i - 1] = arguments[_i];
						var args = Array.prototype.slice.call(arguments, 1);
						var msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
							assert_1.assert(idx < args.length, "Message reference must be in range");
							return args[idx];
						});
						var index = this.lastMarker.index;
						var line = this.scanner.lineNumber;
						var column = this.lastMarker.column + 1;
						this.errorHandler.tolerateError(index, line, column, msg);
					};
					Parser.prototype.unexpectedTokenError = function(token, message) {
						var msg = message || messages_1.Messages.UnexpectedToken;
						var value;
						if (token) {
							if (!message) {
								msg = token.type === 2 ? messages_1.Messages.UnexpectedEOS : token.type === 3 ? messages_1.Messages.UnexpectedIdentifier : token.type === 6 ? messages_1.Messages.UnexpectedNumber : token.type === 8 ? messages_1.Messages.UnexpectedString : token.type === 10 ? messages_1.Messages.UnexpectedTemplate : messages_1.Messages.UnexpectedToken;
								if (token.type === 4) {
									if (this.scanner.isFutureReservedWord(token.value)) msg = messages_1.Messages.UnexpectedReserved;
									else if (this.context.strict && this.scanner.isStrictModeReservedWord(token.value)) msg = messages_1.Messages.StrictReservedWord;
								}
							}
							value = token.value;
						} else value = "ILLEGAL";
						msg = msg.replace("%0", value);
						if (token && typeof token.lineNumber === "number") {
							var index = token.start;
							var line = token.lineNumber;
							var lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column;
							var column = token.start - lastMarkerLineStart + 1;
							return this.errorHandler.createError(index, line, column, msg);
						} else {
							var index = this.lastMarker.index;
							var line = this.lastMarker.line;
							var column = this.lastMarker.column + 1;
							return this.errorHandler.createError(index, line, column, msg);
						}
					};
					Parser.prototype.throwUnexpectedToken = function(token, message) {
						throw this.unexpectedTokenError(token, message);
					};
					Parser.prototype.tolerateUnexpectedToken = function(token, message) {
						this.errorHandler.tolerate(this.unexpectedTokenError(token, message));
					};
					Parser.prototype.collectComments = function() {
						if (!this.config.comment) this.scanner.scanComments();
						else {
							var comments = this.scanner.scanComments();
							if (comments.length > 0 && this.delegate) for (var i = 0; i < comments.length; ++i) {
								var e = comments[i];
								var node = void 0;
								node = {
									type: e.multiLine ? "BlockComment" : "LineComment",
									value: this.scanner.source.slice(e.slice[0], e.slice[1])
								};
								if (this.config.range) node.range = e.range;
								if (this.config.loc) node.loc = e.loc;
								var metadata = {
									start: {
										line: e.loc.start.line,
										column: e.loc.start.column,
										offset: e.range[0]
									},
									end: {
										line: e.loc.end.line,
										column: e.loc.end.column,
										offset: e.range[1]
									}
								};
								this.delegate(node, metadata);
							}
						}
					};
					Parser.prototype.getTokenRaw = function(token) {
						return this.scanner.source.slice(token.start, token.end);
					};
					Parser.prototype.convertToken = function(token) {
						var t = {
							type: token_1.TokenName[token.type],
							value: this.getTokenRaw(token)
						};
						if (this.config.range) t.range = [token.start, token.end];
						if (this.config.loc) t.loc = {
							start: {
								line: this.startMarker.line,
								column: this.startMarker.column
							},
							end: {
								line: this.scanner.lineNumber,
								column: this.scanner.index - this.scanner.lineStart
							}
						};
						if (token.type === 9) t.regex = {
							pattern: token.pattern,
							flags: token.flags
						};
						return t;
					};
					Parser.prototype.nextToken = function() {
						var token = this.lookahead;
						this.lastMarker.index = this.scanner.index;
						this.lastMarker.line = this.scanner.lineNumber;
						this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
						this.collectComments();
						if (this.scanner.index !== this.startMarker.index) {
							this.startMarker.index = this.scanner.index;
							this.startMarker.line = this.scanner.lineNumber;
							this.startMarker.column = this.scanner.index - this.scanner.lineStart;
						}
						var next = this.scanner.lex();
						this.hasLineTerminator = token.lineNumber !== next.lineNumber;
						if (next && this.context.strict && next.type === 3) {
							if (this.scanner.isStrictModeReservedWord(next.value)) next.type = 4;
						}
						this.lookahead = next;
						if (this.config.tokens && next.type !== 2) this.tokens.push(this.convertToken(next));
						return token;
					};
					Parser.prototype.nextRegexToken = function() {
						this.collectComments();
						var token = this.scanner.scanRegExp();
						if (this.config.tokens) {
							this.tokens.pop();
							this.tokens.push(this.convertToken(token));
						}
						this.lookahead = token;
						this.nextToken();
						return token;
					};
					Parser.prototype.createNode = function() {
						return {
							index: this.startMarker.index,
							line: this.startMarker.line,
							column: this.startMarker.column
						};
					};
					Parser.prototype.startNode = function(token, lastLineStart) {
						if (lastLineStart === void 0) lastLineStart = 0;
						var column = token.start - token.lineStart;
						var line = token.lineNumber;
						if (column < 0) {
							column += lastLineStart;
							line--;
						}
						return {
							index: token.start,
							line,
							column
						};
					};
					Parser.prototype.finalize = function(marker, node) {
						if (this.config.range) node.range = [marker.index, this.lastMarker.index];
						if (this.config.loc) {
							node.loc = {
								start: {
									line: marker.line,
									column: marker.column
								},
								end: {
									line: this.lastMarker.line,
									column: this.lastMarker.column
								}
							};
							if (this.config.source) node.loc.source = this.config.source;
						}
						if (this.delegate) {
							var metadata = {
								start: {
									line: marker.line,
									column: marker.column,
									offset: marker.index
								},
								end: {
									line: this.lastMarker.line,
									column: this.lastMarker.column,
									offset: this.lastMarker.index
								}
							};
							this.delegate(node, metadata);
						}
						return node;
					};
					Parser.prototype.expect = function(value) {
						var token = this.nextToken();
						if (token.type !== 7 || token.value !== value) this.throwUnexpectedToken(token);
					};
					Parser.prototype.expectCommaSeparator = function() {
						if (this.config.tolerant) {
							var token = this.lookahead;
							if (token.type === 7 && token.value === ",") this.nextToken();
							else if (token.type === 7 && token.value === ";") {
								this.nextToken();
								this.tolerateUnexpectedToken(token);
							} else this.tolerateUnexpectedToken(token, messages_1.Messages.UnexpectedToken);
						} else this.expect(",");
					};
					Parser.prototype.expectKeyword = function(keyword) {
						var token = this.nextToken();
						if (token.type !== 4 || token.value !== keyword) this.throwUnexpectedToken(token);
					};
					Parser.prototype.match = function(value) {
						return this.lookahead.type === 7 && this.lookahead.value === value;
					};
					Parser.prototype.matchKeyword = function(keyword) {
						return this.lookahead.type === 4 && this.lookahead.value === keyword;
					};
					Parser.prototype.matchContextualKeyword = function(keyword) {
						return this.lookahead.type === 3 && this.lookahead.value === keyword;
					};
					Parser.prototype.matchAssign = function() {
						if (this.lookahead.type !== 7) return false;
						var op = this.lookahead.value;
						return op === "=" || op === "*=" || op === "**=" || op === "/=" || op === "%=" || op === "+=" || op === "-=" || op === "<<=" || op === ">>=" || op === ">>>=" || op === "&=" || op === "^=" || op === "|=";
					};
					Parser.prototype.isolateCoverGrammar = function(parseFunction) {
						var previousIsBindingElement = this.context.isBindingElement;
						var previousIsAssignmentTarget = this.context.isAssignmentTarget;
						var previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
						this.context.isBindingElement = true;
						this.context.isAssignmentTarget = true;
						this.context.firstCoverInitializedNameError = null;
						var result = parseFunction.call(this);
						if (this.context.firstCoverInitializedNameError !== null) this.throwUnexpectedToken(this.context.firstCoverInitializedNameError);
						this.context.isBindingElement = previousIsBindingElement;
						this.context.isAssignmentTarget = previousIsAssignmentTarget;
						this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError;
						return result;
					};
					Parser.prototype.inheritCoverGrammar = function(parseFunction) {
						var previousIsBindingElement = this.context.isBindingElement;
						var previousIsAssignmentTarget = this.context.isAssignmentTarget;
						var previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
						this.context.isBindingElement = true;
						this.context.isAssignmentTarget = true;
						this.context.firstCoverInitializedNameError = null;
						var result = parseFunction.call(this);
						this.context.isBindingElement = this.context.isBindingElement && previousIsBindingElement;
						this.context.isAssignmentTarget = this.context.isAssignmentTarget && previousIsAssignmentTarget;
						this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError || this.context.firstCoverInitializedNameError;
						return result;
					};
					Parser.prototype.consumeSemicolon = function() {
						if (this.match(";")) this.nextToken();
						else if (!this.hasLineTerminator) {
							if (this.lookahead.type !== 2 && !this.match("}")) this.throwUnexpectedToken(this.lookahead);
							this.lastMarker.index = this.startMarker.index;
							this.lastMarker.line = this.startMarker.line;
							this.lastMarker.column = this.startMarker.column;
						}
					};
					Parser.prototype.parsePrimaryExpression = function() {
						var node = this.createNode();
						var expr;
						var token, raw;
						switch (this.lookahead.type) {
							case 3:
								if ((this.context.isModule || this.context.await) && this.lookahead.value === "await") this.tolerateUnexpectedToken(this.lookahead);
								expr = this.matchAsyncFunction() ? this.parseFunctionExpression() : this.finalize(node, new Node.Identifier(this.nextToken().value));
								break;
							case 6:
							case 8:
								if (this.context.strict && this.lookahead.octal) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.StrictOctalLiteral);
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(token.value, raw));
								break;
							case 1:
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(token.value === "true", raw));
								break;
							case 5:
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								token = this.nextToken();
								raw = this.getTokenRaw(token);
								expr = this.finalize(node, new Node.Literal(null, raw));
								break;
							case 10:
								expr = this.parseTemplateLiteral();
								break;
							case 7:
								switch (this.lookahead.value) {
									case "(":
										this.context.isBindingElement = false;
										expr = this.inheritCoverGrammar(this.parseGroupExpression);
										break;
									case "[":
										expr = this.inheritCoverGrammar(this.parseArrayInitializer);
										break;
									case "{":
										expr = this.inheritCoverGrammar(this.parseObjectInitializer);
										break;
									case "/":
									case "/=":
										this.context.isAssignmentTarget = false;
										this.context.isBindingElement = false;
										this.scanner.index = this.startMarker.index;
										token = this.nextRegexToken();
										raw = this.getTokenRaw(token);
										expr = this.finalize(node, new Node.RegexLiteral(token.regex, raw, token.pattern, token.flags));
										break;
									default: expr = this.throwUnexpectedToken(this.nextToken());
								}
								break;
							case 4:
								if (!this.context.strict && this.context.allowYield && this.matchKeyword("yield")) expr = this.parseIdentifierName();
								else if (!this.context.strict && this.matchKeyword("let")) expr = this.finalize(node, new Node.Identifier(this.nextToken().value));
								else {
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
									if (this.matchKeyword("function")) expr = this.parseFunctionExpression();
									else if (this.matchKeyword("this")) {
										this.nextToken();
										expr = this.finalize(node, new Node.ThisExpression());
									} else if (this.matchKeyword("class")) expr = this.parseClassExpression();
									else expr = this.throwUnexpectedToken(this.nextToken());
								}
								break;
							default: expr = this.throwUnexpectedToken(this.nextToken());
						}
						return expr;
					};
					Parser.prototype.parseSpreadElement = function() {
						var node = this.createNode();
						this.expect("...");
						var arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
						return this.finalize(node, new Node.SpreadElement(arg));
					};
					Parser.prototype.parseArrayInitializer = function() {
						var node = this.createNode();
						var elements = [];
						this.expect("[");
						while (!this.match("]")) if (this.match(",")) {
							this.nextToken();
							elements.push(null);
						} else if (this.match("...")) {
							var element = this.parseSpreadElement();
							if (!this.match("]")) {
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								this.expect(",");
							}
							elements.push(element);
						} else {
							elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
							if (!this.match("]")) this.expect(",");
						}
						this.expect("]");
						return this.finalize(node, new Node.ArrayExpression(elements));
					};
					Parser.prototype.parsePropertyMethod = function(params) {
						this.context.isAssignmentTarget = false;
						this.context.isBindingElement = false;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = params.simple;
						var body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
						if (this.context.strict && params.firstRestricted) this.tolerateUnexpectedToken(params.firstRestricted, params.message);
						if (this.context.strict && params.stricted) this.tolerateUnexpectedToken(params.stricted, params.message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						return body;
					};
					Parser.prototype.parsePropertyMethodFunction = function() {
						var isGenerator = false;
						var node = this.createNode();
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = true;
						var params = this.parseFormalParameters();
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
					};
					Parser.prototype.parsePropertyMethodAsyncFunction = function() {
						var node = this.createNode();
						var previousAllowYield = this.context.allowYield;
						var previousAwait = this.context.await;
						this.context.allowYield = false;
						this.context.await = true;
						var params = this.parseFormalParameters();
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						this.context.await = previousAwait;
						return this.finalize(node, new Node.AsyncFunctionExpression(null, params.params, method));
					};
					Parser.prototype.parseObjectPropertyKey = function() {
						var node = this.createNode();
						var token = this.nextToken();
						var key;
						switch (token.type) {
							case 8:
							case 6:
								if (this.context.strict && token.octal) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictOctalLiteral);
								var raw = this.getTokenRaw(token);
								key = this.finalize(node, new Node.Literal(token.value, raw));
								break;
							case 3:
							case 1:
							case 5:
							case 4:
								key = this.finalize(node, new Node.Identifier(token.value));
								break;
							case 7:
								if (token.value === "[") {
									key = this.isolateCoverGrammar(this.parseAssignmentExpression);
									this.expect("]");
								} else key = this.throwUnexpectedToken(token);
								break;
							default: key = this.throwUnexpectedToken(token);
						}
						return key;
					};
					Parser.prototype.isPropertyKey = function(key, value) {
						return key.type === syntax_1.Syntax.Identifier && key.name === value || key.type === syntax_1.Syntax.Literal && key.value === value;
					};
					Parser.prototype.parseObjectProperty = function(hasProto) {
						var node = this.createNode();
						var token = this.lookahead;
						var kind;
						var key = null;
						var value = null;
						var computed = false;
						var method = false;
						var shorthand = false;
						var isAsync = false;
						if (token.type === 3) {
							var id = token.value;
							this.nextToken();
							computed = this.match("[");
							isAsync = !this.hasLineTerminator && id === "async" && !this.match(":") && !this.match("(") && !this.match("*") && !this.match(",");
							key = isAsync ? this.parseObjectPropertyKey() : this.finalize(node, new Node.Identifier(id));
						} else if (this.match("*")) this.nextToken();
						else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
						}
						var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
						if (token.type === 3 && !isAsync && token.value === "get" && lookaheadPropertyKey) {
							kind = "get";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							this.context.allowYield = false;
							value = this.parseGetterMethod();
						} else if (token.type === 3 && !isAsync && token.value === "set" && lookaheadPropertyKey) {
							kind = "set";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseSetterMethod();
						} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
							kind = "init";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseGeneratorMethod();
							method = true;
						} else {
							if (!key) this.throwUnexpectedToken(this.lookahead);
							kind = "init";
							if (this.match(":") && !isAsync) {
								if (!computed && this.isPropertyKey(key, "__proto__")) {
									if (hasProto.value) this.tolerateError(messages_1.Messages.DuplicateProtoProperty);
									hasProto.value = true;
								}
								this.nextToken();
								value = this.inheritCoverGrammar(this.parseAssignmentExpression);
							} else if (this.match("(")) {
								value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction();
								method = true;
							} else if (token.type === 3) {
								var id = this.finalize(node, new Node.Identifier(token.value));
								if (this.match("=")) {
									this.context.firstCoverInitializedNameError = this.lookahead;
									this.nextToken();
									shorthand = true;
									var init = this.isolateCoverGrammar(this.parseAssignmentExpression);
									value = this.finalize(node, new Node.AssignmentPattern(id, init));
								} else {
									shorthand = true;
									value = id;
								}
							} else this.throwUnexpectedToken(this.nextToken());
						}
						return this.finalize(node, new Node.Property(kind, key, computed, value, method, shorthand));
					};
					Parser.prototype.parseObjectInitializer = function() {
						var node = this.createNode();
						this.expect("{");
						var properties = [];
						var hasProto = { value: false };
						while (!this.match("}")) {
							properties.push(this.parseObjectProperty(hasProto));
							if (!this.match("}")) this.expectCommaSeparator();
						}
						this.expect("}");
						return this.finalize(node, new Node.ObjectExpression(properties));
					};
					Parser.prototype.parseTemplateHead = function() {
						assert_1.assert(this.lookahead.head, "Template literal must start with a template head");
						var node = this.createNode();
						var token = this.nextToken();
						var raw = token.value;
						var cooked = token.cooked;
						return this.finalize(node, new Node.TemplateElement({
							raw,
							cooked
						}, token.tail));
					};
					Parser.prototype.parseTemplateElement = function() {
						if (this.lookahead.type !== 10) this.throwUnexpectedToken();
						var node = this.createNode();
						var token = this.nextToken();
						var raw = token.value;
						var cooked = token.cooked;
						return this.finalize(node, new Node.TemplateElement({
							raw,
							cooked
						}, token.tail));
					};
					Parser.prototype.parseTemplateLiteral = function() {
						var node = this.createNode();
						var expressions = [];
						var quasis = [];
						var quasi = this.parseTemplateHead();
						quasis.push(quasi);
						while (!quasi.tail) {
							expressions.push(this.parseExpression());
							quasi = this.parseTemplateElement();
							quasis.push(quasi);
						}
						return this.finalize(node, new Node.TemplateLiteral(quasis, expressions));
					};
					Parser.prototype.reinterpretExpressionAsPattern = function(expr) {
						switch (expr.type) {
							case syntax_1.Syntax.Identifier:
							case syntax_1.Syntax.MemberExpression:
							case syntax_1.Syntax.RestElement:
							case syntax_1.Syntax.AssignmentPattern: break;
							case syntax_1.Syntax.SpreadElement:
								expr.type = syntax_1.Syntax.RestElement;
								this.reinterpretExpressionAsPattern(expr.argument);
								break;
							case syntax_1.Syntax.ArrayExpression:
								expr.type = syntax_1.Syntax.ArrayPattern;
								for (var i = 0; i < expr.elements.length; i++) if (expr.elements[i] !== null) this.reinterpretExpressionAsPattern(expr.elements[i]);
								break;
							case syntax_1.Syntax.ObjectExpression:
								expr.type = syntax_1.Syntax.ObjectPattern;
								for (var i = 0; i < expr.properties.length; i++) this.reinterpretExpressionAsPattern(expr.properties[i].value);
								break;
							case syntax_1.Syntax.AssignmentExpression:
								expr.type = syntax_1.Syntax.AssignmentPattern;
								delete expr.operator;
								this.reinterpretExpressionAsPattern(expr.left);
								break;
							default: break;
						}
					};
					Parser.prototype.parseGroupExpression = function() {
						var expr;
						this.expect("(");
						if (this.match(")")) {
							this.nextToken();
							if (!this.match("=>")) this.expect("=>");
							expr = {
								type: ArrowParameterPlaceHolder,
								params: [],
								async: false
							};
						} else {
							var startToken = this.lookahead;
							var params = [];
							if (this.match("...")) {
								expr = this.parseRestElement(params);
								this.expect(")");
								if (!this.match("=>")) this.expect("=>");
								expr = {
									type: ArrowParameterPlaceHolder,
									params: [expr],
									async: false
								};
							} else {
								var arrow = false;
								this.context.isBindingElement = true;
								expr = this.inheritCoverGrammar(this.parseAssignmentExpression);
								if (this.match(",")) {
									var expressions = [];
									this.context.isAssignmentTarget = false;
									expressions.push(expr);
									while (this.lookahead.type !== 2) {
										if (!this.match(",")) break;
										this.nextToken();
										if (this.match(")")) {
											this.nextToken();
											for (var i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expressions,
												async: false
											};
										} else if (this.match("...")) {
											if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
											expressions.push(this.parseRestElement(params));
											this.expect(")");
											if (!this.match("=>")) this.expect("=>");
											this.context.isBindingElement = false;
											for (var i = 0; i < expressions.length; i++) this.reinterpretExpressionAsPattern(expressions[i]);
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expressions,
												async: false
											};
										} else expressions.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
										if (arrow) break;
									}
									if (!arrow) expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions));
								}
								if (!arrow) {
									this.expect(")");
									if (this.match("=>")) {
										if (expr.type === syntax_1.Syntax.Identifier && expr.name === "yield") {
											arrow = true;
											expr = {
												type: ArrowParameterPlaceHolder,
												params: [expr],
												async: false
											};
										}
										if (!arrow) {
											if (!this.context.isBindingElement) this.throwUnexpectedToken(this.lookahead);
											if (expr.type === syntax_1.Syntax.SequenceExpression) for (var i = 0; i < expr.expressions.length; i++) this.reinterpretExpressionAsPattern(expr.expressions[i]);
											else this.reinterpretExpressionAsPattern(expr);
											expr = {
												type: ArrowParameterPlaceHolder,
												params: expr.type === syntax_1.Syntax.SequenceExpression ? expr.expressions : [expr],
												async: false
											};
										}
									}
									this.context.isBindingElement = false;
								}
							}
						}
						return expr;
					};
					Parser.prototype.parseArguments = function() {
						this.expect("(");
						var args = [];
						if (!this.match(")")) while (true) {
							var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAssignmentExpression);
							args.push(expr);
							if (this.match(")")) break;
							this.expectCommaSeparator();
							if (this.match(")")) break;
						}
						this.expect(")");
						return args;
					};
					Parser.prototype.isIdentifierName = function(token) {
						return token.type === 3 || token.type === 4 || token.type === 1 || token.type === 5;
					};
					Parser.prototype.parseIdentifierName = function() {
						var node = this.createNode();
						var token = this.nextToken();
						if (!this.isIdentifierName(token)) this.throwUnexpectedToken(token);
						return this.finalize(node, new Node.Identifier(token.value));
					};
					Parser.prototype.parseNewExpression = function() {
						var node = this.createNode();
						var id = this.parseIdentifierName();
						assert_1.assert(id.name === "new", "New expression must start with `new`");
						var expr;
						if (this.match(".")) {
							this.nextToken();
							if (this.lookahead.type === 3 && this.context.inFunctionBody && this.lookahead.value === "target") {
								var property = this.parseIdentifierName();
								expr = new Node.MetaProperty(id, property);
							} else this.throwUnexpectedToken(this.lookahead);
						} else {
							var callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression);
							var args = this.match("(") ? this.parseArguments() : [];
							expr = new Node.NewExpression(callee, args);
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						}
						return this.finalize(node, expr);
					};
					Parser.prototype.parseAsyncArgument = function() {
						var arg = this.parseAssignmentExpression();
						this.context.firstCoverInitializedNameError = null;
						return arg;
					};
					Parser.prototype.parseAsyncArguments = function() {
						this.expect("(");
						var args = [];
						if (!this.match(")")) while (true) {
							var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAsyncArgument);
							args.push(expr);
							if (this.match(")")) break;
							this.expectCommaSeparator();
							if (this.match(")")) break;
						}
						this.expect(")");
						return args;
					};
					Parser.prototype.parseLeftHandSideExpressionAllowCall = function() {
						var startToken = this.lookahead;
						var maybeAsync = this.matchContextualKeyword("async");
						var previousAllowIn = this.context.allowIn;
						this.context.allowIn = true;
						var expr;
						if (this.matchKeyword("super") && this.context.inFunctionBody) {
							expr = this.createNode();
							this.nextToken();
							expr = this.finalize(expr, new Node.Super());
							if (!this.match("(") && !this.match(".") && !this.match("[")) this.throwUnexpectedToken(this.lookahead);
						} else expr = this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
						while (true) if (this.match(".")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect(".");
							var property = this.parseIdentifierName();
							expr = this.finalize(this.startNode(startToken), new Node.StaticMemberExpression(expr, property));
						} else if (this.match("(")) {
							var asyncArrow = maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = false;
							var args = asyncArrow ? this.parseAsyncArguments() : this.parseArguments();
							expr = this.finalize(this.startNode(startToken), new Node.CallExpression(expr, args));
							if (asyncArrow && this.match("=>")) {
								for (var i = 0; i < args.length; ++i) this.reinterpretExpressionAsPattern(args[i]);
								expr = {
									type: ArrowParameterPlaceHolder,
									params: args,
									async: true
								};
							}
						} else if (this.match("[")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect("[");
							var property = this.isolateCoverGrammar(this.parseExpression);
							this.expect("]");
							expr = this.finalize(this.startNode(startToken), new Node.ComputedMemberExpression(expr, property));
						} else if (this.lookahead.type === 10 && this.lookahead.head) {
							var quasi = this.parseTemplateLiteral();
							expr = this.finalize(this.startNode(startToken), new Node.TaggedTemplateExpression(expr, quasi));
						} else break;
						this.context.allowIn = previousAllowIn;
						return expr;
					};
					Parser.prototype.parseSuper = function() {
						var node = this.createNode();
						this.expectKeyword("super");
						if (!this.match("[") && !this.match(".")) this.throwUnexpectedToken(this.lookahead);
						return this.finalize(node, new Node.Super());
					};
					Parser.prototype.parseLeftHandSideExpression = function() {
						assert_1.assert(this.context.allowIn, "callee of new expression always allow in keyword.");
						var node = this.startNode(this.lookahead);
						var expr = this.matchKeyword("super") && this.context.inFunctionBody ? this.parseSuper() : this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression);
						while (true) if (this.match("[")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect("[");
							var property = this.isolateCoverGrammar(this.parseExpression);
							this.expect("]");
							expr = this.finalize(node, new Node.ComputedMemberExpression(expr, property));
						} else if (this.match(".")) {
							this.context.isBindingElement = false;
							this.context.isAssignmentTarget = true;
							this.expect(".");
							var property = this.parseIdentifierName();
							expr = this.finalize(node, new Node.StaticMemberExpression(expr, property));
						} else if (this.lookahead.type === 10 && this.lookahead.head) {
							var quasi = this.parseTemplateLiteral();
							expr = this.finalize(node, new Node.TaggedTemplateExpression(expr, quasi));
						} else break;
						return expr;
					};
					Parser.prototype.parseUpdateExpression = function() {
						var expr;
						var startToken = this.lookahead;
						if (this.match("++") || this.match("--")) {
							var node = this.startNode(startToken);
							var token = this.nextToken();
							expr = this.inheritCoverGrammar(this.parseUnaryExpression);
							if (this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(messages_1.Messages.StrictLHSPrefix);
							if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
							var prefix = true;
							expr = this.finalize(node, new Node.UpdateExpression(token.value, expr, prefix));
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						} else {
							expr = this.inheritCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
							if (!this.hasLineTerminator && this.lookahead.type === 7) {
								if (this.match("++") || this.match("--")) {
									if (this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name)) this.tolerateError(messages_1.Messages.StrictLHSPostfix);
									if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
									var operator = this.nextToken().value;
									var prefix = false;
									expr = this.finalize(this.startNode(startToken), new Node.UpdateExpression(operator, expr, prefix));
								}
							}
						}
						return expr;
					};
					Parser.prototype.parseAwaitExpression = function() {
						var node = this.createNode();
						this.nextToken();
						var argument = this.parseUnaryExpression();
						return this.finalize(node, new Node.AwaitExpression(argument));
					};
					Parser.prototype.parseUnaryExpression = function() {
						var expr;
						if (this.match("+") || this.match("-") || this.match("~") || this.match("!") || this.matchKeyword("delete") || this.matchKeyword("void") || this.matchKeyword("typeof")) {
							var node = this.startNode(this.lookahead);
							var token = this.nextToken();
							expr = this.inheritCoverGrammar(this.parseUnaryExpression);
							expr = this.finalize(node, new Node.UnaryExpression(token.value, expr));
							if (this.context.strict && expr.operator === "delete" && expr.argument.type === syntax_1.Syntax.Identifier) this.tolerateError(messages_1.Messages.StrictDelete);
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						} else if (this.context.await && this.matchContextualKeyword("await")) expr = this.parseAwaitExpression();
						else expr = this.parseUpdateExpression();
						return expr;
					};
					Parser.prototype.parseExponentiationExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseUnaryExpression);
						if (expr.type !== syntax_1.Syntax.UnaryExpression && this.match("**")) {
							this.nextToken();
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
							var left = expr;
							var right = this.isolateCoverGrammar(this.parseExponentiationExpression);
							expr = this.finalize(this.startNode(startToken), new Node.BinaryExpression("**", left, right));
						}
						return expr;
					};
					Parser.prototype.binaryPrecedence = function(token) {
						var op = token.value;
						var precedence;
						if (token.type === 7) precedence = this.operatorPrecedence[op] || 0;
						else if (token.type === 4) precedence = op === "instanceof" || this.context.allowIn && op === "in" ? 7 : 0;
						else precedence = 0;
						return precedence;
					};
					Parser.prototype.parseBinaryExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseExponentiationExpression);
						var token = this.lookahead;
						var prec = this.binaryPrecedence(token);
						if (prec > 0) {
							this.nextToken();
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
							var markers = [startToken, this.lookahead];
							var left = expr;
							var right = this.isolateCoverGrammar(this.parseExponentiationExpression);
							var stack = [
								left,
								token.value,
								right
							];
							var precedences = [prec];
							while (true) {
								prec = this.binaryPrecedence(this.lookahead);
								if (prec <= 0) break;
								while (stack.length > 2 && prec <= precedences[precedences.length - 1]) {
									right = stack.pop();
									var operator = stack.pop();
									precedences.pop();
									left = stack.pop();
									markers.pop();
									var node = this.startNode(markers[markers.length - 1]);
									stack.push(this.finalize(node, new Node.BinaryExpression(operator, left, right)));
								}
								stack.push(this.nextToken().value);
								precedences.push(prec);
								markers.push(this.lookahead);
								stack.push(this.isolateCoverGrammar(this.parseExponentiationExpression));
							}
							var i = stack.length - 1;
							expr = stack[i];
							var lastMarker = markers.pop();
							while (i > 1) {
								var marker = markers.pop();
								var lastLineStart = lastMarker && lastMarker.lineStart;
								var node = this.startNode(marker, lastLineStart);
								var operator = stack[i - 1];
								expr = this.finalize(node, new Node.BinaryExpression(operator, stack[i - 2], expr));
								i -= 2;
								lastMarker = marker;
							}
						}
						return expr;
					};
					Parser.prototype.parseConditionalExpression = function() {
						var startToken = this.lookahead;
						var expr = this.inheritCoverGrammar(this.parseBinaryExpression);
						if (this.match("?")) {
							this.nextToken();
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = true;
							var consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
							this.context.allowIn = previousAllowIn;
							this.expect(":");
							var alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
							expr = this.finalize(this.startNode(startToken), new Node.ConditionalExpression(expr, consequent, alternate));
							this.context.isAssignmentTarget = false;
							this.context.isBindingElement = false;
						}
						return expr;
					};
					Parser.prototype.checkPatternParam = function(options, param) {
						switch (param.type) {
							case syntax_1.Syntax.Identifier:
								this.validateParam(options, param, param.name);
								break;
							case syntax_1.Syntax.RestElement:
								this.checkPatternParam(options, param.argument);
								break;
							case syntax_1.Syntax.AssignmentPattern:
								this.checkPatternParam(options, param.left);
								break;
							case syntax_1.Syntax.ArrayPattern:
								for (var i = 0; i < param.elements.length; i++) if (param.elements[i] !== null) this.checkPatternParam(options, param.elements[i]);
								break;
							case syntax_1.Syntax.ObjectPattern:
								for (var i = 0; i < param.properties.length; i++) this.checkPatternParam(options, param.properties[i].value);
								break;
							default: break;
						}
						options.simple = options.simple && param instanceof Node.Identifier;
					};
					Parser.prototype.reinterpretAsCoverFormalsList = function(expr) {
						var params = [expr];
						var options;
						var asyncArrow = false;
						switch (expr.type) {
							case syntax_1.Syntax.Identifier: break;
							case ArrowParameterPlaceHolder:
								params = expr.params;
								asyncArrow = expr.async;
								break;
							default: return null;
						}
						options = {
							simple: true,
							paramSet: {}
						};
						for (var i = 0; i < params.length; ++i) {
							var param = params[i];
							if (param.type === syntax_1.Syntax.AssignmentPattern) {
								if (param.right.type === syntax_1.Syntax.YieldExpression) {
									if (param.right.argument) this.throwUnexpectedToken(this.lookahead);
									param.right.type = syntax_1.Syntax.Identifier;
									param.right.name = "yield";
									delete param.right.argument;
									delete param.right.delegate;
								}
							} else if (asyncArrow && param.type === syntax_1.Syntax.Identifier && param.name === "await") this.throwUnexpectedToken(this.lookahead);
							this.checkPatternParam(options, param);
							params[i] = param;
						}
						if (this.context.strict || !this.context.allowYield) for (var i = 0; i < params.length; ++i) {
							var param = params[i];
							if (param.type === syntax_1.Syntax.YieldExpression) this.throwUnexpectedToken(this.lookahead);
						}
						if (options.message === messages_1.Messages.StrictParamDupe) {
							var token = this.context.strict ? options.stricted : options.firstRestricted;
							this.throwUnexpectedToken(token, options.message);
						}
						return {
							simple: options.simple,
							params,
							stricted: options.stricted,
							firstRestricted: options.firstRestricted,
							message: options.message
						};
					};
					Parser.prototype.parseAssignmentExpression = function() {
						var expr;
						if (!this.context.allowYield && this.matchKeyword("yield")) expr = this.parseYieldExpression();
						else {
							var startToken = this.lookahead;
							var token = startToken;
							expr = this.parseConditionalExpression();
							if (token.type === 3 && token.lineNumber === this.lookahead.lineNumber && token.value === "async") {
								if (this.lookahead.type === 3 || this.matchKeyword("yield")) {
									var arg = this.parsePrimaryExpression();
									this.reinterpretExpressionAsPattern(arg);
									expr = {
										type: ArrowParameterPlaceHolder,
										params: [arg],
										async: true
									};
								}
							}
							if (expr.type === ArrowParameterPlaceHolder || this.match("=>")) {
								this.context.isAssignmentTarget = false;
								this.context.isBindingElement = false;
								var isAsync = expr.async;
								var list = this.reinterpretAsCoverFormalsList(expr);
								if (list) {
									if (this.hasLineTerminator) this.tolerateUnexpectedToken(this.lookahead);
									this.context.firstCoverInitializedNameError = null;
									var previousStrict = this.context.strict;
									var previousAllowStrictDirective = this.context.allowStrictDirective;
									this.context.allowStrictDirective = list.simple;
									var previousAllowYield = this.context.allowYield;
									var previousAwait = this.context.await;
									this.context.allowYield = true;
									this.context.await = isAsync;
									var node = this.startNode(startToken);
									this.expect("=>");
									var body = void 0;
									if (this.match("{")) {
										var previousAllowIn = this.context.allowIn;
										this.context.allowIn = true;
										body = this.parseFunctionSourceElements();
										this.context.allowIn = previousAllowIn;
									} else body = this.isolateCoverGrammar(this.parseAssignmentExpression);
									var expression = body.type !== syntax_1.Syntax.BlockStatement;
									if (this.context.strict && list.firstRestricted) this.throwUnexpectedToken(list.firstRestricted, list.message);
									if (this.context.strict && list.stricted) this.tolerateUnexpectedToken(list.stricted, list.message);
									expr = isAsync ? this.finalize(node, new Node.AsyncArrowFunctionExpression(list.params, body, expression)) : this.finalize(node, new Node.ArrowFunctionExpression(list.params, body, expression));
									this.context.strict = previousStrict;
									this.context.allowStrictDirective = previousAllowStrictDirective;
									this.context.allowYield = previousAllowYield;
									this.context.await = previousAwait;
								}
							} else if (this.matchAssign()) {
								if (!this.context.isAssignmentTarget) this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
								if (this.context.strict && expr.type === syntax_1.Syntax.Identifier) {
									var id = expr;
									if (this.scanner.isRestrictedWord(id.name)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictLHSAssignment);
									if (this.scanner.isStrictModeReservedWord(id.name)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
								}
								if (!this.match("=")) {
									this.context.isAssignmentTarget = false;
									this.context.isBindingElement = false;
								} else this.reinterpretExpressionAsPattern(expr);
								token = this.nextToken();
								var operator = token.value;
								var right = this.isolateCoverGrammar(this.parseAssignmentExpression);
								expr = this.finalize(this.startNode(startToken), new Node.AssignmentExpression(operator, expr, right));
								this.context.firstCoverInitializedNameError = null;
							}
						}
						return expr;
					};
					Parser.prototype.parseExpression = function() {
						var startToken = this.lookahead;
						var expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
						if (this.match(",")) {
							var expressions = [];
							expressions.push(expr);
							while (this.lookahead.type !== 2) {
								if (!this.match(",")) break;
								this.nextToken();
								expressions.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
							}
							expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions));
						}
						return expr;
					};
					Parser.prototype.parseStatementListItem = function() {
						var statement;
						this.context.isAssignmentTarget = true;
						this.context.isBindingElement = true;
						if (this.lookahead.type === 4) switch (this.lookahead.value) {
							case "export":
								if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalExportDeclaration);
								statement = this.parseExportDeclaration();
								break;
							case "import":
								if (!this.context.isModule) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalImportDeclaration);
								statement = this.parseImportDeclaration();
								break;
							case "const":
								statement = this.parseLexicalDeclaration({ inFor: false });
								break;
							case "function":
								statement = this.parseFunctionDeclaration();
								break;
							case "class":
								statement = this.parseClassDeclaration();
								break;
							case "let":
								statement = this.isLexicalDeclaration() ? this.parseLexicalDeclaration({ inFor: false }) : this.parseStatement();
								break;
							default:
								statement = this.parseStatement();
								break;
						}
						else statement = this.parseStatement();
						return statement;
					};
					Parser.prototype.parseBlock = function() {
						var node = this.createNode();
						this.expect("{");
						var block = [];
						while (true) {
							if (this.match("}")) break;
							block.push(this.parseStatementListItem());
						}
						this.expect("}");
						return this.finalize(node, new Node.BlockStatement(block));
					};
					Parser.prototype.parseLexicalBinding = function(kind, options) {
						var node = this.createNode();
						var id = this.parsePattern([], kind);
						if (this.context.strict && id.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(messages_1.Messages.StrictVarName);
						}
						var init = null;
						if (kind === "const") {
							if (!this.matchKeyword("in") && !this.matchContextualKeyword("of")) if (this.match("=")) {
								this.nextToken();
								init = this.isolateCoverGrammar(this.parseAssignmentExpression);
							} else this.throwError(messages_1.Messages.DeclarationMissingInitializer, "const");
						} else if (!options.inFor && id.type !== syntax_1.Syntax.Identifier || this.match("=")) {
							this.expect("=");
							init = this.isolateCoverGrammar(this.parseAssignmentExpression);
						}
						return this.finalize(node, new Node.VariableDeclarator(id, init));
					};
					Parser.prototype.parseBindingList = function(kind, options) {
						var list = [this.parseLexicalBinding(kind, options)];
						while (this.match(",")) {
							this.nextToken();
							list.push(this.parseLexicalBinding(kind, options));
						}
						return list;
					};
					Parser.prototype.isLexicalDeclaration = function() {
						var state = this.scanner.saveState();
						this.scanner.scanComments();
						var next = this.scanner.lex();
						this.scanner.restoreState(state);
						return next.type === 3 || next.type === 7 && next.value === "[" || next.type === 7 && next.value === "{" || next.type === 4 && next.value === "let" || next.type === 4 && next.value === "yield";
					};
					Parser.prototype.parseLexicalDeclaration = function(options) {
						var node = this.createNode();
						var kind = this.nextToken().value;
						assert_1.assert(kind === "let" || kind === "const", "Lexical declaration must be either let or const");
						var declarations = this.parseBindingList(kind, options);
						this.consumeSemicolon();
						return this.finalize(node, new Node.VariableDeclaration(declarations, kind));
					};
					Parser.prototype.parseBindingRestElement = function(params, kind) {
						var node = this.createNode();
						this.expect("...");
						var arg = this.parsePattern(params, kind);
						return this.finalize(node, new Node.RestElement(arg));
					};
					Parser.prototype.parseArrayPattern = function(params, kind) {
						var node = this.createNode();
						this.expect("[");
						var elements = [];
						while (!this.match("]")) if (this.match(",")) {
							this.nextToken();
							elements.push(null);
						} else {
							if (this.match("...")) {
								elements.push(this.parseBindingRestElement(params, kind));
								break;
							} else elements.push(this.parsePatternWithDefault(params, kind));
							if (!this.match("]")) this.expect(",");
						}
						this.expect("]");
						return this.finalize(node, new Node.ArrayPattern(elements));
					};
					Parser.prototype.parsePropertyPattern = function(params, kind) {
						var node = this.createNode();
						var computed = false;
						var shorthand = false;
						var method = false;
						var key;
						var value;
						if (this.lookahead.type === 3) {
							var keyToken = this.lookahead;
							key = this.parseVariableIdentifier();
							var init = this.finalize(node, new Node.Identifier(keyToken.value));
							if (this.match("=")) {
								params.push(keyToken);
								shorthand = true;
								this.nextToken();
								var expr = this.parseAssignmentExpression();
								value = this.finalize(this.startNode(keyToken), new Node.AssignmentPattern(init, expr));
							} else if (!this.match(":")) {
								params.push(keyToken);
								shorthand = true;
								value = init;
							} else {
								this.expect(":");
								value = this.parsePatternWithDefault(params, kind);
							}
						} else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							this.expect(":");
							value = this.parsePatternWithDefault(params, kind);
						}
						return this.finalize(node, new Node.Property("init", key, computed, value, method, shorthand));
					};
					Parser.prototype.parseObjectPattern = function(params, kind) {
						var node = this.createNode();
						var properties = [];
						this.expect("{");
						while (!this.match("}")) {
							properties.push(this.parsePropertyPattern(params, kind));
							if (!this.match("}")) this.expect(",");
						}
						this.expect("}");
						return this.finalize(node, new Node.ObjectPattern(properties));
					};
					Parser.prototype.parsePattern = function(params, kind) {
						var pattern;
						if (this.match("[")) pattern = this.parseArrayPattern(params, kind);
						else if (this.match("{")) pattern = this.parseObjectPattern(params, kind);
						else {
							if (this.matchKeyword("let") && (kind === "const" || kind === "let")) this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.LetInLexicalBinding);
							params.push(this.lookahead);
							pattern = this.parseVariableIdentifier(kind);
						}
						return pattern;
					};
					Parser.prototype.parsePatternWithDefault = function(params, kind) {
						var startToken = this.lookahead;
						var pattern = this.parsePattern(params, kind);
						if (this.match("=")) {
							this.nextToken();
							var previousAllowYield = this.context.allowYield;
							this.context.allowYield = true;
							var right = this.isolateCoverGrammar(this.parseAssignmentExpression);
							this.context.allowYield = previousAllowYield;
							pattern = this.finalize(this.startNode(startToken), new Node.AssignmentPattern(pattern, right));
						}
						return pattern;
					};
					Parser.prototype.parseVariableIdentifier = function(kind) {
						var node = this.createNode();
						var token = this.nextToken();
						if (token.type === 4 && token.value === "yield") {
							if (this.context.strict) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
							else if (!this.context.allowYield) this.throwUnexpectedToken(token);
						} else if (token.type !== 3) {
							if (this.context.strict && token.type === 4 && this.scanner.isStrictModeReservedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
							else if (this.context.strict || token.value !== "let" || kind !== "var") this.throwUnexpectedToken(token);
						} else if ((this.context.isModule || this.context.await) && token.type === 3 && token.value === "await") this.tolerateUnexpectedToken(token);
						return this.finalize(node, new Node.Identifier(token.value));
					};
					Parser.prototype.parseVariableDeclaration = function(options) {
						var node = this.createNode();
						var id = this.parsePattern([], "var");
						if (this.context.strict && id.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(id.name)) this.tolerateError(messages_1.Messages.StrictVarName);
						}
						var init = null;
						if (this.match("=")) {
							this.nextToken();
							init = this.isolateCoverGrammar(this.parseAssignmentExpression);
						} else if (id.type !== syntax_1.Syntax.Identifier && !options.inFor) this.expect("=");
						return this.finalize(node, new Node.VariableDeclarator(id, init));
					};
					Parser.prototype.parseVariableDeclarationList = function(options) {
						var opt = { inFor: options.inFor };
						var list = [];
						list.push(this.parseVariableDeclaration(opt));
						while (this.match(",")) {
							this.nextToken();
							list.push(this.parseVariableDeclaration(opt));
						}
						return list;
					};
					Parser.prototype.parseVariableStatement = function() {
						var node = this.createNode();
						this.expectKeyword("var");
						var declarations = this.parseVariableDeclarationList({ inFor: false });
						this.consumeSemicolon();
						return this.finalize(node, new Node.VariableDeclaration(declarations, "var"));
					};
					Parser.prototype.parseEmptyStatement = function() {
						var node = this.createNode();
						this.expect(";");
						return this.finalize(node, new Node.EmptyStatement());
					};
					Parser.prototype.parseExpressionStatement = function() {
						var node = this.createNode();
						var expr = this.parseExpression();
						this.consumeSemicolon();
						return this.finalize(node, new Node.ExpressionStatement(expr));
					};
					Parser.prototype.parseIfClause = function() {
						if (this.context.strict && this.matchKeyword("function")) this.tolerateError(messages_1.Messages.StrictFunction);
						return this.parseStatement();
					};
					Parser.prototype.parseIfStatement = function() {
						var node = this.createNode();
						var consequent;
						var alternate = null;
						this.expectKeyword("if");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							consequent = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							consequent = this.parseIfClause();
							if (this.matchKeyword("else")) {
								this.nextToken();
								alternate = this.parseIfClause();
							}
						}
						return this.finalize(node, new Node.IfStatement(test, consequent, alternate));
					};
					Parser.prototype.parseDoWhileStatement = function() {
						var node = this.createNode();
						this.expectKeyword("do");
						var previousInIteration = this.context.inIteration;
						this.context.inIteration = true;
						var body = this.parseStatement();
						this.context.inIteration = previousInIteration;
						this.expectKeyword("while");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) this.tolerateUnexpectedToken(this.nextToken());
						else {
							this.expect(")");
							if (this.match(";")) this.nextToken();
						}
						return this.finalize(node, new Node.DoWhileStatement(body, test));
					};
					Parser.prototype.parseWhileStatement = function() {
						var node = this.createNode();
						var body;
						this.expectKeyword("while");
						this.expect("(");
						var test = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							var previousInIteration = this.context.inIteration;
							this.context.inIteration = true;
							body = this.parseStatement();
							this.context.inIteration = previousInIteration;
						}
						return this.finalize(node, new Node.WhileStatement(test, body));
					};
					Parser.prototype.parseForStatement = function() {
						var init = null;
						var test = null;
						var update = null;
						var forIn = true;
						var left, right;
						var node = this.createNode();
						this.expectKeyword("for");
						this.expect("(");
						if (this.match(";")) this.nextToken();
						else if (this.matchKeyword("var")) {
							init = this.createNode();
							this.nextToken();
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = false;
							var declarations = this.parseVariableDeclarationList({ inFor: true });
							this.context.allowIn = previousAllowIn;
							if (declarations.length === 1 && this.matchKeyword("in")) {
								var decl = declarations[0];
								if (decl.init && (decl.id.type === syntax_1.Syntax.ArrayPattern || decl.id.type === syntax_1.Syntax.ObjectPattern || this.context.strict)) this.tolerateError(messages_1.Messages.ForInOfLoopInitializer, "for-in");
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.nextToken();
								left = init;
								right = this.parseExpression();
								init = null;
							} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.nextToken();
								left = init;
								right = this.parseAssignmentExpression();
								init = null;
								forIn = false;
							} else {
								init = this.finalize(init, new Node.VariableDeclaration(declarations, "var"));
								this.expect(";");
							}
						} else if (this.matchKeyword("const") || this.matchKeyword("let")) {
							init = this.createNode();
							var kind = this.nextToken().value;
							if (!this.context.strict && this.lookahead.value === "in") {
								init = this.finalize(init, new Node.Identifier(kind));
								this.nextToken();
								left = init;
								right = this.parseExpression();
								init = null;
							} else {
								var previousAllowIn = this.context.allowIn;
								this.context.allowIn = false;
								var declarations = this.parseBindingList(kind, { inFor: true });
								this.context.allowIn = previousAllowIn;
								if (declarations.length === 1 && declarations[0].init === null && this.matchKeyword("in")) {
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
									this.nextToken();
									left = init;
									right = this.parseExpression();
									init = null;
								} else if (declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of")) {
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
									this.nextToken();
									left = init;
									right = this.parseAssignmentExpression();
									init = null;
									forIn = false;
								} else {
									this.consumeSemicolon();
									init = this.finalize(init, new Node.VariableDeclaration(declarations, kind));
								}
							}
						} else {
							var initStartToken = this.lookahead;
							var previousAllowIn = this.context.allowIn;
							this.context.allowIn = false;
							init = this.inheritCoverGrammar(this.parseAssignmentExpression);
							this.context.allowIn = previousAllowIn;
							if (this.matchKeyword("in")) {
								if (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) this.tolerateError(messages_1.Messages.InvalidLHSInForIn);
								this.nextToken();
								this.reinterpretExpressionAsPattern(init);
								left = init;
								right = this.parseExpression();
								init = null;
							} else if (this.matchContextualKeyword("of")) {
								if (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) this.tolerateError(messages_1.Messages.InvalidLHSInForLoop);
								this.nextToken();
								this.reinterpretExpressionAsPattern(init);
								left = init;
								right = this.parseAssignmentExpression();
								init = null;
								forIn = false;
							} else {
								if (this.match(",")) {
									var initSeq = [init];
									while (this.match(",")) {
										this.nextToken();
										initSeq.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
									}
									init = this.finalize(this.startNode(initStartToken), new Node.SequenceExpression(initSeq));
								}
								this.expect(";");
							}
						}
						if (typeof left === "undefined") {
							if (!this.match(";")) test = this.parseExpression();
							this.expect(";");
							if (!this.match(")")) update = this.parseExpression();
						}
						var body;
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							var previousInIteration = this.context.inIteration;
							this.context.inIteration = true;
							body = this.isolateCoverGrammar(this.parseStatement);
							this.context.inIteration = previousInIteration;
						}
						return typeof left === "undefined" ? this.finalize(node, new Node.ForStatement(init, test, update, body)) : forIn ? this.finalize(node, new Node.ForInStatement(left, right, body)) : this.finalize(node, new Node.ForOfStatement(left, right, body));
					};
					Parser.prototype.parseContinueStatement = function() {
						var node = this.createNode();
						this.expectKeyword("continue");
						var label = null;
						if (this.lookahead.type === 3 && !this.hasLineTerminator) {
							var id = this.parseVariableIdentifier();
							label = id;
							var key = "$" + id.name;
							if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.UnknownLabel, id.name);
						}
						this.consumeSemicolon();
						if (label === null && !this.context.inIteration) this.throwError(messages_1.Messages.IllegalContinue);
						return this.finalize(node, new Node.ContinueStatement(label));
					};
					Parser.prototype.parseBreakStatement = function() {
						var node = this.createNode();
						this.expectKeyword("break");
						var label = null;
						if (this.lookahead.type === 3 && !this.hasLineTerminator) {
							var id = this.parseVariableIdentifier();
							var key = "$" + id.name;
							if (!Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.UnknownLabel, id.name);
							label = id;
						}
						this.consumeSemicolon();
						if (label === null && !this.context.inIteration && !this.context.inSwitch) this.throwError(messages_1.Messages.IllegalBreak);
						return this.finalize(node, new Node.BreakStatement(label));
					};
					Parser.prototype.parseReturnStatement = function() {
						if (!this.context.inFunctionBody) this.tolerateError(messages_1.Messages.IllegalReturn);
						var node = this.createNode();
						this.expectKeyword("return");
						var argument = !this.match(";") && !this.match("}") && !this.hasLineTerminator && this.lookahead.type !== 2 || this.lookahead.type === 8 || this.lookahead.type === 10 ? this.parseExpression() : null;
						this.consumeSemicolon();
						return this.finalize(node, new Node.ReturnStatement(argument));
					};
					Parser.prototype.parseWithStatement = function() {
						if (this.context.strict) this.tolerateError(messages_1.Messages.StrictModeWith);
						var node = this.createNode();
						var body;
						this.expectKeyword("with");
						this.expect("(");
						var object = this.parseExpression();
						if (!this.match(")") && this.config.tolerant) {
							this.tolerateUnexpectedToken(this.nextToken());
							body = this.finalize(this.createNode(), new Node.EmptyStatement());
						} else {
							this.expect(")");
							body = this.parseStatement();
						}
						return this.finalize(node, new Node.WithStatement(object, body));
					};
					Parser.prototype.parseSwitchCase = function() {
						var node = this.createNode();
						var test;
						if (this.matchKeyword("default")) {
							this.nextToken();
							test = null;
						} else {
							this.expectKeyword("case");
							test = this.parseExpression();
						}
						this.expect(":");
						var consequent = [];
						while (true) {
							if (this.match("}") || this.matchKeyword("default") || this.matchKeyword("case")) break;
							consequent.push(this.parseStatementListItem());
						}
						return this.finalize(node, new Node.SwitchCase(test, consequent));
					};
					Parser.prototype.parseSwitchStatement = function() {
						var node = this.createNode();
						this.expectKeyword("switch");
						this.expect("(");
						var discriminant = this.parseExpression();
						this.expect(")");
						var previousInSwitch = this.context.inSwitch;
						this.context.inSwitch = true;
						var cases = [];
						var defaultFound = false;
						this.expect("{");
						while (true) {
							if (this.match("}")) break;
							var clause = this.parseSwitchCase();
							if (clause.test === null) {
								if (defaultFound) this.throwError(messages_1.Messages.MultipleDefaultsInSwitch);
								defaultFound = true;
							}
							cases.push(clause);
						}
						this.expect("}");
						this.context.inSwitch = previousInSwitch;
						return this.finalize(node, new Node.SwitchStatement(discriminant, cases));
					};
					Parser.prototype.parseLabelledStatement = function() {
						var node = this.createNode();
						var expr = this.parseExpression();
						var statement;
						if (expr.type === syntax_1.Syntax.Identifier && this.match(":")) {
							this.nextToken();
							var id = expr;
							var key = "$" + id.name;
							if (Object.prototype.hasOwnProperty.call(this.context.labelSet, key)) this.throwError(messages_1.Messages.Redeclaration, "Label", id.name);
							this.context.labelSet[key] = true;
							var body = void 0;
							if (this.matchKeyword("class")) {
								this.tolerateUnexpectedToken(this.lookahead);
								body = this.parseClassDeclaration();
							} else if (this.matchKeyword("function")) {
								var token = this.lookahead;
								var declaration = this.parseFunctionDeclaration();
								if (this.context.strict) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunction);
								else if (declaration.generator) this.tolerateUnexpectedToken(token, messages_1.Messages.GeneratorInLegacyContext);
								body = declaration;
							} else body = this.parseStatement();
							delete this.context.labelSet[key];
							statement = new Node.LabeledStatement(id, body);
						} else {
							this.consumeSemicolon();
							statement = new Node.ExpressionStatement(expr);
						}
						return this.finalize(node, statement);
					};
					Parser.prototype.parseThrowStatement = function() {
						var node = this.createNode();
						this.expectKeyword("throw");
						if (this.hasLineTerminator) this.throwError(messages_1.Messages.NewlineAfterThrow);
						var argument = this.parseExpression();
						this.consumeSemicolon();
						return this.finalize(node, new Node.ThrowStatement(argument));
					};
					Parser.prototype.parseCatchClause = function() {
						var node = this.createNode();
						this.expectKeyword("catch");
						this.expect("(");
						if (this.match(")")) this.throwUnexpectedToken(this.lookahead);
						var params = [];
						var param = this.parsePattern(params);
						var paramMap = {};
						for (var i = 0; i < params.length; i++) {
							var key = "$" + params[i].value;
							if (Object.prototype.hasOwnProperty.call(paramMap, key)) this.tolerateError(messages_1.Messages.DuplicateBinding, params[i].value);
							paramMap[key] = true;
						}
						if (this.context.strict && param.type === syntax_1.Syntax.Identifier) {
							if (this.scanner.isRestrictedWord(param.name)) this.tolerateError(messages_1.Messages.StrictCatchVariable);
						}
						this.expect(")");
						var body = this.parseBlock();
						return this.finalize(node, new Node.CatchClause(param, body));
					};
					Parser.prototype.parseFinallyClause = function() {
						this.expectKeyword("finally");
						return this.parseBlock();
					};
					Parser.prototype.parseTryStatement = function() {
						var node = this.createNode();
						this.expectKeyword("try");
						var block = this.parseBlock();
						var handler = this.matchKeyword("catch") ? this.parseCatchClause() : null;
						var finalizer = this.matchKeyword("finally") ? this.parseFinallyClause() : null;
						if (!handler && !finalizer) this.throwError(messages_1.Messages.NoCatchOrFinally);
						return this.finalize(node, new Node.TryStatement(block, handler, finalizer));
					};
					Parser.prototype.parseDebuggerStatement = function() {
						var node = this.createNode();
						this.expectKeyword("debugger");
						this.consumeSemicolon();
						return this.finalize(node, new Node.DebuggerStatement());
					};
					Parser.prototype.parseStatement = function() {
						var statement;
						switch (this.lookahead.type) {
							case 1:
							case 5:
							case 6:
							case 8:
							case 10:
							case 9:
								statement = this.parseExpressionStatement();
								break;
							case 7:
								var value = this.lookahead.value;
								if (value === "{") statement = this.parseBlock();
								else if (value === "(") statement = this.parseExpressionStatement();
								else if (value === ";") statement = this.parseEmptyStatement();
								else statement = this.parseExpressionStatement();
								break;
							case 3:
								statement = this.matchAsyncFunction() ? this.parseFunctionDeclaration() : this.parseLabelledStatement();
								break;
							case 4:
								switch (this.lookahead.value) {
									case "break":
										statement = this.parseBreakStatement();
										break;
									case "continue":
										statement = this.parseContinueStatement();
										break;
									case "debugger":
										statement = this.parseDebuggerStatement();
										break;
									case "do":
										statement = this.parseDoWhileStatement();
										break;
									case "for":
										statement = this.parseForStatement();
										break;
									case "function":
										statement = this.parseFunctionDeclaration();
										break;
									case "if":
										statement = this.parseIfStatement();
										break;
									case "return":
										statement = this.parseReturnStatement();
										break;
									case "switch":
										statement = this.parseSwitchStatement();
										break;
									case "throw":
										statement = this.parseThrowStatement();
										break;
									case "try":
										statement = this.parseTryStatement();
										break;
									case "var":
										statement = this.parseVariableStatement();
										break;
									case "while":
										statement = this.parseWhileStatement();
										break;
									case "with":
										statement = this.parseWithStatement();
										break;
									default:
										statement = this.parseExpressionStatement();
										break;
								}
								break;
							default: statement = this.throwUnexpectedToken(this.lookahead);
						}
						return statement;
					};
					Parser.prototype.parseFunctionSourceElements = function() {
						var node = this.createNode();
						this.expect("{");
						var body = this.parseDirectivePrologues();
						var previousLabelSet = this.context.labelSet;
						var previousInIteration = this.context.inIteration;
						var previousInSwitch = this.context.inSwitch;
						var previousInFunctionBody = this.context.inFunctionBody;
						this.context.labelSet = {};
						this.context.inIteration = false;
						this.context.inSwitch = false;
						this.context.inFunctionBody = true;
						while (this.lookahead.type !== 2) {
							if (this.match("}")) break;
							body.push(this.parseStatementListItem());
						}
						this.expect("}");
						this.context.labelSet = previousLabelSet;
						this.context.inIteration = previousInIteration;
						this.context.inSwitch = previousInSwitch;
						this.context.inFunctionBody = previousInFunctionBody;
						return this.finalize(node, new Node.BlockStatement(body));
					};
					Parser.prototype.validateParam = function(options, param, name) {
						var key = "$" + name;
						if (this.context.strict) {
							if (this.scanner.isRestrictedWord(name)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamName;
							}
							if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamDupe;
							}
						} else if (!options.firstRestricted) {
							if (this.scanner.isRestrictedWord(name)) {
								options.firstRestricted = param;
								options.message = messages_1.Messages.StrictParamName;
							} else if (this.scanner.isStrictModeReservedWord(name)) {
								options.firstRestricted = param;
								options.message = messages_1.Messages.StrictReservedWord;
							} else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
								options.stricted = param;
								options.message = messages_1.Messages.StrictParamDupe;
							}
						}
						/* istanbul ignore next */
						if (typeof Object.defineProperty === "function") Object.defineProperty(options.paramSet, key, {
							value: true,
							enumerable: true,
							writable: true,
							configurable: true
						});
						else options.paramSet[key] = true;
					};
					Parser.prototype.parseRestElement = function(params) {
						var node = this.createNode();
						this.expect("...");
						var arg = this.parsePattern(params);
						if (this.match("=")) this.throwError(messages_1.Messages.DefaultRestParameter);
						if (!this.match(")")) this.throwError(messages_1.Messages.ParameterAfterRestParameter);
						return this.finalize(node, new Node.RestElement(arg));
					};
					Parser.prototype.parseFormalParameter = function(options) {
						var params = [];
						var param = this.match("...") ? this.parseRestElement(params) : this.parsePatternWithDefault(params);
						for (var i = 0; i < params.length; i++) this.validateParam(options, params[i], params[i].value);
						options.simple = options.simple && param instanceof Node.Identifier;
						options.params.push(param);
					};
					Parser.prototype.parseFormalParameters = function(firstRestricted) {
						var options = {
							simple: true,
							params: [],
							firstRestricted
						};
						this.expect("(");
						if (!this.match(")")) {
							options.paramSet = {};
							while (this.lookahead.type !== 2) {
								this.parseFormalParameter(options);
								if (this.match(")")) break;
								this.expect(",");
								if (this.match(")")) break;
							}
						}
						this.expect(")");
						return {
							simple: options.simple,
							params: options.params,
							stricted: options.stricted,
							firstRestricted: options.firstRestricted,
							message: options.message
						};
					};
					Parser.prototype.matchAsyncFunction = function() {
						var match = this.matchContextualKeyword("async");
						if (match) {
							var state = this.scanner.saveState();
							this.scanner.scanComments();
							var next = this.scanner.lex();
							this.scanner.restoreState(state);
							match = state.lineNumber === next.lineNumber && next.type === 4 && next.value === "function";
						}
						return match;
					};
					Parser.prototype.parseFunctionDeclaration = function(identifierIsOptional) {
						var node = this.createNode();
						var isAsync = this.matchContextualKeyword("async");
						if (isAsync) this.nextToken();
						this.expectKeyword("function");
						var isGenerator = isAsync ? false : this.match("*");
						if (isGenerator) this.nextToken();
						var message;
						var id = null;
						var firstRestricted = null;
						if (!identifierIsOptional || !this.match("(")) {
							var token = this.lookahead;
							id = this.parseVariableIdentifier();
							if (this.context.strict) {
								if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName);
							} else if (this.scanner.isRestrictedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictFunctionName;
							} else if (this.scanner.isStrictModeReservedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictReservedWord;
							}
						}
						var previousAllowAwait = this.context.await;
						var previousAllowYield = this.context.allowYield;
						this.context.await = isAsync;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters(firstRestricted);
						var params = formalParameters.params;
						var stricted = formalParameters.stricted;
						firstRestricted = formalParameters.firstRestricted;
						if (formalParameters.message) message = formalParameters.message;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = formalParameters.simple;
						var body = this.parseFunctionSourceElements();
						if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
						if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						this.context.await = previousAllowAwait;
						this.context.allowYield = previousAllowYield;
						return isAsync ? this.finalize(node, new Node.AsyncFunctionDeclaration(id, params, body)) : this.finalize(node, new Node.FunctionDeclaration(id, params, body, isGenerator));
					};
					Parser.prototype.parseFunctionExpression = function() {
						var node = this.createNode();
						var isAsync = this.matchContextualKeyword("async");
						if (isAsync) this.nextToken();
						this.expectKeyword("function");
						var isGenerator = isAsync ? false : this.match("*");
						if (isGenerator) this.nextToken();
						var message;
						var id = null;
						var firstRestricted;
						var previousAllowAwait = this.context.await;
						var previousAllowYield = this.context.allowYield;
						this.context.await = isAsync;
						this.context.allowYield = !isGenerator;
						if (!this.match("(")) {
							var token = this.lookahead;
							id = !this.context.strict && !isGenerator && this.matchKeyword("yield") ? this.parseIdentifierName() : this.parseVariableIdentifier();
							if (this.context.strict) {
								if (this.scanner.isRestrictedWord(token.value)) this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName);
							} else if (this.scanner.isRestrictedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictFunctionName;
							} else if (this.scanner.isStrictModeReservedWord(token.value)) {
								firstRestricted = token;
								message = messages_1.Messages.StrictReservedWord;
							}
						}
						var formalParameters = this.parseFormalParameters(firstRestricted);
						var params = formalParameters.params;
						var stricted = formalParameters.stricted;
						firstRestricted = formalParameters.firstRestricted;
						if (formalParameters.message) message = formalParameters.message;
						var previousStrict = this.context.strict;
						var previousAllowStrictDirective = this.context.allowStrictDirective;
						this.context.allowStrictDirective = formalParameters.simple;
						var body = this.parseFunctionSourceElements();
						if (this.context.strict && firstRestricted) this.throwUnexpectedToken(firstRestricted, message);
						if (this.context.strict && stricted) this.tolerateUnexpectedToken(stricted, message);
						this.context.strict = previousStrict;
						this.context.allowStrictDirective = previousAllowStrictDirective;
						this.context.await = previousAllowAwait;
						this.context.allowYield = previousAllowYield;
						return isAsync ? this.finalize(node, new Node.AsyncFunctionExpression(id, params, body)) : this.finalize(node, new Node.FunctionExpression(id, params, body, isGenerator));
					};
					Parser.prototype.parseDirective = function() {
						var token = this.lookahead;
						var node = this.createNode();
						var expr = this.parseExpression();
						var directive = expr.type === syntax_1.Syntax.Literal ? this.getTokenRaw(token).slice(1, -1) : null;
						this.consumeSemicolon();
						return this.finalize(node, directive ? new Node.Directive(expr, directive) : new Node.ExpressionStatement(expr));
					};
					Parser.prototype.parseDirectivePrologues = function() {
						var firstRestricted = null;
						var body = [];
						while (true) {
							var token = this.lookahead;
							if (token.type !== 8) break;
							var statement = this.parseDirective();
							body.push(statement);
							var directive = statement.directive;
							if (typeof directive !== "string") break;
							if (directive === "use strict") {
								this.context.strict = true;
								if (firstRestricted) this.tolerateUnexpectedToken(firstRestricted, messages_1.Messages.StrictOctalLiteral);
								if (!this.context.allowStrictDirective) this.tolerateUnexpectedToken(token, messages_1.Messages.IllegalLanguageModeDirective);
							} else if (!firstRestricted && token.octal) firstRestricted = token;
						}
						return body;
					};
					Parser.prototype.qualifiedPropertyName = function(token) {
						switch (token.type) {
							case 3:
							case 8:
							case 1:
							case 5:
							case 6:
							case 4: return true;
							case 7: return token.value === "[";
							default: break;
						}
						return false;
					};
					Parser.prototype.parseGetterMethod = function() {
						var node = this.createNode();
						var isGenerator = false;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters();
						if (formalParameters.params.length > 0) this.tolerateError(messages_1.Messages.BadGetterArity);
						var method = this.parsePropertyMethod(formalParameters);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
					};
					Parser.prototype.parseSetterMethod = function() {
						var node = this.createNode();
						var isGenerator = false;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = !isGenerator;
						var formalParameters = this.parseFormalParameters();
						if (formalParameters.params.length !== 1) this.tolerateError(messages_1.Messages.BadSetterArity);
						else if (formalParameters.params[0] instanceof Node.RestElement) this.tolerateError(messages_1.Messages.BadSetterRestParameter);
						var method = this.parsePropertyMethod(formalParameters);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
					};
					Parser.prototype.parseGeneratorMethod = function() {
						var node = this.createNode();
						var isGenerator = true;
						var previousAllowYield = this.context.allowYield;
						this.context.allowYield = true;
						var params = this.parseFormalParameters();
						this.context.allowYield = false;
						var method = this.parsePropertyMethod(params);
						this.context.allowYield = previousAllowYield;
						return this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
					};
					Parser.prototype.isStartOfExpression = function() {
						var start = true;
						var value = this.lookahead.value;
						switch (this.lookahead.type) {
							case 7:
								start = value === "[" || value === "(" || value === "{" || value === "+" || value === "-" || value === "!" || value === "~" || value === "++" || value === "--" || value === "/" || value === "/=";
								break;
							case 4:
								start = value === "class" || value === "delete" || value === "function" || value === "let" || value === "new" || value === "super" || value === "this" || value === "typeof" || value === "void" || value === "yield";
								break;
							default: break;
						}
						return start;
					};
					Parser.prototype.parseYieldExpression = function() {
						var node = this.createNode();
						this.expectKeyword("yield");
						var argument = null;
						var delegate = false;
						if (!this.hasLineTerminator) {
							var previousAllowYield = this.context.allowYield;
							this.context.allowYield = false;
							delegate = this.match("*");
							if (delegate) {
								this.nextToken();
								argument = this.parseAssignmentExpression();
							} else if (this.isStartOfExpression()) argument = this.parseAssignmentExpression();
							this.context.allowYield = previousAllowYield;
						}
						return this.finalize(node, new Node.YieldExpression(argument, delegate));
					};
					Parser.prototype.parseClassElement = function(hasConstructor) {
						var token = this.lookahead;
						var node = this.createNode();
						var kind = "";
						var key = null;
						var value = null;
						var computed = false;
						var method = false;
						var isStatic = false;
						var isAsync = false;
						if (this.match("*")) this.nextToken();
						else {
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							if (key.name === "static" && (this.qualifiedPropertyName(this.lookahead) || this.match("*"))) {
								token = this.lookahead;
								isStatic = true;
								computed = this.match("[");
								if (this.match("*")) this.nextToken();
								else key = this.parseObjectPropertyKey();
							}
							if (token.type === 3 && !this.hasLineTerminator && token.value === "async") {
								var punctuator = this.lookahead.value;
								if (punctuator !== ":" && punctuator !== "(" && punctuator !== "*") {
									isAsync = true;
									token = this.lookahead;
									key = this.parseObjectPropertyKey();
									if (token.type === 3 && token.value === "constructor") this.tolerateUnexpectedToken(token, messages_1.Messages.ConstructorIsAsync);
								}
							}
						}
						var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
						if (token.type === 3) {
							if (token.value === "get" && lookaheadPropertyKey) {
								kind = "get";
								computed = this.match("[");
								key = this.parseObjectPropertyKey();
								this.context.allowYield = false;
								value = this.parseGetterMethod();
							} else if (token.value === "set" && lookaheadPropertyKey) {
								kind = "set";
								computed = this.match("[");
								key = this.parseObjectPropertyKey();
								value = this.parseSetterMethod();
							}
						} else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey) {
							kind = "init";
							computed = this.match("[");
							key = this.parseObjectPropertyKey();
							value = this.parseGeneratorMethod();
							method = true;
						}
						if (!kind && key && this.match("(")) {
							kind = "init";
							value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction();
							method = true;
						}
						if (!kind) this.throwUnexpectedToken(this.lookahead);
						if (kind === "init") kind = "method";
						if (!computed) {
							if (isStatic && this.isPropertyKey(key, "prototype")) this.throwUnexpectedToken(token, messages_1.Messages.StaticPrototype);
							if (!isStatic && this.isPropertyKey(key, "constructor")) {
								if (kind !== "method" || !method || value && value.generator) this.throwUnexpectedToken(token, messages_1.Messages.ConstructorSpecialMethod);
								if (hasConstructor.value) this.throwUnexpectedToken(token, messages_1.Messages.DuplicateConstructor);
								else hasConstructor.value = true;
								kind = "constructor";
							}
						}
						return this.finalize(node, new Node.MethodDefinition(key, computed, value, kind, isStatic));
					};
					Parser.prototype.parseClassElementList = function() {
						var body = [];
						var hasConstructor = { value: false };
						this.expect("{");
						while (!this.match("}")) if (this.match(";")) this.nextToken();
						else body.push(this.parseClassElement(hasConstructor));
						this.expect("}");
						return body;
					};
					Parser.prototype.parseClassBody = function() {
						var node = this.createNode();
						var elementList = this.parseClassElementList();
						return this.finalize(node, new Node.ClassBody(elementList));
					};
					Parser.prototype.parseClassDeclaration = function(identifierIsOptional) {
						var node = this.createNode();
						var previousStrict = this.context.strict;
						this.context.strict = true;
						this.expectKeyword("class");
						var id = identifierIsOptional && this.lookahead.type !== 3 ? null : this.parseVariableIdentifier();
						var superClass = null;
						if (this.matchKeyword("extends")) {
							this.nextToken();
							superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
						}
						var classBody = this.parseClassBody();
						this.context.strict = previousStrict;
						return this.finalize(node, new Node.ClassDeclaration(id, superClass, classBody));
					};
					Parser.prototype.parseClassExpression = function() {
						var node = this.createNode();
						var previousStrict = this.context.strict;
						this.context.strict = true;
						this.expectKeyword("class");
						var id = this.lookahead.type === 3 ? this.parseVariableIdentifier() : null;
						var superClass = null;
						if (this.matchKeyword("extends")) {
							this.nextToken();
							superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall);
						}
						var classBody = this.parseClassBody();
						this.context.strict = previousStrict;
						return this.finalize(node, new Node.ClassExpression(id, superClass, classBody));
					};
					Parser.prototype.parseModule = function() {
						this.context.strict = true;
						this.context.isModule = true;
						this.scanner.isModule = true;
						var node = this.createNode();
						var body = this.parseDirectivePrologues();
						while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
						return this.finalize(node, new Node.Module(body));
					};
					Parser.prototype.parseScript = function() {
						var node = this.createNode();
						var body = this.parseDirectivePrologues();
						while (this.lookahead.type !== 2) body.push(this.parseStatementListItem());
						return this.finalize(node, new Node.Script(body));
					};
					Parser.prototype.parseModuleSpecifier = function() {
						var node = this.createNode();
						if (this.lookahead.type !== 8) this.throwError(messages_1.Messages.InvalidModuleSpecifier);
						var token = this.nextToken();
						var raw = this.getTokenRaw(token);
						return this.finalize(node, new Node.Literal(token.value, raw));
					};
					Parser.prototype.parseImportSpecifier = function() {
						var node = this.createNode();
						var imported;
						var local;
						if (this.lookahead.type === 3) {
							imported = this.parseVariableIdentifier();
							local = imported;
							if (this.matchContextualKeyword("as")) {
								this.nextToken();
								local = this.parseVariableIdentifier();
							}
						} else {
							imported = this.parseIdentifierName();
							local = imported;
							if (this.matchContextualKeyword("as")) {
								this.nextToken();
								local = this.parseVariableIdentifier();
							} else this.throwUnexpectedToken(this.nextToken());
						}
						return this.finalize(node, new Node.ImportSpecifier(local, imported));
					};
					Parser.prototype.parseNamedImports = function() {
						this.expect("{");
						var specifiers = [];
						while (!this.match("}")) {
							specifiers.push(this.parseImportSpecifier());
							if (!this.match("}")) this.expect(",");
						}
						this.expect("}");
						return specifiers;
					};
					Parser.prototype.parseImportDefaultSpecifier = function() {
						var node = this.createNode();
						var local = this.parseIdentifierName();
						return this.finalize(node, new Node.ImportDefaultSpecifier(local));
					};
					Parser.prototype.parseImportNamespaceSpecifier = function() {
						var node = this.createNode();
						this.expect("*");
						if (!this.matchContextualKeyword("as")) this.throwError(messages_1.Messages.NoAsAfterImportNamespace);
						this.nextToken();
						var local = this.parseIdentifierName();
						return this.finalize(node, new Node.ImportNamespaceSpecifier(local));
					};
					Parser.prototype.parseImportDeclaration = function() {
						if (this.context.inFunctionBody) this.throwError(messages_1.Messages.IllegalImportDeclaration);
						var node = this.createNode();
						this.expectKeyword("import");
						var src;
						var specifiers = [];
						if (this.lookahead.type === 8) src = this.parseModuleSpecifier();
						else {
							if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
							else if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
							else if (this.isIdentifierName(this.lookahead) && !this.matchKeyword("default")) {
								specifiers.push(this.parseImportDefaultSpecifier());
								if (this.match(",")) {
									this.nextToken();
									if (this.match("*")) specifiers.push(this.parseImportNamespaceSpecifier());
									else if (this.match("{")) specifiers = specifiers.concat(this.parseNamedImports());
									else this.throwUnexpectedToken(this.lookahead);
								}
							} else this.throwUnexpectedToken(this.nextToken());
							if (!this.matchContextualKeyword("from")) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							}
							this.nextToken();
							src = this.parseModuleSpecifier();
						}
						this.consumeSemicolon();
						return this.finalize(node, new Node.ImportDeclaration(specifiers, src));
					};
					Parser.prototype.parseExportSpecifier = function() {
						var node = this.createNode();
						var local = this.parseIdentifierName();
						var exported = local;
						if (this.matchContextualKeyword("as")) {
							this.nextToken();
							exported = this.parseIdentifierName();
						}
						return this.finalize(node, new Node.ExportSpecifier(local, exported));
					};
					Parser.prototype.parseExportDeclaration = function() {
						if (this.context.inFunctionBody) this.throwError(messages_1.Messages.IllegalExportDeclaration);
						var node = this.createNode();
						this.expectKeyword("export");
						var exportDeclaration;
						if (this.matchKeyword("default")) {
							this.nextToken();
							if (this.matchKeyword("function")) {
								var declaration = this.parseFunctionDeclaration(true);
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else if (this.matchKeyword("class")) {
								var declaration = this.parseClassDeclaration(true);
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else if (this.matchContextualKeyword("async")) {
								var declaration = this.matchAsyncFunction() ? this.parseFunctionDeclaration(true) : this.parseAssignmentExpression();
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							} else {
								if (this.matchContextualKeyword("from")) this.throwError(messages_1.Messages.UnexpectedToken, this.lookahead.value);
								var declaration = this.match("{") ? this.parseObjectInitializer() : this.match("[") ? this.parseArrayInitializer() : this.parseAssignmentExpression();
								this.consumeSemicolon();
								exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
							}
						} else if (this.match("*")) {
							this.nextToken();
							if (!this.matchContextualKeyword("from")) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							}
							this.nextToken();
							var src = this.parseModuleSpecifier();
							this.consumeSemicolon();
							exportDeclaration = this.finalize(node, new Node.ExportAllDeclaration(src));
						} else if (this.lookahead.type === 4) {
							var declaration = void 0;
							switch (this.lookahead.value) {
								case "let":
								case "const":
									declaration = this.parseLexicalDeclaration({ inFor: false });
									break;
								case "var":
								case "class":
								case "function":
									declaration = this.parseStatementListItem();
									break;
								default: this.throwUnexpectedToken(this.lookahead);
							}
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
						} else if (this.matchAsyncFunction()) {
							var declaration = this.parseFunctionDeclaration();
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
						} else {
							var specifiers = [];
							var source = null;
							var isExportFromIdentifier = false;
							this.expect("{");
							while (!this.match("}")) {
								isExportFromIdentifier = isExportFromIdentifier || this.matchKeyword("default");
								specifiers.push(this.parseExportSpecifier());
								if (!this.match("}")) this.expect(",");
							}
							this.expect("}");
							if (this.matchContextualKeyword("from")) {
								this.nextToken();
								source = this.parseModuleSpecifier();
								this.consumeSemicolon();
							} else if (isExportFromIdentifier) {
								var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
								this.throwError(message, this.lookahead.value);
							} else this.consumeSemicolon();
							exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(null, specifiers, source));
						}
						return exportDeclaration;
					};
					return Parser;
				}();
			},
			function(module$11, exports$10) {
				"use strict";
				Object.defineProperty(exports$10, "__esModule", { value: true });
				function assert(condition, message) {
					/* istanbul ignore if */
					if (!condition) throw new Error("ASSERT: " + message);
				}
				exports$10.assert = assert;
			},
			function(module$12, exports$11) {
				"use strict";
				Object.defineProperty(exports$11, "__esModule", { value: true });
				exports$11.ErrorHandler = function() {
					function ErrorHandler() {
						this.errors = [];
						this.tolerant = false;
					}
					ErrorHandler.prototype.recordError = function(error) {
						this.errors.push(error);
					};
					ErrorHandler.prototype.tolerate = function(error) {
						if (this.tolerant) this.recordError(error);
						else throw error;
					};
					ErrorHandler.prototype.constructError = function(msg, column) {
						var error = new Error(msg);
						try {
							throw error;
						} catch (base) {
							/* istanbul ignore else */
							if (Object.create && Object.defineProperty) {
								error = Object.create(base);
								Object.defineProperty(error, "column", { value: column });
							}
						}
						/* istanbul ignore next */
						return error;
					};
					ErrorHandler.prototype.createError = function(index, line, col, description) {
						var msg = "Line " + line + ": " + description;
						var error = this.constructError(msg, col);
						error.index = index;
						error.lineNumber = line;
						error.description = description;
						return error;
					};
					ErrorHandler.prototype.throwError = function(index, line, col, description) {
						throw this.createError(index, line, col, description);
					};
					ErrorHandler.prototype.tolerateError = function(index, line, col, description) {
						var error = this.createError(index, line, col, description);
						if (this.tolerant) this.recordError(error);
						else throw error;
					};
					return ErrorHandler;
				}();
			},
			function(module$13, exports$12) {
				"use strict";
				Object.defineProperty(exports$12, "__esModule", { value: true });
				exports$12.Messages = {
					BadGetterArity: "Getter must not have any formal parameters",
					BadSetterArity: "Setter must have exactly one formal parameter",
					BadSetterRestParameter: "Setter function argument must not be a rest parameter",
					ConstructorIsAsync: "Class constructor may not be an async method",
					ConstructorSpecialMethod: "Class constructor may not be an accessor",
					DeclarationMissingInitializer: "Missing initializer in %0 declaration",
					DefaultRestParameter: "Unexpected token =",
					DuplicateBinding: "Duplicate binding %0",
					DuplicateConstructor: "A class may only have one constructor",
					DuplicateProtoProperty: "Duplicate __proto__ fields are not allowed in object literals",
					ForInOfLoopInitializer: "%0 loop variable declaration may not have an initializer",
					GeneratorInLegacyContext: "Generator declarations are not allowed in legacy contexts",
					IllegalBreak: "Illegal break statement",
					IllegalContinue: "Illegal continue statement",
					IllegalExportDeclaration: "Unexpected token",
					IllegalImportDeclaration: "Unexpected token",
					IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list",
					IllegalReturn: "Illegal return statement",
					InvalidEscapedReservedWord: "Keyword must not contain escaped characters",
					InvalidHexEscapeSequence: "Invalid hexadecimal escape sequence",
					InvalidLHSInAssignment: "Invalid left-hand side in assignment",
					InvalidLHSInForIn: "Invalid left-hand side in for-in",
					InvalidLHSInForLoop: "Invalid left-hand side in for-loop",
					InvalidModuleSpecifier: "Unexpected token",
					InvalidRegExp: "Invalid regular expression",
					LetInLexicalBinding: "let is disallowed as a lexically bound name",
					MissingFromClause: "Unexpected token",
					MultipleDefaultsInSwitch: "More than one default clause in switch statement",
					NewlineAfterThrow: "Illegal newline after throw",
					NoAsAfterImportNamespace: "Unexpected token",
					NoCatchOrFinally: "Missing catch or finally after try",
					ParameterAfterRestParameter: "Rest parameter must be last formal parameter",
					Redeclaration: "%0 '%1' has already been declared",
					StaticPrototype: "Classes may not have static property named prototype",
					StrictCatchVariable: "Catch variable may not be eval or arguments in strict mode",
					StrictDelete: "Delete of an unqualified identifier in strict mode.",
					StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block",
					StrictFunctionName: "Function name may not be eval or arguments in strict mode",
					StrictLHSAssignment: "Assignment to eval or arguments is not allowed in strict mode",
					StrictLHSPostfix: "Postfix increment/decrement may not have eval or arguments operand in strict mode",
					StrictLHSPrefix: "Prefix increment/decrement may not have eval or arguments operand in strict mode",
					StrictModeWith: "Strict mode code may not include a with statement",
					StrictOctalLiteral: "Octal literals are not allowed in strict mode.",
					StrictParamDupe: "Strict mode function may not have duplicate parameter names",
					StrictParamName: "Parameter name eval or arguments is not allowed in strict mode",
					StrictReservedWord: "Use of future reserved word in strict mode",
					StrictVarName: "Variable name may not be eval or arguments in strict mode",
					TemplateOctalLiteral: "Octal literals are not allowed in template strings.",
					UnexpectedEOS: "Unexpected end of input",
					UnexpectedIdentifier: "Unexpected identifier",
					UnexpectedNumber: "Unexpected number",
					UnexpectedReserved: "Unexpected reserved word",
					UnexpectedString: "Unexpected string",
					UnexpectedTemplate: "Unexpected quasi %0",
					UnexpectedToken: "Unexpected token %0",
					UnexpectedTokenIllegal: "Unexpected token ILLEGAL",
					UnknownLabel: "Undefined label '%0'",
					UnterminatedRegExp: "Invalid regular expression: missing /"
				};
			},
			function(module$14, exports$13, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$13, "__esModule", { value: true });
				var assert_1 = __webpack_require__(9);
				var character_1 = __webpack_require__(4);
				var messages_1 = __webpack_require__(11);
				function hexValue(ch) {
					return "0123456789abcdef".indexOf(ch.toLowerCase());
				}
				function octalValue(ch) {
					return "01234567".indexOf(ch);
				}
				exports$13.Scanner = function() {
					function Scanner(code, handler) {
						this.source = code;
						this.errorHandler = handler;
						this.trackComment = false;
						this.isModule = false;
						this.length = code.length;
						this.index = 0;
						this.lineNumber = code.length > 0 ? 1 : 0;
						this.lineStart = 0;
						this.curlyStack = [];
					}
					Scanner.prototype.saveState = function() {
						return {
							index: this.index,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart
						};
					};
					Scanner.prototype.restoreState = function(state) {
						this.index = state.index;
						this.lineNumber = state.lineNumber;
						this.lineStart = state.lineStart;
					};
					Scanner.prototype.eof = function() {
						return this.index >= this.length;
					};
					Scanner.prototype.throwUnexpectedToken = function(message) {
						if (message === void 0) message = messages_1.Messages.UnexpectedTokenIllegal;
						return this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
					};
					Scanner.prototype.tolerateUnexpectedToken = function(message) {
						if (message === void 0) message = messages_1.Messages.UnexpectedTokenIllegal;
						this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
					};
					Scanner.prototype.skipSingleLineComment = function(offset) {
						var comments = [];
						var start, loc;
						if (this.trackComment) {
							comments = [];
							start = this.index - offset;
							loc = {
								start: {
									line: this.lineNumber,
									column: this.index - this.lineStart - offset
								},
								end: {}
							};
						}
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							++this.index;
							if (character_1.Character.isLineTerminator(ch)) {
								if (this.trackComment) {
									loc.end = {
										line: this.lineNumber,
										column: this.index - this.lineStart - 1
									};
									var entry = {
										multiLine: false,
										slice: [start + offset, this.index - 1],
										range: [start, this.index - 1],
										loc
									};
									comments.push(entry);
								}
								if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
								++this.lineNumber;
								this.lineStart = this.index;
								return comments;
							}
						}
						if (this.trackComment) {
							loc.end = {
								line: this.lineNumber,
								column: this.index - this.lineStart
							};
							var entry = {
								multiLine: false,
								slice: [start + offset, this.index],
								range: [start, this.index],
								loc
							};
							comments.push(entry);
						}
						return comments;
					};
					Scanner.prototype.skipMultiLineComment = function() {
						var comments = [];
						var start, loc;
						if (this.trackComment) {
							comments = [];
							start = this.index - 2;
							loc = {
								start: {
									line: this.lineNumber,
									column: this.index - this.lineStart - 2
								},
								end: {}
							};
						}
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (character_1.Character.isLineTerminator(ch)) {
								if (ch === 13 && this.source.charCodeAt(this.index + 1) === 10) ++this.index;
								++this.lineNumber;
								++this.index;
								this.lineStart = this.index;
							} else if (ch === 42) {
								if (this.source.charCodeAt(this.index + 1) === 47) {
									this.index += 2;
									if (this.trackComment) {
										loc.end = {
											line: this.lineNumber,
											column: this.index - this.lineStart
										};
										var entry = {
											multiLine: true,
											slice: [start + 2, this.index - 2],
											range: [start, this.index],
											loc
										};
										comments.push(entry);
									}
									return comments;
								}
								++this.index;
							} else ++this.index;
						}
						if (this.trackComment) {
							loc.end = {
								line: this.lineNumber,
								column: this.index - this.lineStart
							};
							var entry = {
								multiLine: true,
								slice: [start + 2, this.index],
								range: [start, this.index],
								loc
							};
							comments.push(entry);
						}
						this.tolerateUnexpectedToken();
						return comments;
					};
					Scanner.prototype.scanComments = function() {
						var comments;
						if (this.trackComment) comments = [];
						var start = this.index === 0;
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (character_1.Character.isWhiteSpace(ch)) ++this.index;
							else if (character_1.Character.isLineTerminator(ch)) {
								++this.index;
								if (ch === 13 && this.source.charCodeAt(this.index) === 10) ++this.index;
								++this.lineNumber;
								this.lineStart = this.index;
								start = true;
							} else if (ch === 47) {
								ch = this.source.charCodeAt(this.index + 1);
								if (ch === 47) {
									this.index += 2;
									var comment = this.skipSingleLineComment(2);
									if (this.trackComment) comments = comments.concat(comment);
									start = true;
								} else if (ch === 42) {
									this.index += 2;
									var comment = this.skipMultiLineComment();
									if (this.trackComment) comments = comments.concat(comment);
								} else break;
							} else if (start && ch === 45) if (this.source.charCodeAt(this.index + 1) === 45 && this.source.charCodeAt(this.index + 2) === 62) {
								this.index += 3;
								var comment = this.skipSingleLineComment(3);
								if (this.trackComment) comments = comments.concat(comment);
							} else break;
							else if (ch === 60 && !this.isModule) if (this.source.slice(this.index + 1, this.index + 4) === "!--") {
								this.index += 4;
								var comment = this.skipSingleLineComment(4);
								if (this.trackComment) comments = comments.concat(comment);
							} else break;
							else break;
						}
						return comments;
					};
					Scanner.prototype.isFutureReservedWord = function(id) {
						switch (id) {
							case "enum":
							case "export":
							case "import":
							case "super": return true;
							default: return false;
						}
					};
					Scanner.prototype.isStrictModeReservedWord = function(id) {
						switch (id) {
							case "implements":
							case "interface":
							case "package":
							case "private":
							case "protected":
							case "public":
							case "static":
							case "yield":
							case "let": return true;
							default: return false;
						}
					};
					Scanner.prototype.isRestrictedWord = function(id) {
						return id === "eval" || id === "arguments";
					};
					Scanner.prototype.isKeyword = function(id) {
						switch (id.length) {
							case 2: return id === "if" || id === "in" || id === "do";
							case 3: return id === "var" || id === "for" || id === "new" || id === "try" || id === "let";
							case 4: return id === "this" || id === "else" || id === "case" || id === "void" || id === "with" || id === "enum";
							case 5: return id === "while" || id === "break" || id === "catch" || id === "throw" || id === "const" || id === "yield" || id === "class" || id === "super";
							case 6: return id === "return" || id === "typeof" || id === "delete" || id === "switch" || id === "export" || id === "import";
							case 7: return id === "default" || id === "finally" || id === "extends";
							case 8: return id === "function" || id === "continue" || id === "debugger";
							case 10: return id === "instanceof";
							default: return false;
						}
					};
					Scanner.prototype.codePointAt = function(i) {
						var cp = this.source.charCodeAt(i);
						if (cp >= 55296 && cp <= 56319) {
							var second = this.source.charCodeAt(i + 1);
							if (second >= 56320 && second <= 57343) cp = (cp - 55296) * 1024 + second - 56320 + 65536;
						}
						return cp;
					};
					Scanner.prototype.scanHexEscape = function(prefix) {
						var len = prefix === "u" ? 4 : 2;
						var code = 0;
						for (var i = 0; i < len; ++i) if (!this.eof() && character_1.Character.isHexDigit(this.source.charCodeAt(this.index))) code = code * 16 + hexValue(this.source[this.index++]);
						else return null;
						return String.fromCharCode(code);
					};
					Scanner.prototype.scanUnicodeCodePointEscape = function() {
						var ch = this.source[this.index];
						var code = 0;
						if (ch === "}") this.throwUnexpectedToken();
						while (!this.eof()) {
							ch = this.source[this.index++];
							if (!character_1.Character.isHexDigit(ch.charCodeAt(0))) break;
							code = code * 16 + hexValue(ch);
						}
						if (code > 1114111 || ch !== "}") this.throwUnexpectedToken();
						return character_1.Character.fromCodePoint(code);
					};
					Scanner.prototype.getIdentifier = function() {
						var start = this.index++;
						while (!this.eof()) {
							var ch = this.source.charCodeAt(this.index);
							if (ch === 92) {
								this.index = start;
								return this.getComplexIdentifier();
							} else if (ch >= 55296 && ch < 57343) {
								this.index = start;
								return this.getComplexIdentifier();
							}
							if (character_1.Character.isIdentifierPart(ch)) ++this.index;
							else break;
						}
						return this.source.slice(start, this.index);
					};
					Scanner.prototype.getComplexIdentifier = function() {
						var cp = this.codePointAt(this.index);
						var id = character_1.Character.fromCodePoint(cp);
						this.index += id.length;
						var ch;
						if (cp === 92) {
							if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
							++this.index;
							if (this.source[this.index] === "{") {
								++this.index;
								ch = this.scanUnicodeCodePointEscape();
							} else {
								ch = this.scanHexEscape("u");
								if (ch === null || ch === "\\" || !character_1.Character.isIdentifierStart(ch.charCodeAt(0))) this.throwUnexpectedToken();
							}
							id = ch;
						}
						while (!this.eof()) {
							cp = this.codePointAt(this.index);
							if (!character_1.Character.isIdentifierPart(cp)) break;
							ch = character_1.Character.fromCodePoint(cp);
							id += ch;
							this.index += ch.length;
							if (cp === 92) {
								id = id.substr(0, id.length - 1);
								if (this.source.charCodeAt(this.index) !== 117) this.throwUnexpectedToken();
								++this.index;
								if (this.source[this.index] === "{") {
									++this.index;
									ch = this.scanUnicodeCodePointEscape();
								} else {
									ch = this.scanHexEscape("u");
									if (ch === null || ch === "\\" || !character_1.Character.isIdentifierPart(ch.charCodeAt(0))) this.throwUnexpectedToken();
								}
								id += ch;
							}
						}
						return id;
					};
					Scanner.prototype.octalToDecimal = function(ch) {
						var octal = ch !== "0";
						var code = octalValue(ch);
						if (!this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) {
							octal = true;
							code = code * 8 + octalValue(this.source[this.index++]);
							if ("0123".indexOf(ch) >= 0 && !this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) code = code * 8 + octalValue(this.source[this.index++]);
						}
						return {
							code,
							octal
						};
					};
					Scanner.prototype.scanIdentifier = function() {
						var type;
						var start = this.index;
						var id = this.source.charCodeAt(start) === 92 ? this.getComplexIdentifier() : this.getIdentifier();
						if (id.length === 1) type = 3;
						else if (this.isKeyword(id)) type = 4;
						else if (id === "null") type = 5;
						else if (id === "true" || id === "false") type = 1;
						else type = 3;
						if (type !== 3 && start + id.length !== this.index) {
							var restore = this.index;
							this.index = start;
							this.tolerateUnexpectedToken(messages_1.Messages.InvalidEscapedReservedWord);
							this.index = restore;
						}
						return {
							type,
							value: id,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanPunctuator = function() {
						var start = this.index;
						var str = this.source[this.index];
						switch (str) {
							case "(":
							case "{":
								if (str === "{") this.curlyStack.push("{");
								++this.index;
								break;
							case ".":
								++this.index;
								if (this.source[this.index] === "." && this.source[this.index + 1] === ".") {
									this.index += 2;
									str = "...";
								}
								break;
							case "}":
								++this.index;
								this.curlyStack.pop();
								break;
							case ")":
							case ";":
							case ",":
							case "[":
							case "]":
							case ":":
							case "?":
							case "~":
								++this.index;
								break;
							default:
								str = this.source.substr(this.index, 4);
								if (str === ">>>=") this.index += 4;
								else {
									str = str.substr(0, 3);
									if (str === "===" || str === "!==" || str === ">>>" || str === "<<=" || str === ">>=" || str === "**=") this.index += 3;
									else {
										str = str.substr(0, 2);
										if (str === "&&" || str === "||" || str === "==" || str === "!=" || str === "+=" || str === "-=" || str === "*=" || str === "/=" || str === "++" || str === "--" || str === "<<" || str === ">>" || str === "&=" || str === "|=" || str === "^=" || str === "%=" || str === "<=" || str === ">=" || str === "=>" || str === "**") this.index += 2;
										else {
											str = this.source[this.index];
											if ("<>=!+-*%&|^/".indexOf(str) >= 0) ++this.index;
										}
									}
								}
						}
						if (this.index === start) this.throwUnexpectedToken();
						return {
							type: 7,
							value: str,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanHexLiteral = function(start) {
						var num = "";
						while (!this.eof()) {
							if (!character_1.Character.isHexDigit(this.source.charCodeAt(this.index))) break;
							num += this.source[this.index++];
						}
						if (num.length === 0) this.throwUnexpectedToken();
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseInt("0x" + num, 16),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanBinaryLiteral = function(start) {
						var num = "";
						var ch;
						while (!this.eof()) {
							ch = this.source[this.index];
							if (ch !== "0" && ch !== "1") break;
							num += this.source[this.index++];
						}
						if (num.length === 0) this.throwUnexpectedToken();
						if (!this.eof()) {
							ch = this.source.charCodeAt(this.index);
							/* istanbul ignore else */
							if (character_1.Character.isIdentifierStart(ch) || character_1.Character.isDecimalDigit(ch)) this.throwUnexpectedToken();
						}
						return {
							type: 6,
							value: parseInt(num, 2),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanOctalLiteral = function(prefix, start) {
						var num = "";
						var octal = false;
						if (character_1.Character.isOctalDigit(prefix.charCodeAt(0))) {
							octal = true;
							num = "0" + this.source[this.index++];
						} else ++this.index;
						while (!this.eof()) {
							if (!character_1.Character.isOctalDigit(this.source.charCodeAt(this.index))) break;
							num += this.source[this.index++];
						}
						if (!octal && num.length === 0) this.throwUnexpectedToken();
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index)) || character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseInt(num, 8),
							octal,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.isImplicitOctalLiteral = function() {
						for (var i = this.index + 1; i < this.length; ++i) {
							var ch = this.source[i];
							if (ch === "8" || ch === "9") return false;
							if (!character_1.Character.isOctalDigit(ch.charCodeAt(0))) return true;
						}
						return true;
					};
					Scanner.prototype.scanNumericLiteral = function() {
						var start = this.index;
						var ch = this.source[start];
						assert_1.assert(character_1.Character.isDecimalDigit(ch.charCodeAt(0)) || ch === ".", "Numeric literal must start with a decimal digit or a decimal point");
						var num = "";
						if (ch !== ".") {
							num = this.source[this.index++];
							ch = this.source[this.index];
							if (num === "0") {
								if (ch === "x" || ch === "X") {
									++this.index;
									return this.scanHexLiteral(start);
								}
								if (ch === "b" || ch === "B") {
									++this.index;
									return this.scanBinaryLiteral(start);
								}
								if (ch === "o" || ch === "O") return this.scanOctalLiteral(ch, start);
								if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0))) {
									if (this.isImplicitOctalLiteral()) return this.scanOctalLiteral(ch, start);
								}
							}
							while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							ch = this.source[this.index];
						}
						if (ch === ".") {
							num += this.source[this.index++];
							while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							ch = this.source[this.index];
						}
						if (ch === "e" || ch === "E") {
							num += this.source[this.index++];
							ch = this.source[this.index];
							if (ch === "+" || ch === "-") num += this.source[this.index++];
							if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) while (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) num += this.source[this.index++];
							else this.throwUnexpectedToken();
						}
						if (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index))) this.throwUnexpectedToken();
						return {
							type: 6,
							value: parseFloat(num),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanStringLiteral = function() {
						var start = this.index;
						var quote = this.source[start];
						assert_1.assert(quote === "'" || quote === "\"", "String literal must starts with a quote");
						++this.index;
						var octal = false;
						var str = "";
						while (!this.eof()) {
							var ch = this.source[this.index++];
							if (ch === quote) {
								quote = "";
								break;
							} else if (ch === "\\") {
								ch = this.source[this.index++];
								if (!ch || !character_1.Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
									case "u":
										if (this.source[this.index] === "{") {
											++this.index;
											str += this.scanUnicodeCodePointEscape();
										} else {
											var unescaped_1 = this.scanHexEscape(ch);
											if (unescaped_1 === null) this.throwUnexpectedToken();
											str += unescaped_1;
										}
										break;
									case "x":
										var unescaped = this.scanHexEscape(ch);
										if (unescaped === null) this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence);
										str += unescaped;
										break;
									case "n":
										str += "\n";
										break;
									case "r":
										str += "\r";
										break;
									case "t":
										str += "	";
										break;
									case "b":
										str += "\b";
										break;
									case "f":
										str += "\f";
										break;
									case "v":
										str += "\v";
										break;
									case "8":
									case "9":
										str += ch;
										this.tolerateUnexpectedToken();
										break;
									default:
										if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0))) {
											var octToDec = this.octalToDecimal(ch);
											octal = octToDec.octal || octal;
											str += String.fromCharCode(octToDec.code);
										} else str += ch;
										break;
								}
								else {
									++this.lineNumber;
									if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
									this.lineStart = this.index;
								}
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) break;
							else str += ch;
						}
						if (quote !== "") {
							this.index = start;
							this.throwUnexpectedToken();
						}
						return {
							type: 8,
							value: str,
							octal,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.scanTemplate = function() {
						var cooked = "";
						var terminated = false;
						var start = this.index;
						var head = this.source[start] === "`";
						var tail = false;
						var rawOffset = 2;
						++this.index;
						while (!this.eof()) {
							var ch = this.source[this.index++];
							if (ch === "`") {
								rawOffset = 1;
								tail = true;
								terminated = true;
								break;
							} else if (ch === "$") {
								if (this.source[this.index] === "{") {
									this.curlyStack.push("${");
									++this.index;
									terminated = true;
									break;
								}
								cooked += ch;
							} else if (ch === "\\") {
								ch = this.source[this.index++];
								if (!character_1.Character.isLineTerminator(ch.charCodeAt(0))) switch (ch) {
									case "n":
										cooked += "\n";
										break;
									case "r":
										cooked += "\r";
										break;
									case "t":
										cooked += "	";
										break;
									case "u":
										if (this.source[this.index] === "{") {
											++this.index;
											cooked += this.scanUnicodeCodePointEscape();
										} else {
											var restore = this.index;
											var unescaped_2 = this.scanHexEscape(ch);
											if (unescaped_2 !== null) cooked += unescaped_2;
											else {
												this.index = restore;
												cooked += ch;
											}
										}
										break;
									case "x":
										var unescaped = this.scanHexEscape(ch);
										if (unescaped === null) this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence);
										cooked += unescaped;
										break;
									case "b":
										cooked += "\b";
										break;
									case "f":
										cooked += "\f";
										break;
									case "v":
										cooked += "\v";
										break;
									default:
										if (ch === "0") {
											if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral);
											cooked += "\0";
										} else if (character_1.Character.isOctalDigit(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral);
										else cooked += ch;
										break;
								}
								else {
									++this.lineNumber;
									if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
									this.lineStart = this.index;
								}
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) {
								++this.lineNumber;
								if (ch === "\r" && this.source[this.index] === "\n") ++this.index;
								this.lineStart = this.index;
								cooked += "\n";
							} else cooked += ch;
						}
						if (!terminated) this.throwUnexpectedToken();
						if (!head) this.curlyStack.pop();
						return {
							type: 10,
							value: this.source.slice(start + 1, this.index - rawOffset),
							cooked,
							head,
							tail,
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.testRegExp = function(pattern, flags) {
						var astralSubstitute = "￿";
						var tmp = pattern;
						var self = this;
						if (flags.indexOf("u") >= 0) tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function($0, $1, $2) {
							var codePoint = parseInt($1 || $2, 16);
							if (codePoint > 1114111) self.throwUnexpectedToken(messages_1.Messages.InvalidRegExp);
							if (codePoint <= 65535) return String.fromCharCode(codePoint);
							return astralSubstitute;
						}).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
						try {
							RegExp(tmp);
						} catch (e) {
							this.throwUnexpectedToken(messages_1.Messages.InvalidRegExp);
						}
						try {
							return new RegExp(pattern, flags);
						} catch (exception) {
							/* istanbul ignore next */
							return null;
						}
					};
					Scanner.prototype.scanRegExpBody = function() {
						var ch = this.source[this.index];
						assert_1.assert(ch === "/", "Regular expression literal must start with a slash");
						var str = this.source[this.index++];
						var classMarker = false;
						var terminated = false;
						while (!this.eof()) {
							ch = this.source[this.index++];
							str += ch;
							if (ch === "\\") {
								ch = this.source[this.index++];
								if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
								str += ch;
							} else if (character_1.Character.isLineTerminator(ch.charCodeAt(0))) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
							else if (classMarker) {
								if (ch === "]") classMarker = false;
							} else if (ch === "/") {
								terminated = true;
								break;
							} else if (ch === "[") classMarker = true;
						}
						if (!terminated) this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
						return str.substr(1, str.length - 2);
					};
					Scanner.prototype.scanRegExpFlags = function() {
						var str = "";
						var flags = "";
						while (!this.eof()) {
							var ch = this.source[this.index];
							if (!character_1.Character.isIdentifierPart(ch.charCodeAt(0))) break;
							++this.index;
							if (ch === "\\" && !this.eof()) {
								ch = this.source[this.index];
								if (ch === "u") {
									++this.index;
									var restore = this.index;
									var char = this.scanHexEscape("u");
									if (char !== null) {
										flags += char;
										for (str += "\\u"; restore < this.index; ++restore) str += this.source[restore];
									} else {
										this.index = restore;
										flags += "u";
										str += "\\u";
									}
									this.tolerateUnexpectedToken();
								} else {
									str += "\\";
									this.tolerateUnexpectedToken();
								}
							} else {
								flags += ch;
								str += ch;
							}
						}
						return flags;
					};
					Scanner.prototype.scanRegExp = function() {
						var start = this.index;
						var pattern = this.scanRegExpBody();
						var flags = this.scanRegExpFlags();
						return {
							type: 9,
							value: "",
							pattern,
							flags,
							regex: this.testRegExp(pattern, flags),
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start,
							end: this.index
						};
					};
					Scanner.prototype.lex = function() {
						if (this.eof()) return {
							type: 2,
							value: "",
							lineNumber: this.lineNumber,
							lineStart: this.lineStart,
							start: this.index,
							end: this.index
						};
						var cp = this.source.charCodeAt(this.index);
						if (character_1.Character.isIdentifierStart(cp)) return this.scanIdentifier();
						if (cp === 40 || cp === 41 || cp === 59) return this.scanPunctuator();
						if (cp === 39 || cp === 34) return this.scanStringLiteral();
						if (cp === 46) {
							if (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) return this.scanNumericLiteral();
							return this.scanPunctuator();
						}
						if (character_1.Character.isDecimalDigit(cp)) return this.scanNumericLiteral();
						if (cp === 96 || cp === 125 && this.curlyStack[this.curlyStack.length - 1] === "${") return this.scanTemplate();
						if (cp >= 55296 && cp < 57343) {
							if (character_1.Character.isIdentifierStart(this.codePointAt(this.index))) return this.scanIdentifier();
						}
						return this.scanPunctuator();
					};
					return Scanner;
				}();
			},
			function(module$15, exports$14) {
				"use strict";
				Object.defineProperty(exports$14, "__esModule", { value: true });
				exports$14.TokenName = {};
				exports$14.TokenName[1] = "Boolean";
				exports$14.TokenName[2] = "<end>";
				exports$14.TokenName[3] = "Identifier";
				exports$14.TokenName[4] = "Keyword";
				exports$14.TokenName[5] = "Null";
				exports$14.TokenName[6] = "Numeric";
				exports$14.TokenName[7] = "Punctuator";
				exports$14.TokenName[8] = "String";
				exports$14.TokenName[9] = "RegularExpression";
				exports$14.TokenName[10] = "Template";
			},
			function(module$16, exports$15) {
				"use strict";
				Object.defineProperty(exports$15, "__esModule", { value: true });
				exports$15.XHTMLEntities = {
					quot: "\"",
					amp: "&",
					apos: "'",
					gt: ">",
					nbsp: "\xA0",
					iexcl: "¡",
					cent: "¢",
					pound: "£",
					curren: "¤",
					yen: "¥",
					brvbar: "¦",
					sect: "§",
					uml: "¨",
					copy: "©",
					ordf: "ª",
					laquo: "«",
					not: "¬",
					shy: "­",
					reg: "®",
					macr: "¯",
					deg: "°",
					plusmn: "±",
					sup2: "²",
					sup3: "³",
					acute: "´",
					micro: "µ",
					para: "¶",
					middot: "·",
					cedil: "¸",
					sup1: "¹",
					ordm: "º",
					raquo: "»",
					frac14: "¼",
					frac12: "½",
					frac34: "¾",
					iquest: "¿",
					Agrave: "À",
					Aacute: "Á",
					Acirc: "Â",
					Atilde: "Ã",
					Auml: "Ä",
					Aring: "Å",
					AElig: "Æ",
					Ccedil: "Ç",
					Egrave: "È",
					Eacute: "É",
					Ecirc: "Ê",
					Euml: "Ë",
					Igrave: "Ì",
					Iacute: "Í",
					Icirc: "Î",
					Iuml: "Ï",
					ETH: "Ð",
					Ntilde: "Ñ",
					Ograve: "Ò",
					Oacute: "Ó",
					Ocirc: "Ô",
					Otilde: "Õ",
					Ouml: "Ö",
					times: "×",
					Oslash: "Ø",
					Ugrave: "Ù",
					Uacute: "Ú",
					Ucirc: "Û",
					Uuml: "Ü",
					Yacute: "Ý",
					THORN: "Þ",
					szlig: "ß",
					agrave: "à",
					aacute: "á",
					acirc: "â",
					atilde: "ã",
					auml: "ä",
					aring: "å",
					aelig: "æ",
					ccedil: "ç",
					egrave: "è",
					eacute: "é",
					ecirc: "ê",
					euml: "ë",
					igrave: "ì",
					iacute: "í",
					icirc: "î",
					iuml: "ï",
					eth: "ð",
					ntilde: "ñ",
					ograve: "ò",
					oacute: "ó",
					ocirc: "ô",
					otilde: "õ",
					ouml: "ö",
					divide: "÷",
					oslash: "ø",
					ugrave: "ù",
					uacute: "ú",
					ucirc: "û",
					uuml: "ü",
					yacute: "ý",
					thorn: "þ",
					yuml: "ÿ",
					OElig: "Œ",
					oelig: "œ",
					Scaron: "Š",
					scaron: "š",
					Yuml: "Ÿ",
					fnof: "ƒ",
					circ: "ˆ",
					tilde: "˜",
					Alpha: "Α",
					Beta: "Β",
					Gamma: "Γ",
					Delta: "Δ",
					Epsilon: "Ε",
					Zeta: "Ζ",
					Eta: "Η",
					Theta: "Θ",
					Iota: "Ι",
					Kappa: "Κ",
					Lambda: "Λ",
					Mu: "Μ",
					Nu: "Ν",
					Xi: "Ξ",
					Omicron: "Ο",
					Pi: "Π",
					Rho: "Ρ",
					Sigma: "Σ",
					Tau: "Τ",
					Upsilon: "Υ",
					Phi: "Φ",
					Chi: "Χ",
					Psi: "Ψ",
					Omega: "Ω",
					alpha: "α",
					beta: "β",
					gamma: "γ",
					delta: "δ",
					epsilon: "ε",
					zeta: "ζ",
					eta: "η",
					theta: "θ",
					iota: "ι",
					kappa: "κ",
					lambda: "λ",
					mu: "μ",
					nu: "ν",
					xi: "ξ",
					omicron: "ο",
					pi: "π",
					rho: "ρ",
					sigmaf: "ς",
					sigma: "σ",
					tau: "τ",
					upsilon: "υ",
					phi: "φ",
					chi: "χ",
					psi: "ψ",
					omega: "ω",
					thetasym: "ϑ",
					upsih: "ϒ",
					piv: "ϖ",
					ensp: " ",
					emsp: " ",
					thinsp: " ",
					zwnj: "‌",
					zwj: "‍",
					lrm: "‎",
					rlm: "‏",
					ndash: "–",
					mdash: "—",
					lsquo: "‘",
					rsquo: "’",
					sbquo: "‚",
					ldquo: "“",
					rdquo: "”",
					bdquo: "„",
					dagger: "†",
					Dagger: "‡",
					bull: "•",
					hellip: "…",
					permil: "‰",
					prime: "′",
					Prime: "″",
					lsaquo: "‹",
					rsaquo: "›",
					oline: "‾",
					frasl: "⁄",
					euro: "€",
					image: "ℑ",
					weierp: "℘",
					real: "ℜ",
					trade: "™",
					alefsym: "ℵ",
					larr: "←",
					uarr: "↑",
					rarr: "→",
					darr: "↓",
					harr: "↔",
					crarr: "↵",
					lArr: "⇐",
					uArr: "⇑",
					rArr: "⇒",
					dArr: "⇓",
					hArr: "⇔",
					forall: "∀",
					part: "∂",
					exist: "∃",
					empty: "∅",
					nabla: "∇",
					isin: "∈",
					notin: "∉",
					ni: "∋",
					prod: "∏",
					sum: "∑",
					minus: "−",
					lowast: "∗",
					radic: "√",
					prop: "∝",
					infin: "∞",
					ang: "∠",
					and: "∧",
					or: "∨",
					cap: "∩",
					cup: "∪",
					int: "∫",
					there4: "∴",
					sim: "∼",
					cong: "≅",
					asymp: "≈",
					ne: "≠",
					equiv: "≡",
					le: "≤",
					ge: "≥",
					sub: "⊂",
					sup: "⊃",
					nsub: "⊄",
					sube: "⊆",
					supe: "⊇",
					oplus: "⊕",
					otimes: "⊗",
					perp: "⊥",
					sdot: "⋅",
					lceil: "⌈",
					rceil: "⌉",
					lfloor: "⌊",
					rfloor: "⌋",
					loz: "◊",
					spades: "♠",
					clubs: "♣",
					hearts: "♥",
					diams: "♦",
					lang: "⟨",
					rang: "⟩"
				};
			},
			function(module$17, exports$16, __webpack_require__) {
				"use strict";
				Object.defineProperty(exports$16, "__esModule", { value: true });
				var error_handler_1 = __webpack_require__(10);
				var scanner_1 = __webpack_require__(12);
				var token_1 = __webpack_require__(13);
				var Reader = function() {
					function Reader() {
						this.values = [];
						this.curly = this.paren = -1;
					}
					Reader.prototype.beforeFunctionExpression = function(t) {
						return [
							"(",
							"{",
							"[",
							"in",
							"typeof",
							"instanceof",
							"new",
							"return",
							"case",
							"delete",
							"throw",
							"void",
							"=",
							"+=",
							"-=",
							"*=",
							"**=",
							"/=",
							"%=",
							"<<=",
							">>=",
							">>>=",
							"&=",
							"|=",
							"^=",
							",",
							"+",
							"-",
							"*",
							"**",
							"/",
							"%",
							"++",
							"--",
							"<<",
							">>",
							">>>",
							"&",
							"|",
							"^",
							"!",
							"~",
							"&&",
							"||",
							"?",
							":",
							"===",
							"==",
							">=",
							"<=",
							"<",
							">",
							"!=",
							"!=="
						].indexOf(t) >= 0;
					};
					Reader.prototype.isRegexStart = function() {
						var previous = this.values[this.values.length - 1];
						var regex = previous !== null;
						switch (previous) {
							case "this":
							case "]":
								regex = false;
								break;
							case ")":
								var keyword = this.values[this.paren - 1];
								regex = keyword === "if" || keyword === "while" || keyword === "for" || keyword === "with";
								break;
							case "}":
								regex = false;
								if (this.values[this.curly - 3] === "function") {
									var check = this.values[this.curly - 4];
									regex = check ? !this.beforeFunctionExpression(check) : false;
								} else if (this.values[this.curly - 4] === "function") {
									var check = this.values[this.curly - 5];
									regex = check ? !this.beforeFunctionExpression(check) : true;
								}
								break;
							default: break;
						}
						return regex;
					};
					Reader.prototype.push = function(token) {
						if (token.type === 7 || token.type === 4) {
							if (token.value === "{") this.curly = this.values.length;
							else if (token.value === "(") this.paren = this.values.length;
							this.values.push(token.value);
						} else this.values.push(null);
					};
					return Reader;
				}();
				exports$16.Tokenizer = function() {
					function Tokenizer(code, config) {
						this.errorHandler = new error_handler_1.ErrorHandler();
						this.errorHandler.tolerant = config ? typeof config.tolerant === "boolean" && config.tolerant : false;
						this.scanner = new scanner_1.Scanner(code, this.errorHandler);
						this.scanner.trackComment = config ? typeof config.comment === "boolean" && config.comment : false;
						this.trackRange = config ? typeof config.range === "boolean" && config.range : false;
						this.trackLoc = config ? typeof config.loc === "boolean" && config.loc : false;
						this.buffer = [];
						this.reader = new Reader();
					}
					Tokenizer.prototype.errors = function() {
						return this.errorHandler.errors;
					};
					Tokenizer.prototype.getNextToken = function() {
						if (this.buffer.length === 0) {
							var comments = this.scanner.scanComments();
							if (this.scanner.trackComment) for (var i = 0; i < comments.length; ++i) {
								var e = comments[i];
								var value = this.scanner.source.slice(e.slice[0], e.slice[1]);
								var comment = {
									type: e.multiLine ? "BlockComment" : "LineComment",
									value
								};
								if (this.trackRange) comment.range = e.range;
								if (this.trackLoc) comment.loc = e.loc;
								this.buffer.push(comment);
							}
							if (!this.scanner.eof()) {
								var loc = void 0;
								if (this.trackLoc) loc = {
									start: {
										line: this.scanner.lineNumber,
										column: this.scanner.index - this.scanner.lineStart
									},
									end: {}
								};
								var token = this.scanner.source[this.scanner.index] === "/" && this.reader.isRegexStart() ? this.scanner.scanRegExp() : this.scanner.lex();
								this.reader.push(token);
								var entry = {
									type: token_1.TokenName[token.type],
									value: this.scanner.source.slice(token.start, token.end)
								};
								if (this.trackRange) entry.range = [token.start, token.end];
								if (this.trackLoc) {
									loc.end = {
										line: this.scanner.lineNumber,
										column: this.scanner.index - this.scanner.lineStart
									};
									entry.loc = loc;
								}
								if (token.type === 9) entry.regex = {
									pattern: token.pattern,
									flags: token.flags
								};
								this.buffer.push(entry);
							}
						}
						return this.buffer.shift();
					};
					return Tokenizer;
				}();
			}
		]);
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/function.js
var require_function = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var esprima;
	try {
		esprima = require_esprima();
	} catch (_) {
		if (typeof window !== "undefined") esprima = window.esprima;
	}
	var Type = require_type();
	function resolveJavascriptFunction(data) {
		if (data === null) return false;
		try {
			var source = "(" + data + ")", ast = esprima.parse(source, { range: true });
			if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") return false;
			return true;
		} catch (err) {
			return false;
		}
	}
	function constructJavascriptFunction(data) {
		var source = "(" + data + ")", ast = esprima.parse(source, { range: true }), params = [], body;
		if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") throw new Error("Failed to resolve function");
		ast.body[0].expression.params.forEach(function(param) {
			params.push(param.name);
		});
		body = ast.body[0].expression.body.range;
		if (ast.body[0].expression.body.type === "BlockStatement") return new Function(params, source.slice(body[0] + 1, body[1] - 1));
		return new Function(params, "return " + source.slice(body[0], body[1]));
	}
	function representJavascriptFunction(object) {
		return object.toString();
	}
	function isFunction(object) {
		return Object.prototype.toString.call(object) === "[object Function]";
	}
	module.exports = new Type("tag:yaml.org,2002:js/function", {
		kind: "scalar",
		resolve: resolveJavascriptFunction,
		construct: constructJavascriptFunction,
		predicate: isFunction,
		represent: representJavascriptFunction
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_full.js
var require_default_full = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Schema = require_schema();
	module.exports = Schema.DEFAULT = new Schema({
		include: [require_default_safe()],
		explicit: [
			require_undefined(),
			require_regexp(),
			require_function()
		]
	});
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/loader.js
var require_loader = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	var YAMLException = require_exception();
	var Mark = require_mark();
	var DEFAULT_SAFE_SCHEMA = require_default_safe();
	var DEFAULT_FULL_SCHEMA = require_default_full();
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var CONTEXT_FLOW_IN = 1;
	var CONTEXT_FLOW_OUT = 2;
	var CONTEXT_BLOCK_IN = 3;
	var CONTEXT_BLOCK_OUT = 4;
	var CHOMPING_CLIP = 1;
	var CHOMPING_STRIP = 2;
	var CHOMPING_KEEP = 3;
	var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
	var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
	var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
	var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
	var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
	function _class(obj) {
		return Object.prototype.toString.call(obj);
	}
	function is_EOL(c) {
		return c === 10 || c === 13;
	}
	function is_WHITE_SPACE(c) {
		return c === 9 || c === 32;
	}
	function is_WS_OR_EOL(c) {
		return c === 9 || c === 32 || c === 10 || c === 13;
	}
	function is_FLOW_INDICATOR(c) {
		return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
	}
	function fromHexCode(c) {
		var lc;
		if (48 <= c && c <= 57) return c - 48;
		lc = c | 32;
		if (97 <= lc && lc <= 102) return lc - 97 + 10;
		return -1;
	}
	function escapedHexLen(c) {
		if (c === 120) return 2;
		if (c === 117) return 4;
		if (c === 85) return 8;
		return 0;
	}
	function fromDecimalCode(c) {
		if (48 <= c && c <= 57) return c - 48;
		return -1;
	}
	function simpleEscapeSequence(c) {
		return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? "\"" : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
	}
	function charFromCodepoint(c) {
		if (c <= 65535) return String.fromCharCode(c);
		return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
	}
	function setProperty(object, key, value) {
		if (key === "__proto__") Object.defineProperty(object, key, {
			configurable: true,
			enumerable: true,
			writable: true,
			value
		});
		else object[key] = value;
	}
	var simpleEscapeCheck = new Array(256);
	var simpleEscapeMap = new Array(256);
	for (var i = 0; i < 256; i++) {
		simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
		simpleEscapeMap[i] = simpleEscapeSequence(i);
	}
	function State(input, options) {
		this.input = input;
		this.filename = options["filename"] || null;
		this.schema = options["schema"] || DEFAULT_FULL_SCHEMA;
		this.onWarning = options["onWarning"] || null;
		this.legacy = options["legacy"] || false;
		this.json = options["json"] || false;
		this.listener = options["listener"] || null;
		this.implicitTypes = this.schema.compiledImplicit;
		this.typeMap = this.schema.compiledTypeMap;
		this.length = input.length;
		this.position = 0;
		this.line = 0;
		this.lineStart = 0;
		this.lineIndent = 0;
		this.documents = [];
	}
	function generateError(state, message) {
		return new YAMLException(message, new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart));
	}
	function throwError(state, message) {
		throw generateError(state, message);
	}
	function throwWarning(state, message) {
		if (state.onWarning) state.onWarning.call(null, generateError(state, message));
	}
	var directiveHandlers = {
		YAML: function handleYamlDirective(state, name, args) {
			var match, major, minor;
			if (state.version !== null) throwError(state, "duplication of %YAML directive");
			if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
			match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
			if (match === null) throwError(state, "ill-formed argument of the YAML directive");
			major = parseInt(match[1], 10);
			minor = parseInt(match[2], 10);
			if (major !== 1) throwError(state, "unacceptable YAML version of the document");
			state.version = args[0];
			state.checkLineBreaks = minor < 2;
			if (minor !== 1 && minor !== 2) throwWarning(state, "unsupported YAML version of the document");
		},
		TAG: function handleTagDirective(state, name, args) {
			var handle, prefix;
			if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
			handle = args[0];
			prefix = args[1];
			if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
			if (_hasOwnProperty.call(state.tagMap, handle)) throwError(state, "there is a previously declared suffix for \"" + handle + "\" tag handle");
			if (!PATTERN_TAG_URI.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
			state.tagMap[handle] = prefix;
		}
	};
	function captureSegment(state, start, end, checkJson) {
		var _position, _length, _character, _result;
		if (start < end) {
			_result = state.input.slice(start, end);
			if (checkJson) for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
				_character = _result.charCodeAt(_position);
				if (!(_character === 9 || 32 <= _character && _character <= 1114111)) throwError(state, "expected valid JSON character");
			}
			else if (PATTERN_NON_PRINTABLE.test(_result)) throwError(state, "the stream contains non-printable characters");
			state.result += _result;
		}
	}
	function mergeMappings(state, destination, source, overridableKeys) {
		var sourceKeys, key, index, quantity;
		if (!common.isObject(source)) throwError(state, "cannot merge mappings; the provided source object is unacceptable");
		sourceKeys = Object.keys(source);
		for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
			key = sourceKeys[index];
			if (!_hasOwnProperty.call(destination, key)) {
				setProperty(destination, key, source[key]);
				overridableKeys[key] = true;
			}
		}
	}
	function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
		var index, quantity;
		if (Array.isArray(keyNode)) {
			keyNode = Array.prototype.slice.call(keyNode);
			for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
				if (Array.isArray(keyNode[index])) throwError(state, "nested arrays are not supported inside keys");
				if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") keyNode[index] = "[object Object]";
			}
		}
		if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") keyNode = "[object Object]";
		keyNode = String(keyNode);
		if (_result === null) _result = {};
		if (keyTag === "tag:yaml.org,2002:merge") if (Array.isArray(valueNode)) for (index = 0, quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys);
		else mergeMappings(state, _result, valueNode, overridableKeys);
		else {
			if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
				state.line = startLine || state.line;
				state.position = startPos || state.position;
				throwError(state, "duplicated mapping key");
			}
			setProperty(_result, keyNode, valueNode);
			delete overridableKeys[keyNode];
		}
		return _result;
	}
	function readLineBreak(state) {
		var ch = state.input.charCodeAt(state.position);
		if (ch === 10) state.position++;
		else if (ch === 13) {
			state.position++;
			if (state.input.charCodeAt(state.position) === 10) state.position++;
		} else throwError(state, "a line break is expected");
		state.line += 1;
		state.lineStart = state.position;
	}
	function skipSeparationSpace(state, allowComments, checkIndent) {
		var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
			if (allowComments && ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 10 && ch !== 13 && ch !== 0);
			if (is_EOL(ch)) {
				readLineBreak(state);
				ch = state.input.charCodeAt(state.position);
				lineBreaks++;
				state.lineIndent = 0;
				while (ch === 32) {
					state.lineIndent++;
					ch = state.input.charCodeAt(++state.position);
				}
			} else break;
		}
		if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) throwWarning(state, "deficient indentation");
		return lineBreaks;
	}
	function testDocumentSeparator(state) {
		var _position = state.position, ch = state.input.charCodeAt(_position);
		if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
			_position += 3;
			ch = state.input.charCodeAt(_position);
			if (ch === 0 || is_WS_OR_EOL(ch)) return true;
		}
		return false;
	}
	function writeFoldedLines(state, count) {
		if (count === 1) state.result += " ";
		else if (count > 1) state.result += common.repeat("\n", count - 1);
	}
	function readPlainScalar(state, nodeIndent, withinFlowCollection) {
		var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch = state.input.charCodeAt(state.position);
		if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) return false;
		if (ch === 63 || ch === 45) {
			following = state.input.charCodeAt(state.position + 1);
			if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) return false;
		}
		state.kind = "scalar";
		state.result = "";
		captureStart = captureEnd = state.position;
		hasPendingContent = false;
		while (ch !== 0) {
			if (ch === 58) {
				following = state.input.charCodeAt(state.position + 1);
				if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) break;
			} else if (ch === 35) {
				preceding = state.input.charCodeAt(state.position - 1);
				if (is_WS_OR_EOL(preceding)) break;
			} else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) break;
			else if (is_EOL(ch)) {
				_line = state.line;
				_lineStart = state.lineStart;
				_lineIndent = state.lineIndent;
				skipSeparationSpace(state, false, -1);
				if (state.lineIndent >= nodeIndent) {
					hasPendingContent = true;
					ch = state.input.charCodeAt(state.position);
					continue;
				} else {
					state.position = captureEnd;
					state.line = _line;
					state.lineStart = _lineStart;
					state.lineIndent = _lineIndent;
					break;
				}
			}
			if (hasPendingContent) {
				captureSegment(state, captureStart, captureEnd, false);
				writeFoldedLines(state, state.line - _line);
				captureStart = captureEnd = state.position;
				hasPendingContent = false;
			}
			if (!is_WHITE_SPACE(ch)) captureEnd = state.position + 1;
			ch = state.input.charCodeAt(++state.position);
		}
		captureSegment(state, captureStart, captureEnd, false);
		if (state.result) return true;
		state.kind = _kind;
		state.result = _result;
		return false;
	}
	function readSingleQuotedScalar(state, nodeIndent) {
		var ch = state.input.charCodeAt(state.position), captureStart, captureEnd;
		if (ch !== 39) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 39) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (ch === 39) {
				captureStart = state.position;
				state.position++;
				captureEnd = state.position;
			} else return true;
		} else if (is_EOL(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
		else {
			state.position++;
			captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a single quoted scalar");
	}
	function readDoubleQuotedScalar(state, nodeIndent) {
		var captureStart, captureEnd, hexLength, hexResult, tmp, ch = state.input.charCodeAt(state.position);
		if (ch !== 34) return false;
		state.kind = "scalar";
		state.result = "";
		state.position++;
		captureStart = captureEnd = state.position;
		while ((ch = state.input.charCodeAt(state.position)) !== 0) if (ch === 34) {
			captureSegment(state, captureStart, state.position, true);
			state.position++;
			return true;
		} else if (ch === 92) {
			captureSegment(state, captureStart, state.position, true);
			ch = state.input.charCodeAt(++state.position);
			if (is_EOL(ch)) skipSeparationSpace(state, false, nodeIndent);
			else if (ch < 256 && simpleEscapeCheck[ch]) {
				state.result += simpleEscapeMap[ch];
				state.position++;
			} else if ((tmp = escapedHexLen(ch)) > 0) {
				hexLength = tmp;
				hexResult = 0;
				for (; hexLength > 0; hexLength--) {
					ch = state.input.charCodeAt(++state.position);
					if ((tmp = fromHexCode(ch)) >= 0) hexResult = (hexResult << 4) + tmp;
					else throwError(state, "expected hexadecimal character");
				}
				state.result += charFromCodepoint(hexResult);
				state.position++;
			} else throwError(state, "unknown escape sequence");
			captureStart = captureEnd = state.position;
		} else if (is_EOL(ch)) {
			captureSegment(state, captureStart, captureEnd, true);
			writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
			captureStart = captureEnd = state.position;
		} else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
		else {
			state.position++;
			captureEnd = state.position;
		}
		throwError(state, "unexpected end of the stream within a double quoted scalar");
	}
	function readFlowCollection(state, nodeIndent) {
		var readNext = true, _line, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = {}, keyNode, keyTag, valueNode, ch = state.input.charCodeAt(state.position);
		if (ch === 91) {
			terminator = 93;
			isMapping = false;
			_result = [];
		} else if (ch === 123) {
			terminator = 125;
			isMapping = true;
			_result = {};
		} else return false;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
		ch = state.input.charCodeAt(++state.position);
		while (ch !== 0) {
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === terminator) {
				state.position++;
				state.tag = _tag;
				state.anchor = _anchor;
				state.kind = isMapping ? "mapping" : "sequence";
				state.result = _result;
				return true;
			} else if (!readNext) throwError(state, "missed comma between flow collection entries");
			keyTag = keyNode = valueNode = null;
			isPair = isExplicitPair = false;
			if (ch === 63) {
				following = state.input.charCodeAt(state.position + 1);
				if (is_WS_OR_EOL(following)) {
					isPair = isExplicitPair = true;
					state.position++;
					skipSeparationSpace(state, true, nodeIndent);
				}
			}
			_line = state.line;
			composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
			keyTag = state.tag;
			keyNode = state.result;
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if ((isExplicitPair || state.line === _line) && ch === 58) {
				isPair = true;
				ch = state.input.charCodeAt(++state.position);
				skipSeparationSpace(state, true, nodeIndent);
				composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
				valueNode = state.result;
			}
			if (isMapping) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
			else if (isPair) _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
			else _result.push(keyNode);
			skipSeparationSpace(state, true, nodeIndent);
			ch = state.input.charCodeAt(state.position);
			if (ch === 44) {
				readNext = true;
				ch = state.input.charCodeAt(++state.position);
			} else readNext = false;
		}
		throwError(state, "unexpected end of the stream within a flow collection");
	}
	function readBlockScalar(state, nodeIndent) {
		var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch = state.input.charCodeAt(state.position);
		if (ch === 124) folding = false;
		else if (ch === 62) folding = true;
		else return false;
		state.kind = "scalar";
		state.result = "";
		while (ch !== 0) {
			ch = state.input.charCodeAt(++state.position);
			if (ch === 43 || ch === 45) if (CHOMPING_CLIP === chomping) chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
			else throwError(state, "repeat of a chomping mode identifier");
			else if ((tmp = fromDecimalCode(ch)) >= 0) if (tmp === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
			else if (!detectedIndent) {
				textIndent = nodeIndent + tmp - 1;
				detectedIndent = true;
			} else throwError(state, "repeat of an indentation width identifier");
			else break;
		}
		if (is_WHITE_SPACE(ch)) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (is_WHITE_SPACE(ch));
			if (ch === 35) do
				ch = state.input.charCodeAt(++state.position);
			while (!is_EOL(ch) && ch !== 0);
		}
		while (ch !== 0) {
			readLineBreak(state);
			state.lineIndent = 0;
			ch = state.input.charCodeAt(state.position);
			while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
				state.lineIndent++;
				ch = state.input.charCodeAt(++state.position);
			}
			if (!detectedIndent && state.lineIndent > textIndent) textIndent = state.lineIndent;
			if (is_EOL(ch)) {
				emptyLines++;
				continue;
			}
			if (state.lineIndent < textIndent) {
				if (chomping === CHOMPING_KEEP) state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
				else if (chomping === CHOMPING_CLIP) {
					if (didReadContent) state.result += "\n";
				}
				break;
			}
			if (folding) if (is_WHITE_SPACE(ch)) {
				atMoreIndented = true;
				state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			} else if (atMoreIndented) {
				atMoreIndented = false;
				state.result += common.repeat("\n", emptyLines + 1);
			} else if (emptyLines === 0) {
				if (didReadContent) state.result += " ";
			} else state.result += common.repeat("\n", emptyLines);
			else state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
			didReadContent = true;
			detectedIndent = true;
			emptyLines = 0;
			captureStart = state.position;
			while (!is_EOL(ch) && ch !== 0) ch = state.input.charCodeAt(++state.position);
			captureSegment(state, captureStart, state.position, false);
		}
		return true;
	}
	function readBlockSequence(state, nodeIndent) {
		var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
		ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			if (ch !== 45) break;
			following = state.input.charCodeAt(state.position + 1);
			if (!is_WS_OR_EOL(following)) break;
			detected = true;
			state.position++;
			if (skipSeparationSpace(state, true, -1)) {
				if (state.lineIndent <= nodeIndent) {
					_result.push(null);
					ch = state.input.charCodeAt(state.position);
					continue;
				}
			}
			_line = state.line;
			composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
			_result.push(state.result);
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a sequence entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "sequence";
			state.result = _result;
			return true;
		}
		return false;
	}
	function readBlockMapping(state, nodeIndent, flowIndent) {
		var following, allowCompact, _line, _pos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = {}, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
		if (state.anchor !== null) state.anchorMap[state.anchor] = _result;
		ch = state.input.charCodeAt(state.position);
		while (ch !== 0) {
			following = state.input.charCodeAt(state.position + 1);
			_line = state.line;
			_pos = state.position;
			if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
				if (ch === 63) {
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
						keyTag = keyNode = valueNode = null;
					}
					detected = true;
					atExplicitKey = true;
					allowCompact = true;
				} else if (atExplicitKey) {
					atExplicitKey = false;
					allowCompact = true;
				} else throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
				state.position += 1;
				ch = following;
			} else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) if (state.line === _line) {
				ch = state.input.charCodeAt(state.position);
				while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 58) {
					ch = state.input.charCodeAt(++state.position);
					if (!is_WS_OR_EOL(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
					if (atExplicitKey) {
						storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
						keyTag = keyNode = valueNode = null;
					}
					detected = true;
					atExplicitKey = false;
					allowCompact = false;
					keyTag = state.tag;
					keyNode = state.result;
				} else if (detected) throwError(state, "can not read an implicit mapping pair; a colon is missed");
				else {
					state.tag = _tag;
					state.anchor = _anchor;
					return true;
				}
			} else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
			else {
				state.tag = _tag;
				state.anchor = _anchor;
				return true;
			}
			else break;
			if (state.line === _line || state.lineIndent > nodeIndent) {
				if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) if (atExplicitKey) keyNode = state.result;
				else valueNode = state.result;
				if (!atExplicitKey) {
					storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
					keyTag = keyNode = valueNode = null;
				}
				skipSeparationSpace(state, true, -1);
				ch = state.input.charCodeAt(state.position);
			}
			if (state.lineIndent > nodeIndent && ch !== 0) throwError(state, "bad indentation of a mapping entry");
			else if (state.lineIndent < nodeIndent) break;
		}
		if (atExplicitKey) storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
		if (detected) {
			state.tag = _tag;
			state.anchor = _anchor;
			state.kind = "mapping";
			state.result = _result;
		}
		return detected;
	}
	function readTagProperty(state) {
		var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch = state.input.charCodeAt(state.position);
		if (ch !== 33) return false;
		if (state.tag !== null) throwError(state, "duplication of a tag property");
		ch = state.input.charCodeAt(++state.position);
		if (ch === 60) {
			isVerbatim = true;
			ch = state.input.charCodeAt(++state.position);
		} else if (ch === 33) {
			isNamed = true;
			tagHandle = "!!";
			ch = state.input.charCodeAt(++state.position);
		} else tagHandle = "!";
		_position = state.position;
		if (isVerbatim) {
			do
				ch = state.input.charCodeAt(++state.position);
			while (ch !== 0 && ch !== 62);
			if (state.position < state.length) {
				tagName = state.input.slice(_position, state.position);
				ch = state.input.charCodeAt(++state.position);
			} else throwError(state, "unexpected end of the stream within a verbatim tag");
		} else {
			while (ch !== 0 && !is_WS_OR_EOL(ch)) {
				if (ch === 33) if (!isNamed) {
					tagHandle = state.input.slice(_position - 1, state.position + 1);
					if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
					isNamed = true;
					_position = state.position + 1;
				} else throwError(state, "tag suffix cannot contain exclamation marks");
				ch = state.input.charCodeAt(++state.position);
			}
			tagName = state.input.slice(_position, state.position);
			if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
		}
		if (tagName && !PATTERN_TAG_URI.test(tagName)) throwError(state, "tag name cannot contain such characters: " + tagName);
		if (isVerbatim) state.tag = tagName;
		else if (_hasOwnProperty.call(state.tagMap, tagHandle)) state.tag = state.tagMap[tagHandle] + tagName;
		else if (tagHandle === "!") state.tag = "!" + tagName;
		else if (tagHandle === "!!") state.tag = "tag:yaml.org,2002:" + tagName;
		else throwError(state, "undeclared tag handle \"" + tagHandle + "\"");
		return true;
	}
	function readAnchorProperty(state) {
		var _position, ch = state.input.charCodeAt(state.position);
		if (ch !== 38) return false;
		if (state.anchor !== null) throwError(state, "duplication of an anchor property");
		ch = state.input.charCodeAt(++state.position);
		_position = state.position;
		while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an anchor node must contain at least one character");
		state.anchor = state.input.slice(_position, state.position);
		return true;
	}
	function readAlias(state) {
		var _position, alias, ch = state.input.charCodeAt(state.position);
		if (ch !== 42) return false;
		ch = state.input.charCodeAt(++state.position);
		_position = state.position;
		while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) ch = state.input.charCodeAt(++state.position);
		if (state.position === _position) throwError(state, "name of an alias node must contain at least one character");
		alias = state.input.slice(_position, state.position);
		if (!_hasOwnProperty.call(state.anchorMap, alias)) throwError(state, "unidentified alias \"" + alias + "\"");
		state.result = state.anchorMap[alias];
		skipSeparationSpace(state, true, -1);
		return true;
	}
	function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
		var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, type, flowIndent, blockIndent;
		if (state.listener !== null) state.listener("open", state);
		state.tag = null;
		state.anchor = null;
		state.kind = null;
		state.result = null;
		allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
		if (allowToSeek) {
			if (skipSeparationSpace(state, true, -1)) {
				atNewLine = true;
				if (state.lineIndent > parentIndent) indentStatus = 1;
				else if (state.lineIndent === parentIndent) indentStatus = 0;
				else if (state.lineIndent < parentIndent) indentStatus = -1;
			}
		}
		if (indentStatus === 1) while (readTagProperty(state) || readAnchorProperty(state)) if (skipSeparationSpace(state, true, -1)) {
			atNewLine = true;
			allowBlockCollections = allowBlockStyles;
			if (state.lineIndent > parentIndent) indentStatus = 1;
			else if (state.lineIndent === parentIndent) indentStatus = 0;
			else if (state.lineIndent < parentIndent) indentStatus = -1;
		} else allowBlockCollections = false;
		if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
		if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
			if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) flowIndent = parentIndent;
			else flowIndent = parentIndent + 1;
			blockIndent = state.position - state.lineStart;
			if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) hasContent = true;
			else {
				if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) hasContent = true;
				else if (readAlias(state)) {
					hasContent = true;
					if (state.tag !== null || state.anchor !== null) throwError(state, "alias node should not have any properties");
				} else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
					hasContent = true;
					if (state.tag === null) state.tag = "?";
				}
				if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
			}
			else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
		}
		if (state.tag !== null && state.tag !== "!") if (state.tag === "?") {
			if (state.result !== null && state.kind !== "scalar") throwError(state, "unacceptable node kind for !<?> tag; it should be \"scalar\", not \"" + state.kind + "\"");
			for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
				type = state.implicitTypes[typeIndex];
				if (type.resolve(state.result)) {
					state.result = type.construct(state.result);
					state.tag = type.tag;
					if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
					break;
				}
			}
		} else if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
			type = state.typeMap[state.kind || "fallback"][state.tag];
			if (state.result !== null && type.kind !== state.kind) throwError(state, "unacceptable node kind for !<" + state.tag + "> tag; it should be \"" + type.kind + "\", not \"" + state.kind + "\"");
			if (!type.resolve(state.result)) throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
			else {
				state.result = type.construct(state.result);
				if (state.anchor !== null) state.anchorMap[state.anchor] = state.result;
			}
		} else throwError(state, "unknown tag !<" + state.tag + ">");
		if (state.listener !== null) state.listener("close", state);
		return state.tag !== null || state.anchor !== null || hasContent;
	}
	function readDocument(state) {
		var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
		state.version = null;
		state.checkLineBreaks = state.legacy;
		state.tagMap = {};
		state.anchorMap = {};
		while ((ch = state.input.charCodeAt(state.position)) !== 0) {
			skipSeparationSpace(state, true, -1);
			ch = state.input.charCodeAt(state.position);
			if (state.lineIndent > 0 || ch !== 37) break;
			hasDirectives = true;
			ch = state.input.charCodeAt(++state.position);
			_position = state.position;
			while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
			directiveName = state.input.slice(_position, state.position);
			directiveArgs = [];
			if (directiveName.length < 1) throwError(state, "directive name must not be less than one character in length");
			while (ch !== 0) {
				while (is_WHITE_SPACE(ch)) ch = state.input.charCodeAt(++state.position);
				if (ch === 35) {
					do
						ch = state.input.charCodeAt(++state.position);
					while (ch !== 0 && !is_EOL(ch));
					break;
				}
				if (is_EOL(ch)) break;
				_position = state.position;
				while (ch !== 0 && !is_WS_OR_EOL(ch)) ch = state.input.charCodeAt(++state.position);
				directiveArgs.push(state.input.slice(_position, state.position));
			}
			if (ch !== 0) readLineBreak(state);
			if (_hasOwnProperty.call(directiveHandlers, directiveName)) directiveHandlers[directiveName](state, directiveName, directiveArgs);
			else throwWarning(state, "unknown document directive \"" + directiveName + "\"");
		}
		skipSeparationSpace(state, true, -1);
		if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
			state.position += 3;
			skipSeparationSpace(state, true, -1);
		} else if (hasDirectives) throwError(state, "directives end mark is expected");
		composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
		skipSeparationSpace(state, true, -1);
		if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) throwWarning(state, "non-ASCII line breaks are interpreted as content");
		state.documents.push(state.result);
		if (state.position === state.lineStart && testDocumentSeparator(state)) {
			if (state.input.charCodeAt(state.position) === 46) {
				state.position += 3;
				skipSeparationSpace(state, true, -1);
			}
			return;
		}
		if (state.position < state.length - 1) throwError(state, "end of the stream or a document separator is expected");
		else return;
	}
	function loadDocuments(input, options) {
		input = String(input);
		options = options || {};
		if (input.length !== 0) {
			if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) input += "\n";
			if (input.charCodeAt(0) === 65279) input = input.slice(1);
		}
		var state = new State(input, options);
		var nullpos = input.indexOf("\0");
		if (nullpos !== -1) {
			state.position = nullpos;
			throwError(state, "null byte is not allowed in input");
		}
		state.input += "\0";
		while (state.input.charCodeAt(state.position) === 32) {
			state.lineIndent += 1;
			state.position += 1;
		}
		while (state.position < state.length - 1) readDocument(state);
		return state.documents;
	}
	function loadAll(input, iterator, options) {
		if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		var documents = loadDocuments(input, options);
		if (typeof iterator !== "function") return documents;
		for (var index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
	}
	function load(input, options) {
		var documents = loadDocuments(input, options);
		if (documents.length === 0) return;
		else if (documents.length === 1) return documents[0];
		throw new YAMLException("expected a single document in the stream, but found more");
	}
	function safeLoadAll(input, iterator, options) {
		if (typeof iterator === "object" && iterator !== null && typeof options === "undefined") {
			options = iterator;
			iterator = null;
		}
		return loadAll(input, iterator, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	function safeLoad(input, options) {
		return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	module.exports.loadAll = loadAll;
	module.exports.load = load;
	module.exports.safeLoadAll = safeLoadAll;
	module.exports.safeLoad = safeLoad;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/dumper.js
var require_dumper = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var common = require_common$1();
	var YAMLException = require_exception();
	var DEFAULT_FULL_SCHEMA = require_default_full();
	var DEFAULT_SAFE_SCHEMA = require_default_safe();
	var _toString = Object.prototype.toString;
	var _hasOwnProperty = Object.prototype.hasOwnProperty;
	var CHAR_TAB = 9;
	var CHAR_LINE_FEED = 10;
	var CHAR_CARRIAGE_RETURN = 13;
	var CHAR_SPACE = 32;
	var CHAR_EXCLAMATION = 33;
	var CHAR_DOUBLE_QUOTE = 34;
	var CHAR_SHARP = 35;
	var CHAR_PERCENT = 37;
	var CHAR_AMPERSAND = 38;
	var CHAR_SINGLE_QUOTE = 39;
	var CHAR_ASTERISK = 42;
	var CHAR_COMMA = 44;
	var CHAR_MINUS = 45;
	var CHAR_COLON = 58;
	var CHAR_EQUALS = 61;
	var CHAR_GREATER_THAN = 62;
	var CHAR_QUESTION = 63;
	var CHAR_COMMERCIAL_AT = 64;
	var CHAR_LEFT_SQUARE_BRACKET = 91;
	var CHAR_RIGHT_SQUARE_BRACKET = 93;
	var CHAR_GRAVE_ACCENT = 96;
	var CHAR_LEFT_CURLY_BRACKET = 123;
	var CHAR_VERTICAL_LINE = 124;
	var CHAR_RIGHT_CURLY_BRACKET = 125;
	var ESCAPE_SEQUENCES = {};
	ESCAPE_SEQUENCES[0] = "\\0";
	ESCAPE_SEQUENCES[7] = "\\a";
	ESCAPE_SEQUENCES[8] = "\\b";
	ESCAPE_SEQUENCES[9] = "\\t";
	ESCAPE_SEQUENCES[10] = "\\n";
	ESCAPE_SEQUENCES[11] = "\\v";
	ESCAPE_SEQUENCES[12] = "\\f";
	ESCAPE_SEQUENCES[13] = "\\r";
	ESCAPE_SEQUENCES[27] = "\\e";
	ESCAPE_SEQUENCES[34] = "\\\"";
	ESCAPE_SEQUENCES[92] = "\\\\";
	ESCAPE_SEQUENCES[133] = "\\N";
	ESCAPE_SEQUENCES[160] = "\\_";
	ESCAPE_SEQUENCES[8232] = "\\L";
	ESCAPE_SEQUENCES[8233] = "\\P";
	var DEPRECATED_BOOLEANS_SYNTAX = [
		"y",
		"Y",
		"yes",
		"Yes",
		"YES",
		"on",
		"On",
		"ON",
		"n",
		"N",
		"no",
		"No",
		"NO",
		"off",
		"Off",
		"OFF"
	];
	function compileStyleMap(schema, map) {
		var result, keys, index, length, tag, style, type;
		if (map === null) return {};
		result = {};
		keys = Object.keys(map);
		for (index = 0, length = keys.length; index < length; index += 1) {
			tag = keys[index];
			style = String(map[tag]);
			if (tag.slice(0, 2) === "!!") tag = "tag:yaml.org,2002:" + tag.slice(2);
			type = schema.compiledTypeMap["fallback"][tag];
			if (type && _hasOwnProperty.call(type.styleAliases, style)) style = type.styleAliases[style];
			result[tag] = style;
		}
		return result;
	}
	function encodeHex(character) {
		var string = character.toString(16).toUpperCase(), handle, length;
		if (character <= 255) {
			handle = "x";
			length = 2;
		} else if (character <= 65535) {
			handle = "u";
			length = 4;
		} else if (character <= 4294967295) {
			handle = "U";
			length = 8;
		} else throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
		return "\\" + handle + common.repeat("0", length - string.length) + string;
	}
	function State(options) {
		this.schema = options["schema"] || DEFAULT_FULL_SCHEMA;
		this.indent = Math.max(1, options["indent"] || 2);
		this.noArrayIndent = options["noArrayIndent"] || false;
		this.skipInvalid = options["skipInvalid"] || false;
		this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
		this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
		this.sortKeys = options["sortKeys"] || false;
		this.lineWidth = options["lineWidth"] || 80;
		this.noRefs = options["noRefs"] || false;
		this.noCompatMode = options["noCompatMode"] || false;
		this.condenseFlow = options["condenseFlow"] || false;
		this.implicitTypes = this.schema.compiledImplicit;
		this.explicitTypes = this.schema.compiledExplicit;
		this.tag = null;
		this.result = "";
		this.duplicates = [];
		this.usedDuplicates = null;
	}
	function indentString(string, spaces) {
		var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
		while (position < length) {
			next = string.indexOf("\n", position);
			if (next === -1) {
				line = string.slice(position);
				position = length;
			} else {
				line = string.slice(position, next + 1);
				position = next + 1;
			}
			if (line.length && line !== "\n") result += ind;
			result += line;
		}
		return result;
	}
	function generateNextLine(state, level) {
		return "\n" + common.repeat(" ", state.indent * level);
	}
	function testImplicitResolving(state, str) {
		var index, length, type;
		for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
			type = state.implicitTypes[index];
			if (type.resolve(str)) return true;
		}
		return false;
	}
	function isWhitespace(c) {
		return c === CHAR_SPACE || c === CHAR_TAB;
	}
	function isPrintable(c) {
		return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== 65279 || 65536 <= c && c <= 1114111;
	}
	function isNsChar(c) {
		return isPrintable(c) && !isWhitespace(c) && c !== 65279 && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
	}
	function isPlainSafe(c, prev) {
		return isPrintable(c) && c !== 65279 && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_COLON && (c !== CHAR_SHARP || prev && isNsChar(prev));
	}
	function isPlainSafeFirst(c) {
		return isPrintable(c) && c !== 65279 && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
	}
	function needIndentIndicator(string) {
		return /^\n* /.test(string);
	}
	var STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
	function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
		var i;
		var char, prev_char;
		var hasLineBreak = false;
		var hasFoldableLine = false;
		var shouldTrackWidth = lineWidth !== -1;
		var previousLineBreak = -1;
		var plain = isPlainSafeFirst(string.charCodeAt(0)) && !isWhitespace(string.charCodeAt(string.length - 1));
		if (singleLineOnly) for (i = 0; i < string.length; i++) {
			char = string.charCodeAt(i);
			if (!isPrintable(char)) return STYLE_DOUBLE;
			prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
			plain = plain && isPlainSafe(char, prev_char);
		}
		else {
			for (i = 0; i < string.length; i++) {
				char = string.charCodeAt(i);
				if (char === CHAR_LINE_FEED) {
					hasLineBreak = true;
					if (shouldTrackWidth) {
						hasFoldableLine = hasFoldableLine || i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
						previousLineBreak = i;
					}
				} else if (!isPrintable(char)) return STYLE_DOUBLE;
				prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
				plain = plain && isPlainSafe(char, prev_char);
			}
			hasFoldableLine = hasFoldableLine || shouldTrackWidth && i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
		}
		if (!hasLineBreak && !hasFoldableLine) return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
		if (indentPerLevel > 9 && needIndentIndicator(string)) return STYLE_DOUBLE;
		return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
	}
	function writeScalar(state, string, level, iskey) {
		state.dump = function() {
			if (string.length === 0) return "''";
			if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) return "'" + string + "'";
			var indent = state.indent * Math.max(1, level);
			var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
			var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
			function testAmbiguity(string) {
				return testImplicitResolving(state, string);
			}
			switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
				case STYLE_PLAIN: return string;
				case STYLE_SINGLE: return "'" + string.replace(/'/g, "''") + "'";
				case STYLE_LITERAL: return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
				case STYLE_FOLDED: return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
				case STYLE_DOUBLE: return "\"" + escapeString(string, lineWidth) + "\"";
				default: throw new YAMLException("impossible error: invalid scalar style");
			}
		}();
	}
	function blockHeader(string, indentPerLevel) {
		var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
		var clip = string[string.length - 1] === "\n";
		return indentIndicator + (clip && (string[string.length - 2] === "\n" || string === "\n") ? "+" : clip ? "" : "-") + "\n";
	}
	function dropEndingNewline(string) {
		return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
	}
	function foldString(string, width) {
		var lineRe = /(\n+)([^\n]*)/g;
		var result = function() {
			var nextLF = string.indexOf("\n");
			nextLF = nextLF !== -1 ? nextLF : string.length;
			lineRe.lastIndex = nextLF;
			return foldLine(string.slice(0, nextLF), width);
		}();
		var prevMoreIndented = string[0] === "\n" || string[0] === " ";
		var moreIndented;
		var match;
		while (match = lineRe.exec(string)) {
			var prefix = match[1], line = match[2];
			moreIndented = line[0] === " ";
			result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
			prevMoreIndented = moreIndented;
		}
		return result;
	}
	function foldLine(line, width) {
		if (line === "" || line[0] === " ") return line;
		var breakRe = / [^ ]/g;
		var match;
		var start = 0, end, curr = 0, next = 0;
		var result = "";
		while (match = breakRe.exec(line)) {
			next = match.index;
			if (next - start > width) {
				end = curr > start ? curr : next;
				result += "\n" + line.slice(start, end);
				start = end + 1;
			}
			curr = next;
		}
		result += "\n";
		if (line.length - start > width && curr > start) result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
		else result += line.slice(start);
		return result.slice(1);
	}
	function escapeString(string) {
		var result = "";
		var char, nextChar;
		var escapeSeq;
		for (var i = 0; i < string.length; i++) {
			char = string.charCodeAt(i);
			if (char >= 55296 && char <= 56319) {
				nextChar = string.charCodeAt(i + 1);
				if (nextChar >= 56320 && nextChar <= 57343) {
					result += encodeHex((char - 55296) * 1024 + nextChar - 56320 + 65536);
					i++;
					continue;
				}
			}
			escapeSeq = ESCAPE_SEQUENCES[char];
			result += !escapeSeq && isPrintable(char) ? string[i] : escapeSeq || encodeHex(char);
		}
		return result;
	}
	function writeFlowSequence(state, level, object) {
		var _result = "", _tag = state.tag, index, length;
		for (index = 0, length = object.length; index < length; index += 1) if (writeNode(state, level, object[index], false, false)) {
			if (index !== 0) _result += "," + (!state.condenseFlow ? " " : "");
			_result += state.dump;
		}
		state.tag = _tag;
		state.dump = "[" + _result + "]";
	}
	function writeBlockSequence(state, level, object, compact) {
		var _result = "", _tag = state.tag, index, length;
		for (index = 0, length = object.length; index < length; index += 1) if (writeNode(state, level + 1, object[index], true, true)) {
			if (!compact || index !== 0) _result += generateNextLine(state, level);
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) _result += "-";
			else _result += "- ";
			_result += state.dump;
		}
		state.tag = _tag;
		state.dump = _result || "[]";
	}
	function writeFlowMapping(state, level, object) {
		var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
		for (index = 0, length = objectKeyList.length; index < length; index += 1) {
			pairBuffer = "";
			if (index !== 0) pairBuffer += ", ";
			if (state.condenseFlow) pairBuffer += "\"";
			objectKey = objectKeyList[index];
			objectValue = object[objectKey];
			if (!writeNode(state, level, objectKey, false, false)) continue;
			if (state.dump.length > 1024) pairBuffer += "? ";
			pairBuffer += state.dump + (state.condenseFlow ? "\"" : "") + ":" + (state.condenseFlow ? "" : " ");
			if (!writeNode(state, level, objectValue, false, false)) continue;
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = "{" + _result + "}";
	}
	function writeBlockMapping(state, level, object, compact) {
		var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
		if (state.sortKeys === true) objectKeyList.sort();
		else if (typeof state.sortKeys === "function") objectKeyList.sort(state.sortKeys);
		else if (state.sortKeys) throw new YAMLException("sortKeys must be a boolean or a function");
		for (index = 0, length = objectKeyList.length; index < length; index += 1) {
			pairBuffer = "";
			if (!compact || index !== 0) pairBuffer += generateNextLine(state, level);
			objectKey = objectKeyList[index];
			objectValue = object[objectKey];
			if (!writeNode(state, level + 1, objectKey, true, true, true)) continue;
			explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
			if (explicitPair) if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += "?";
			else pairBuffer += "? ";
			pairBuffer += state.dump;
			if (explicitPair) pairBuffer += generateNextLine(state, level);
			if (!writeNode(state, level + 1, objectValue, true, explicitPair)) continue;
			if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) pairBuffer += ":";
			else pairBuffer += ": ";
			pairBuffer += state.dump;
			_result += pairBuffer;
		}
		state.tag = _tag;
		state.dump = _result || "{}";
	}
	function detectType(state, object, explicit) {
		var _result, typeList = explicit ? state.explicitTypes : state.implicitTypes, index, length, type, style;
		for (index = 0, length = typeList.length; index < length; index += 1) {
			type = typeList[index];
			if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
				state.tag = explicit ? type.tag : "?";
				if (type.represent) {
					style = state.styleMap[type.tag] || type.defaultStyle;
					if (_toString.call(type.represent) === "[object Function]") _result = type.represent(object, style);
					else if (_hasOwnProperty.call(type.represent, style)) _result = type.represent[style](object, style);
					else throw new YAMLException("!<" + type.tag + "> tag resolver accepts not \"" + style + "\" style");
					state.dump = _result;
				}
				return true;
			}
		}
		return false;
	}
	function writeNode(state, level, object, block, compact, iskey) {
		state.tag = null;
		state.dump = object;
		if (!detectType(state, object, false)) detectType(state, object, true);
		var type = _toString.call(state.dump);
		if (block) block = state.flowLevel < 0 || state.flowLevel > level;
		var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
		if (objectOrArray) {
			duplicateIndex = state.duplicates.indexOf(object);
			duplicate = duplicateIndex !== -1;
		}
		if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) compact = false;
		if (duplicate && state.usedDuplicates[duplicateIndex]) state.dump = "*ref_" + duplicateIndex;
		else {
			if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) state.usedDuplicates[duplicateIndex] = true;
			if (type === "[object Object]") if (block && Object.keys(state.dump).length !== 0) {
				writeBlockMapping(state, level, state.dump, compact);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
			} else {
				writeFlowMapping(state, level, state.dump);
				if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
			}
			else if (type === "[object Array]") {
				var arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
				if (block && state.dump.length !== 0) {
					writeBlockSequence(state, arrayLevel, state.dump, compact);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + state.dump;
				} else {
					writeFlowSequence(state, arrayLevel, state.dump);
					if (duplicate) state.dump = "&ref_" + duplicateIndex + " " + state.dump;
				}
			} else if (type === "[object String]") {
				if (state.tag !== "?") writeScalar(state, state.dump, level, iskey);
			} else {
				if (state.skipInvalid) return false;
				throw new YAMLException("unacceptable kind of an object to dump " + type);
			}
			if (state.tag !== null && state.tag !== "?") state.dump = "!<" + state.tag + "> " + state.dump;
		}
		return true;
	}
	function getDuplicateReferences(object, state) {
		var objects = [], duplicatesIndexes = [], index, length;
		inspectNode(object, objects, duplicatesIndexes);
		for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) state.duplicates.push(objects[duplicatesIndexes[index]]);
		state.usedDuplicates = new Array(length);
	}
	function inspectNode(object, objects, duplicatesIndexes) {
		var objectKeyList, index, length;
		if (object !== null && typeof object === "object") {
			index = objects.indexOf(object);
			if (index !== -1) {
				if (duplicatesIndexes.indexOf(index) === -1) duplicatesIndexes.push(index);
			} else {
				objects.push(object);
				if (Array.isArray(object)) for (index = 0, length = object.length; index < length; index += 1) inspectNode(object[index], objects, duplicatesIndexes);
				else {
					objectKeyList = Object.keys(object);
					for (index = 0, length = objectKeyList.length; index < length; index += 1) inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
				}
			}
		}
	}
	function dump(input, options) {
		options = options || {};
		var state = new State(options);
		if (!state.noRefs) getDuplicateReferences(input, state);
		if (writeNode(state, 0, input, true, true)) return state.dump + "\n";
		return "";
	}
	function safeDump(input, options) {
		return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options));
	}
	module.exports.dump = dump;
	module.exports.safeDump = safeDump;
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml.js
var require_js_yaml$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var loader = require_loader();
	var dumper = require_dumper();
	function deprecated(name) {
		return function() {
			throw new Error("Function " + name + " is deprecated and cannot be used.");
		};
	}
	module.exports.Type = require_type();
	module.exports.Schema = require_schema();
	module.exports.FAILSAFE_SCHEMA = require_failsafe();
	module.exports.JSON_SCHEMA = require_json();
	module.exports.CORE_SCHEMA = require_core();
	module.exports.DEFAULT_SAFE_SCHEMA = require_default_safe();
	module.exports.DEFAULT_FULL_SCHEMA = require_default_full();
	module.exports.load = loader.load;
	module.exports.loadAll = loader.loadAll;
	module.exports.safeLoad = loader.safeLoad;
	module.exports.safeLoadAll = loader.safeLoadAll;
	module.exports.dump = dumper.dump;
	module.exports.safeDump = dumper.safeDump;
	module.exports.YAMLException = require_exception();
	module.exports.MINIMAL_SCHEMA = require_failsafe();
	module.exports.SAFE_SCHEMA = require_default_safe();
	module.exports.DEFAULT_SCHEMA = require_default_full();
	module.exports.scan = deprecated("scan");
	module.exports.parse = deprecated("parse");
	module.exports.compose = deprecated("compose");
	module.exports.addConstructor = deprecated("addConstructor");
}));
//#endregion
//#region node_modules/gray-matter/node_modules/js-yaml/index.js
var require_js_yaml = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_js_yaml$1();
}));
//#endregion
//#region node_modules/gray-matter/lib/engines.js
var require_engines = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var yaml = require_js_yaml();
	/**
	* Default engines
	*/
	var engines = exports = module.exports;
	/**
	* YAML
	*/
	engines.yaml = {
		parse: yaml.safeLoad.bind(yaml),
		stringify: yaml.safeDump.bind(yaml)
	};
	/**
	* JSON
	*/
	engines.json = {
		parse: JSON.parse.bind(JSON),
		stringify: function(obj, options) {
			const opts = Object.assign({
				replacer: null,
				space: 2
			}, options);
			return JSON.stringify(obj, opts.replacer, opts.space);
		}
	};
	/**
	* JavaScript
	*/
	engines.javascript = {
		parse: function parse(str, options, wrap) {
			try {
				if (wrap !== false) str = "(function() {\nreturn " + str.trim() + ";\n}());";
				return eval(str) || {};
			} catch (err) {
				if (wrap !== false && /(unexpected|identifier)/i.test(err.message)) return parse(str, options, false);
				throw new SyntaxError(err);
			}
		},
		stringify: function() {
			throw new Error("stringifying JavaScript is not supported");
		}
	};
}));
//#endregion
//#region node_modules/strip-bom-string/index.js
/*!
* strip-bom-string <https://github.com/jonschlinkert/strip-bom-string>
*
* Copyright (c) 2015, 2017, Jon Schlinkert.
* Released under the MIT License.
*/
var require_strip_bom_string = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(str) {
		if (typeof str === "string" && str.charAt(0) === "﻿") return str.slice(1);
		return str;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stripBom = require_strip_bom_string();
	var typeOf = require_kind_of();
	exports.define = function(obj, key, val) {
		Reflect.defineProperty(obj, key, {
			enumerable: false,
			configurable: true,
			writable: true,
			value: val
		});
	};
	/**
	* Returns true if `val` is a buffer
	*/
	exports.isBuffer = function(val) {
		return typeOf(val) === "buffer";
	};
	/**
	* Returns true if `val` is an object
	*/
	exports.isObject = function(val) {
		return typeOf(val) === "object";
	};
	/**
	* Cast `input` to a buffer
	*/
	exports.toBuffer = function(input) {
		return typeof input === "string" ? Buffer.from(input) : input;
	};
	/**
	* Cast `val` to a string.
	*/
	exports.toString = function(input) {
		if (exports.isBuffer(input)) return stripBom(String(input));
		if (typeof input !== "string") throw new TypeError("expected input to be a string or buffer");
		return stripBom(input);
	};
	/**
	* Cast `val` to an array.
	*/
	exports.arrayify = function(val) {
		return val ? Array.isArray(val) ? val : [val] : [];
	};
	/**
	* Returns true if `str` starts with `substr`.
	*/
	exports.startsWith = function(str, substr, len) {
		if (typeof len !== "number") len = substr.length;
		return str.slice(0, len) === substr;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/defaults.js
var require_defaults = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var engines = require_engines();
	var utils = require_utils();
	module.exports = function(options) {
		const opts = Object.assign({}, options);
		opts.delimiters = utils.arrayify(opts.delims || opts.delimiters || "---");
		if (opts.delimiters.length === 1) opts.delimiters.push(opts.delimiters[0]);
		opts.language = (opts.language || opts.lang || "yaml").toLowerCase();
		opts.engines = Object.assign({}, engines, opts.parsers, opts.engines);
		return opts;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/engine.js
var require_engine = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(name, options) {
		let engine = options.engines[name] || options.engines[aliase(name)];
		if (typeof engine === "undefined") throw new Error("gray-matter engine \"" + name + "\" is not registered");
		if (typeof engine === "function") engine = { parse: engine };
		return engine;
	};
	function aliase(name) {
		switch (name.toLowerCase()) {
			case "js":
			case "javascript": return "javascript";
			case "coffee":
			case "coffeescript":
			case "cson": return "coffee";
			case "yaml":
			case "yml": return "yaml";
			default: return name;
		}
	}
}));
//#endregion
//#region node_modules/gray-matter/lib/stringify.js
var require_stringify = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var typeOf = require_kind_of();
	var getEngine = require_engine();
	var defaults = require_defaults();
	module.exports = function(file, data, options) {
		if (data == null && options == null) switch (typeOf(file)) {
			case "object":
				data = file.data;
				options = {};
				break;
			case "string": return file;
			default: throw new TypeError("expected file to be a string or object");
		}
		const str = file.content;
		const opts = defaults(options);
		if (data == null) {
			if (!opts.data) return file;
			data = opts.data;
		}
		const language = file.language || opts.language;
		const engine = getEngine(language, opts);
		if (typeof engine.stringify !== "function") throw new TypeError("expected \"" + language + ".stringify\" to be a function");
		data = Object.assign({}, file.data, data);
		const open = opts.delimiters[0];
		const close = opts.delimiters[1];
		const matter = engine.stringify(data, options).trim();
		let buf = "";
		if (matter !== "{}") buf = newline(open) + newline(matter) + newline(close);
		if (typeof file.excerpt === "string" && file.excerpt !== "") {
			if (str.indexOf(file.excerpt.trim()) === -1) buf += newline(file.excerpt) + newline(close);
		}
		return buf + newline(str);
	};
	function newline(str) {
		return str.slice(-1) !== "\n" ? str + "\n" : str;
	}
}));
//#endregion
//#region node_modules/gray-matter/lib/excerpt.js
var require_excerpt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var defaults = require_defaults();
	module.exports = function(file, options) {
		const opts = defaults(options);
		if (file.data == null) file.data = {};
		if (typeof opts.excerpt === "function") return opts.excerpt(file, opts);
		const sep = file.data.excerpt_separator || opts.excerpt_separator;
		if (sep == null && (opts.excerpt === false || opts.excerpt == null)) return file;
		const delimiter = typeof opts.excerpt === "string" ? opts.excerpt : sep || opts.delimiters[0];
		const idx = file.content.indexOf(delimiter);
		if (idx !== -1) file.excerpt = file.content.slice(0, idx);
		return file;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/to-file.js
var require_to_file = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var typeOf = require_kind_of();
	var stringify = require_stringify();
	var utils = require_utils();
	/**
	* Normalize the given value to ensure an object is returned
	* with the expected properties.
	*/
	module.exports = function(file) {
		if (typeOf(file) !== "object") file = { content: file };
		if (typeOf(file.data) !== "object") file.data = {};
		if (file.contents && file.content == null) file.content = file.contents;
		utils.define(file, "orig", utils.toBuffer(file.content));
		utils.define(file, "language", file.language || "");
		utils.define(file, "matter", file.matter || "");
		utils.define(file, "stringify", function(data, options) {
			if (options && options.language) file.language = options.language;
			return stringify(file, data, options);
		});
		file.content = utils.toString(file.content);
		file.isEmpty = false;
		file.excerpt = "";
		return file;
	};
}));
//#endregion
//#region node_modules/gray-matter/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var getEngine = require_engine();
	var defaults = require_defaults();
	module.exports = function(language, str, options) {
		const opts = defaults(options);
		const engine = getEngine(language, opts);
		if (typeof engine.parse !== "function") throw new TypeError("expected \"" + language + ".parse\" to be a function");
		return engine.parse(str, opts);
	};
}));
//#endregion
//#region node_modules/gray-matter/index.js
var require_gray_matter = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var fs$1 = __require("fs");
	var sections = require_section_matter();
	var defaults = require_defaults();
	var stringify = require_stringify();
	var excerpt = require_excerpt();
	var engines = require_engines();
	var toFile = require_to_file();
	var parse = require_parse();
	var utils = require_utils();
	/**
	* Takes a string or object with `content` property, extracts
	* and parses front-matter from the string, then returns an object
	* with `data`, `content` and other [useful properties](#returned-object).
	*
	* ```js
	* const matter = require('gray-matter');
	* console.log(matter('---\ntitle: Home\n---\nOther stuff'));
	* //=> { data: { title: 'Home'}, content: 'Other stuff' }
	* ```
	* @param {Object|String} `input` String, or object with `content` string
	* @param {Object} `options`
	* @return {Object}
	* @api public
	*/
	function matter(input, options) {
		if (input === "") return {
			data: {},
			content: input,
			excerpt: "",
			orig: input
		};
		let file = toFile(input);
		const cached = matter.cache[file.content];
		if (!options) {
			if (cached) {
				file = Object.assign({}, cached);
				file.orig = cached.orig;
				return file;
			}
			matter.cache[file.content] = file;
		}
		return parseMatter(file, options);
	}
	/**
	* Parse front matter
	*/
	function parseMatter(file, options) {
		const opts = defaults(options);
		const open = opts.delimiters[0];
		const close = "\n" + opts.delimiters[1];
		let str = file.content;
		if (opts.language) file.language = opts.language;
		const openLen = open.length;
		if (!utils.startsWith(str, open, openLen)) {
			excerpt(file, opts);
			return file;
		}
		if (str.charAt(openLen) === open.slice(-1)) return file;
		str = str.slice(openLen);
		const len = str.length;
		const language = matter.language(str, opts);
		if (language.name) {
			file.language = language.name;
			str = str.slice(language.raw.length);
		}
		let closeIndex = str.indexOf(close);
		if (closeIndex === -1) closeIndex = len;
		file.matter = str.slice(0, closeIndex);
		if (file.matter.replace(/^\s*#[^\n]+/gm, "").trim() === "") {
			file.isEmpty = true;
			file.empty = file.content;
			file.data = {};
		} else file.data = parse(file.language, file.matter, opts);
		if (closeIndex === len) file.content = "";
		else {
			file.content = str.slice(closeIndex + close.length);
			if (file.content[0] === "\r") file.content = file.content.slice(1);
			if (file.content[0] === "\n") file.content = file.content.slice(1);
		}
		excerpt(file, opts);
		if (opts.sections === true || typeof opts.section === "function") sections(file, opts.section);
		return file;
	}
	/**
	* Expose engines
	*/
	matter.engines = engines;
	/**
	* Stringify an object to YAML or the specified language, and
	* append it to the given string. By default, only YAML and JSON
	* can be stringified. See the [engines](#engines) section to learn
	* how to stringify other languages.
	*
	* ```js
	* console.log(matter.stringify('foo bar baz', {title: 'Home'}));
	* // results in:
	* // ---
	* // title: Home
	* // ---
	* // foo bar baz
	* ```
	* @param {String|Object} `file` The content string to append to stringified front-matter, or a file object with `file.content` string.
	* @param {Object} `data` Front matter to stringify.
	* @param {Object} `options` [Options](#options) to pass to gray-matter and [js-yaml].
	* @return {String} Returns a string created by wrapping stringified yaml with delimiters, and appending that to the given string.
	* @api public
	*/
	matter.stringify = function(file, data, options) {
		if (typeof file === "string") file = matter(file, options);
		return stringify(file, data, options);
	};
	/**
	* Synchronously read a file from the file system and parse
	* front matter. Returns the same object as the [main function](#matter).
	*
	* ```js
	* const file = matter.read('./content/blog-post.md');
	* ```
	* @param {String} `filepath` file path of the file to read.
	* @param {Object} `options` [Options](#options) to pass to gray-matter.
	* @return {Object} Returns [an object](#returned-object) with `data` and `content`
	* @api public
	*/
	matter.read = function(filepath, options) {
		const file = matter(fs$1.readFileSync(filepath, "utf8"), options);
		file.path = filepath;
		return file;
	};
	/**
	* Returns true if the given `string` has front matter.
	* @param  {String} `string`
	* @param  {Object} `options`
	* @return {Boolean} True if front matter exists.
	* @api public
	*/
	matter.test = function(str, options) {
		return utils.startsWith(str, defaults(options).delimiters[0]);
	};
	/**
	* Detect the language to use, if one is defined after the
	* first front-matter delimiter.
	* @param  {String} `string`
	* @param  {Object} `options`
	* @return {Object} Object with `raw` (actual language string), and `name`, the language with whitespace trimmed
	*/
	matter.language = function(str, options) {
		const open = defaults(options).delimiters[0];
		if (matter.test(str)) str = str.slice(open.length);
		const language = str.slice(0, str.search(/\r?\n/));
		return {
			raw: language,
			name: language ? language.trim() : ""
		};
	};
	/**
	* Expose `matter`
	*/
	matter.cache = {};
	matter.clearCache = function() {
		matter.cache = {};
	};
	module.exports = matter;
}));
//#endregion
//#region node_modules/ms/index.js
var require_ms = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "weeks":
			case "week":
			case "w": return n * w;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return Math.round(ms / d) + "d";
		if (msAbs >= h) return Math.round(ms / h) + "h";
		if (msAbs >= m) return Math.round(ms / m) + "m";
		if (msAbs >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return plural(ms, msAbs, d, "day");
		if (msAbs >= h) return plural(ms, msAbs, h, "hour");
		if (msAbs >= m) return plural(ms, msAbs, m, "minute");
		if (msAbs >= s) return plural(ms, msAbs, s, "second");
		return ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, msAbs, n, name) {
		var isPlural = msAbs >= n * 1.5;
		return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
}));
//#endregion
//#region node_modules/debug/src/common.js
var require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*/
	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = require_ms();
		createDebug.destroy = destroy;
		Object.keys(env).forEach((key) => {
			createDebug[key] = env[key];
		});
		/**
		* The currently active debug mode names, and names to skip.
		*/
		createDebug.names = [];
		createDebug.skips = [];
		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};
		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;
			for (let i = 0; i < namespace.length; i++) {
				hash = (hash << 5) - hash + namespace.charCodeAt(i);
				hash |= 0;
			}
			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;
		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;
			function debug(...args) {
				if (!debug.enabled) return;
				const self = debug;
				const curr = Number(/* @__PURE__ */ new Date());
				self.diff = curr - (prevTime || curr);
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;
				args[0] = createDebug.coerce(args[0]);
				if (typeof args[0] !== "string") args.unshift("%O");
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					if (match === "%%") return "%";
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === "function") {
						const val = args[index];
						match = formatter.call(self, val);
						args.splice(index, 1);
						index--;
					}
					return match;
				});
				createDebug.formatArgs.call(self, args);
				(self.log || createDebug.log).apply(self, args);
			}
			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy;
			Object.defineProperty(debug, "enabled", {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) return enableOverride;
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}
					return enabledCache;
				},
				set: (v) => {
					enableOverride = v;
				}
			});
			if (typeof createDebug.init === "function") createDebug.init(debug);
			return debug;
		}
		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}
		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;
			createDebug.names = [];
			createDebug.skips = [];
			const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
			else createDebug.names.push(ns);
		}
		/**
		* Checks if the given string matches a namespace template, honoring
		* asterisks as wildcards.
		*
		* @param {String} search
		* @param {String} template
		* @return {Boolean}
		*/
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;
			while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) if (template[templateIndex] === "*") {
				starIndex = templateIndex;
				matchIndex = searchIndex;
				templateIndex++;
			} else {
				searchIndex++;
				templateIndex++;
			}
			else if (starIndex !== -1) {
				templateIndex = starIndex + 1;
				matchIndex++;
				searchIndex = matchIndex;
			} else return false;
			while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
			return templateIndex === template.length;
		}
		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
			createDebug.enable("");
			return namespaces;
		}
		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
			for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
			return false;
		}
		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) return val.stack || val.message;
			return val;
		}
		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		createDebug.enable(createDebug.load());
		return createDebug;
	}
	module.exports = setup;
}));
//#endregion
//#region node_modules/debug/src/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*/
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = localstorage();
	exports.destroy = (() => {
		let warned = false;
		return () => {
			if (!warned) {
				warned = true;
				console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
			}
		};
	})();
	/**
	* Colors.
	*/
	exports.colors = [
		"#0000CC",
		"#0000FF",
		"#0033CC",
		"#0033FF",
		"#0066CC",
		"#0066FF",
		"#0099CC",
		"#0099FF",
		"#00CC00",
		"#00CC33",
		"#00CC66",
		"#00CC99",
		"#00CCCC",
		"#00CCFF",
		"#3300CC",
		"#3300FF",
		"#3333CC",
		"#3333FF",
		"#3366CC",
		"#3366FF",
		"#3399CC",
		"#3399FF",
		"#33CC00",
		"#33CC33",
		"#33CC66",
		"#33CC99",
		"#33CCCC",
		"#33CCFF",
		"#6600CC",
		"#6600FF",
		"#6633CC",
		"#6633FF",
		"#66CC00",
		"#66CC33",
		"#9900CC",
		"#9900FF",
		"#9933CC",
		"#9933FF",
		"#99CC00",
		"#99CC33",
		"#CC0000",
		"#CC0033",
		"#CC0066",
		"#CC0099",
		"#CC00CC",
		"#CC00FF",
		"#CC3300",
		"#CC3333",
		"#CC3366",
		"#CC3399",
		"#CC33CC",
		"#CC33FF",
		"#CC6600",
		"#CC6633",
		"#CC9900",
		"#CC9933",
		"#CCCC00",
		"#CCCC33",
		"#FF0000",
		"#FF0033",
		"#FF0066",
		"#FF0099",
		"#FF00CC",
		"#FF00FF",
		"#FF3300",
		"#FF3333",
		"#FF3366",
		"#FF3399",
		"#FF33CC",
		"#FF33FF",
		"#FF6600",
		"#FF6633",
		"#FF9900",
		"#FF9933",
		"#FFCC00",
		"#FFCC33"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return true;
		if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
		let m;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		if (!this.useColors) return;
		const c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		let index = 0;
		let lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, (match) => {
			if (match === "%%") return;
			index++;
			if (match === "%c") lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.debug()` when available.
	* No-op when `console.debug` is not a "function".
	* If `console.debug` is not available, falls back
	* to `console.log`.
	*
	* @api public
	*/
	exports.log = console.debug || console.log || (() => {});
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (namespaces) exports.storage.setItem("debug", namespaces);
			else exports.storage.removeItem("debug");
		} catch (error) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		let r;
		try {
			r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
		} catch (error) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return localStorage;
		} catch (error) {}
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (error) {
			return "[UnexpectedJSONParseError]: " + error.message;
		}
	};
}));
//#endregion
//#region node_modules/has-flag/index.js
var require_has_flag = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = (flag, argv = process.argv) => {
		const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
		const position = argv.indexOf(prefix + flag);
		const terminatorPosition = argv.indexOf("--");
		return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
	};
}));
//#endregion
//#region node_modules/supports-color/index.js
var require_supports_color = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var os = __require("os");
	var tty$1 = __require("tty");
	var hasFlag = require_has_flag();
	var { env } = process;
	var forceColor;
	if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) forceColor = 0;
	else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) forceColor = 1;
	if ("FORCE_COLOR" in env) if (env.FORCE_COLOR === "true") forceColor = 1;
	else if (env.FORCE_COLOR === "false") forceColor = 0;
	else forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	function translateLevel(level) {
		if (level === 0) return false;
		return {
			level,
			hasBasic: true,
			has256: level >= 2,
			has16m: level >= 3
		};
	}
	function supportsColor(haveStream, streamIsTTY) {
		if (forceColor === 0) return 0;
		if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) return 3;
		if (hasFlag("color=256")) return 2;
		if (haveStream && !streamIsTTY && forceColor === void 0) return 0;
		const min = forceColor || 0;
		if (env.TERM === "dumb") return min;
		if (process.platform === "win32") {
			const osRelease = os.release().split(".");
			if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) return Number(osRelease[2]) >= 14931 ? 3 : 2;
			return 1;
		}
		if ("CI" in env) {
			if ([
				"TRAVIS",
				"CIRCLECI",
				"APPVEYOR",
				"GITLAB_CI",
				"GITHUB_ACTIONS",
				"BUILDKITE"
			].some((sign) => sign in env) || env.CI_NAME === "codeship") return 1;
			return min;
		}
		if ("TEAMCITY_VERSION" in env) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
		if (env.COLORTERM === "truecolor") return 3;
		if ("TERM_PROGRAM" in env) {
			const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
			switch (env.TERM_PROGRAM) {
				case "iTerm.app": return version >= 3 ? 3 : 2;
				case "Apple_Terminal": return 2;
			}
		}
		if (/-256(color)?$/i.test(env.TERM)) return 2;
		if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) return 1;
		if ("COLORTERM" in env) return 1;
		return min;
	}
	function getSupportLevel(stream) {
		return translateLevel(supportsColor(stream, stream && stream.isTTY));
	}
	module.exports = {
		supportsColor: getSupportLevel,
		stdout: translateLevel(supportsColor(true, tty$1.isatty(1))),
		stderr: translateLevel(supportsColor(true, tty$1.isatty(2)))
	};
}));
//#endregion
//#region node_modules/debug/src/node.js
var require_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var tty = __require("tty");
	var util = __require("util");
	/**
	* This is the Node.js implementation of `debug()`.
	*/
	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	/**
	* Colors.
	*/
	exports.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	try {
		const supportsColor = require_supports_color();
		if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	} catch (error) {}
	/**
	* Build up the default `inspectOpts` object from the environment variables.
	*
	*   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	*/
	exports.inspectOpts = Object.keys(process.env).filter((key) => {
		return /^debug_/i.test(key);
	}).reduce((obj, key) => {
		const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});
		let val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
		else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
		else if (val === "null") val = null;
		else val = Number(val);
		obj[prop] = val;
		return obj;
	}, {});
	/**
	* Is stdout a TTY? Colored output is enabled when `true`.
	*/
	function useColors() {
		return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
	}
	/**
	* Adds ANSI color escape codes if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		const { namespace: name, useColors } = this;
		if (useColors) {
			const c = this.color;
			const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
			const prefix = `  ${colorCode};1m${name} \u001B[0m`;
			args[0] = prefix + args[0].split("\n").join("\n" + prefix);
			args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		} else args[0] = getDate() + name + " " + args[0];
	}
	function getDate() {
		if (exports.inspectOpts.hideDate) return "";
		return (/* @__PURE__ */ new Date()).toISOString() + " ";
	}
	/**
	* Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
	*/
	function log(...args) {
		return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		if (namespaces) process.env.DEBUG = namespaces;
		else delete process.env.DEBUG;
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		return process.env.DEBUG;
	}
	/**
	* Init logic for `debug` instances.
	*
	* Create a new `inspectOpts` object in case `useColors` is set
	* differently for a particular `debug` instance.
	*/
	function init(debug) {
		debug.inspectOpts = {};
		const keys = Object.keys(exports.inspectOpts);
		for (let i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
	module.exports = require_common()(exports);
	var { formatters } = module.exports;
	/**
	* Map %o to `util.inspect()`, all on a single line.
	*/
	formatters.o = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
	};
	/**
	* Map %O to `util.inspect()`, allowing multiple lines if needed.
	*/
	formatters.O = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	};
}));
//#endregion
//#region node_modules/debug/src/index.js
var require_src$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Detect Electron renderer / nwjs process, which is node, but we should
	* treat as a browser.
	*/
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) module.exports = require_browser();
	else module.exports = require_node();
}));
//#endregion
//#region node_modules/@kwsites/file-exists/dist/src/index.js
var require_src = /* @__PURE__ */ __commonJSMin(((exports) => {
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	var fs_1 = __require("fs");
	var log = __importDefault(require_src$1()).default("@kwsites/file-exists");
	function check(path, isFile, isDirectory) {
		log(`checking %s`, path);
		try {
			const stat = fs_1.statSync(path);
			if (stat.isFile() && isFile) {
				log(`[OK] path represents a file`);
				return true;
			}
			if (stat.isDirectory() && isDirectory) {
				log(`[OK] path represents a directory`);
				return true;
			}
			log(`[FAIL] path represents something other than a file or directory`);
			return false;
		} catch (e) {
			if (e.code === "ENOENT") {
				log(`[FAIL] path is not accessible: %o`, e);
				return false;
			}
			log(`[FATAL] %o`, e);
			throw e;
		}
	}
	/**
	* Synchronous validation of a path existing either as a file or as a directory.
	*
	* @param {string} path The path to check
	* @param {number} type One or both of the exported numeric constants
	*/
	function exists(path, type = exports.READABLE) {
		return check(path, (type & exports.FILE) > 0, (type & exports.FOLDER) > 0);
	}
	exports.exists = exists;
	/**
	* Constant representing a file
	*/
	exports.FILE = 1;
	/**
	* Constant representing a folder
	*/
	exports.FOLDER = 2;
	/**
	* Constant representing either a file or a folder
	*/
	exports.READABLE = exports.FILE + exports.FOLDER;
}));
//#endregion
//#region node_modules/@kwsites/file-exists/dist/index.js
var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	function __export(m) {
		for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	}
	Object.defineProperty(exports, "__esModule", { value: true });
	__export(require_src());
}));
//#endregion
//#region node_modules/@simple-git/args-pathspec/dist/index.mjs
var import_gray_matter = /* @__PURE__ */ __toESM(require_gray_matter(), 1);
var import_dist = require_dist$1();
var t = /* @__PURE__ */ new WeakMap();
function c$1(...n) {
	const e = new String(n);
	return t.set(e, n), e;
}
function r(n) {
	return n instanceof String && t.has(n);
}
function o(n) {
	return t.get(n) ?? [];
}
//#endregion
//#region node_modules/@kwsites/promise-deferred/dist/index.js
var require_dist = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.createDeferred = exports.deferred = void 0;
	/**
	* Creates a new `DeferredPromise`
	*
	* ```typescript
	import {deferred} from '@kwsites/promise-deferred`;
	```
	*/
	function deferred() {
		let done;
		let fail;
		let status = "pending";
		return {
			promise: new Promise((_done, _fail) => {
				done = _done;
				fail = _fail;
			}),
			done(result) {
				if (status === "pending") {
					status = "resolved";
					done(result);
				}
			},
			fail(error) {
				if (status === "pending") {
					status = "rejected";
					fail(error);
				}
			},
			get fulfilled() {
				return status !== "pending";
			},
			get status() {
				return status;
			}
		};
	}
	exports.deferred = deferred;
	/**
	* Alias of the exported `deferred` function, to help consumers wanting to use `deferred` as the
	* local variable name rather than the factory import name, without needing to rename on import.
	*
	* ```typescript
	import {createDeferred} from '@kwsites/promise-deferred`;
	```
	*/
	exports.createDeferred = deferred;
}));
//#endregion
//#region node_modules/@simple-git/argv-parser/dist/index.mjs
var import_src = /* @__PURE__ */ __toESM(require_src$1());
var import_dist$1 = require_dist();
function* U(e, t) {
	const n = t === "global";
	for (const o of e) o.isGlobal === n && (yield o);
}
var k = /* @__PURE__ */ new Set([
	"--add",
	"--edit",
	"--remove-section",
	"--rename-section",
	"--replace-all",
	"--unset",
	"--unset-all",
	"-e"
]), S = /* @__PURE__ */ new Set([
	"--get",
	"--get-all",
	"--get-color",
	"--get-colorbool",
	"--get-regexp",
	"--get-urlmatch",
	"--list",
	"-l"
]), P = /* @__PURE__ */ new Set([
	"edit",
	"remove-section",
	"rename-section",
	"set",
	"unset"
]), E = /* @__PURE__ */ new Set([
	"get",
	"get-color",
	"get-colorbool",
	"list"
]);
function F(e, t) {
	for (const { name: o } of U(e, "task")) {
		if (k.has(o)) return p(!0, t);
		if (S.has(o)) return p(!1, t);
	}
	const n = t.at(0)?.toLowerCase();
	return n === void 0 ? null : P.has(n) ? p(!0, t.slice(1)) : E.has(n) ? p(!1, t.slice(1)) : t.length === 1 ? p(!1, t) : p(!0, t);
}
function p(e = !1, t = []) {
	const n = t.at(0)?.toLowerCase();
	return n === void 0 ? null : {
		isWrite: e,
		isRead: !e,
		key: n,
		value: t.at(1)
	};
}
function A(e, t) {
	return t.isWrite && t.value !== void 0 ? {
		key: t.key,
		value: t.value,
		scope: e
	} : {
		key: t.key,
		scope: e
	};
}
function M(e) {
	const t = e?.indexOf("=") || -1;
	return !e || t < 0 ? null : {
		key: e.slice(0, t).trim().toLowerCase(),
		value: e.slice(t + 1)
	};
}
function N(e) {
	for (const { name: t } of U(e, "task")) switch (t) {
		case "--global": return "global";
		case "--system": return "system";
		case "--worktree": return "worktree";
		case "--local": return "local";
		case "--file":
		case "-f": return "file";
	}
	return "local";
}
function G({ name: e }) {
	if (e === "-c" || e === "--config") return "inline";
	if (e === "--config-env") return "env";
}
function* O(e) {
	for (const t of e) {
		const n = G(t), o = n && M(t.value);
		o && (yield {
			...o,
			scope: n
		});
	}
}
function L(e, t, n) {
	const o = {
		read: [],
		write: [...O(t)]
	};
	return e === "config" && $(o, N(t), F(t, n)), o;
}
function $(e, t, n) {
	if (n === null) return;
	const o = A(t, n);
	n.isWrite ? e.write.push(o) : e.read.push(o);
}
var x = { short: /* @__PURE__ */ new Map([["c", !0]]) }, D = {
	short: new Map([
		["C", !0],
		["P", !1],
		["h", !1],
		["p", !1],
		["v", !1],
		...x.short.entries()
	]),
	long: /* @__PURE__ */ new Set([
		"attr-source",
		"config-env",
		"exec-path",
		"git-dir",
		"list-cmds",
		"namespace",
		"super-prefix",
		"work-tree"
	])
}, R = {
	clone: {
		short: /* @__PURE__ */ new Map([
			["b", !0],
			["j", !0],
			["l", !1],
			["n", !1],
			["o", !0],
			["q", !1],
			["s", !1],
			["u", !0]
		]),
		long: /* @__PURE__ */ new Set([
			"branch",
			"config",
			"jobs",
			"origin",
			"upload-pack",
			"u",
			"template"
		])
	},
	commit: {
		short: /* @__PURE__ */ new Map([
			["C", !0],
			["F", !0],
			["c", !0],
			["m", !0],
			["t", !0]
		]),
		long: /* @__PURE__ */ new Set([
			"file",
			"message",
			"reedit-message",
			"reuse-message",
			"template"
		])
	},
	config: {
		short: /* @__PURE__ */ new Map([
			["e", !1],
			["f", !0],
			["l", !1]
		]),
		long: /* @__PURE__ */ new Set([
			"blob",
			"comment",
			"default",
			"file",
			"type",
			"value"
		])
	},
	fetch: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["upload-pack"])
	},
	init: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["template"])
	},
	pull: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["upload-pack"])
	},
	push: {
		short: /* @__PURE__ */ new Map(),
		long: /* @__PURE__ */ new Set(["exec", "receive-pack"])
	}
}, T = {
	short: /* @__PURE__ */ new Map(),
	long: /* @__PURE__ */ new Set()
};
function I(e) {
	const t = R[e ?? ""] ?? T;
	return {
		short: new Map([...x.short.entries(), ...t.short.entries()]),
		long: t.long
	};
}
function b(e, t = D) {
	if (e.startsWith("--")) {
		const n = e.indexOf("=");
		if (n > 2) return [{
			name: e.slice(0, n),
			value: e.slice(n + 1),
			needsNext: !1
		}];
		const o = e.slice(2);
		return [{
			name: e,
			needsNext: t.long.has(o)
		}];
	}
	if (e.length === 2) {
		const n = e.charAt(1);
		return [{
			name: e,
			needsNext: t.short.get(n) === !0
		}];
	}
	return W(e, t.short);
}
function W(e, t) {
	const n = e.slice(1).split(""), o = [];
	for (let s = 0; s < n.length; s++) {
		const r = n[s], l = t.get(r);
		if (l === void 0) return [{
			name: e,
			needsNext: !1
		}];
		if (l) {
			const a = n.slice(s + 1).join("");
			if (a && ![...a].every((w) => t.has(w))) return o.push({
				name: `-${r}`,
				value: a,
				needsNext: !1
			}), o;
		}
		o.push({
			name: `-${r}`,
			needsNext: l
		});
	}
	return o;
}
function j(e, t = []) {
	let n = 0;
	for (; n < e.length;) {
		const o = String(e[n]);
		if (!o.startsWith("-") || o.length < 2) break;
		const s = b(o);
		let r = n + 1;
		for (const l of s) {
			const a = {
				name: l.name,
				value: l.value,
				absorbedNext: !1,
				isGlobal: !0
			};
			l.needsNext && a.value === void 0 && r < e.length && (a.value = String(e[r]), a.absorbedNext = !0, r++), t.push(a);
		}
		n = r;
	}
	return {
		flags: t,
		taskIndex: n
	};
}
function B(e, t, n = []) {
	const o$1 = I(t), s = [], r$1 = [];
	let l = 0;
	for (; l < e.length;) {
		const a = e[l];
		if (r(a)) {
			r$1.push(...o(a)), l++;
			continue;
		}
		const f = String(a);
		if (f === "--") {
			for (let g = l + 1; g < e.length; g++) {
				const u = e[g];
				r(u) ? r$1.push(...o(u)) : r$1.push(String(u));
			}
			break;
		}
		if (!f.startsWith("-") || f.length < 2) {
			s.push(f), l++;
			continue;
		}
		const w = b(f, o$1);
		let d = l + 1;
		for (const g of w) {
			const u = {
				name: g.name,
				value: g.value,
				absorbedNext: !1,
				isGlobal: !1
			};
			g.needsNext && u.value === void 0 && d < e.length && !r(e[d]) && (u.value = String(e[d]), u.absorbedNext = !0, d++), n.push(u);
		}
		l = d;
	}
	return {
		flags: n,
		positionals: s,
		pathspecs: r$1
	};
}
function* V({ write: e }) {
	for (const t of e) for (const n of q) {
		const o = n(t.key);
		o && (yield o);
	}
}
function c(e, t, n = String(e)) {
	const o = typeof e == "string" ? new RegExp(`\\s*${e.toLowerCase()}`) : e;
	return function(r) {
		if (o.test(r)) return {
			category: t,
			message: `Configuring ${n} is not permitted without enabling ${t}`
		};
	};
}
function i(e, t) {
	return c(new RegExp(`\\s*${e.toLowerCase().replace(/\./g, "(..+)?.")}`), t, e);
}
var q = [
	c("alias", "allowUnsafeAlias"),
	c("core.askPass", "allowUnsafeAskPass"),
	c("core.editor", "allowUnsafeEditor"),
	c("core.fsmonitor", "allowUnsafeFsMonitor"),
	c("core.gitProxy", "allowUnsafeGitProxy"),
	c("core.hooksPath", "allowUnsafeHooksPath"),
	c("core.pager", "allowUnsafePager"),
	c("core.sshCommand", "allowUnsafeSshCommand"),
	i("credential.helper", "allowUnsafeCredentialHelper"),
	i("diff.command", "allowUnsafeDiffExternal"),
	c("diff.external", "allowUnsafeDiffExternal"),
	i("diff.textconv", "allowUnsafeDiffTextConv"),
	i("filter.clean", "allowUnsafeFilter"),
	i("filter.smudge", "allowUnsafeFilter"),
	i("gpg.program", "allowUnsafeGpgProgram"),
	c("init.templateDir", "allowUnsafeTemplateDir"),
	i("merge.driver", "allowUnsafeMergeDriver"),
	i("mergetool.path", "allowUnsafeMergeDriver"),
	i("mergetool.cmd", "allowUnsafeMergeDriver"),
	i("protocol.allow", "allowUnsafeProtocolOverride"),
	i("remote.receivepack", "allowUnsafePack"),
	i("remote.uploadpack", "allowUnsafePack"),
	c("sequence.editor", "allowUnsafeEditor")
];
function* K(e, t) {
	for (const n of t) for (const o of H) {
		const s = o(e, n.name);
		s && (yield s);
	}
}
function h(e, t, n, o = String(t)) {
	const s = typeof t == "string" ? new RegExp(`\\s*${t.toLowerCase()}`) : t, r = `Use of ${e ? `${e} with option ` : ""}${o} is not permitted without enabling ${n}`;
	return function(a, f) {
		if ((!e || a === e) && s.test(f)) return {
			category: n,
			message: r
		};
	};
}
var H = [
	h(null, /--(upload|receive)-pack/, "allowUnsafePack", "--upload-pack or --receive-pack"),
	h("clone", /^-\w*u/, "allowUnsafePack"),
	h("clone", "--u", "allowUnsafePack"),
	h("push", "--exec", "allowUnsafePack"),
	h(null, "--template", "allowUnsafeTemplateDir")
];
function C(e, t, n) {
	return [...K(e, t), ...V(n)];
}
function Y(...e) {
	const { flags: t, taskIndex: n } = j(e), o = n < e.length ? String(e[n]).toLowerCase() : null, { positionals: r, pathspecs: l } = B(o !== null ? e.slice(n + 1) : [], o, t), a = L(o, t, r);
	return {
		task: o,
		flags: t.map(J),
		paths: l,
		config: a,
		vulnerabilities: z(C(o, t, a))
	};
}
function z(e) {
	return Object.defineProperty(e, "vulnerabilities", { value: e });
}
function J({ value: e, name: t }) {
	return e !== void 0 ? {
		name: t,
		value: e
	} : { name: t };
}
var y = {
	editor: "allowUnsafeEditor",
	git_askpass: "allowUnsafeAskPass",
	git_config_global: "allowUnsafeConfigPaths",
	git_config_system: "allowUnsafeConfigPaths",
	git_config_count: "allowUnsafeConfigEnvCount",
	git_config: "allowUnsafeConfigPaths",
	git_editor: "allowUnsafeEditor",
	git_exec_path: "allowUnsafeConfigPaths",
	git_external_diff: "allowUnsafeDiffExternal",
	git_pager: "allowUnsafePager",
	git_proxy_command: "allowUnsafeGitProxy",
	git_template_dir: "allowUnsafeTemplateDir",
	git_sequence_editor: "allowUnsafeEditor",
	git_ssh: "allowUnsafeSshCommand",
	git_ssh_command: "allowUnsafeSshCommand",
	pager: "allowUnsafePager",
	prefix: "allowUnsafeConfigPaths",
	ssh_askpass: "allowUnsafeAskPass"
};
function* Q(e) {
	const t = parseInt(e.git_config_count ?? "0", 10);
	for (let n = 0; n < t; n++) {
		const o = e[`git_config_key_${n}`], s = e[`git_config_value_${n}`];
		o !== void 0 && (yield {
			key: o.toLowerCase().trim(),
			value: s,
			scope: "env"
		});
	}
}
function* X(e) {
	for (const t of Object.keys(e)) if (_(t)) {
		const n = y[t];
		yield {
			category: n,
			message: `Use of "${t.toUpperCase()}" is not permitted without enabling ${n}`
		};
	}
}
function _(e) {
	return Object.hasOwn(y, e);
}
function Z(e) {
	const t = {};
	for (const [n, o] of Object.entries(e)) {
		const s = n.toLowerCase().trim();
		(_(s) || s.startsWith("git")) && (t[s] = String(o));
	}
	return t;
}
function ee(e) {
	const t = Z(e), n = {
		read: [],
		write: [...Q(t)]
	};
	return {
		config: n,
		vulnerabilities: [...X(t), ...C(null, [], n)]
	};
}
function ne(e, t) {
	return [...Y(...e).vulnerabilities, ...ee(t).vulnerabilities];
}
//#endregion
//#region node_modules/simple-git/dist/esm/index.js
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
	return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: () => from[key],
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var GitError;
var init_git_error = __esm({ "src/lib/errors/git-error.ts"() {
	"use strict";
	GitError = class extends Error {
		constructor(task, message) {
			super(message);
			this.task = task;
			Object.setPrototypeOf(this, new.target.prototype);
		}
	};
} });
var GitResponseError;
var init_git_response_error = __esm({ "src/lib/errors/git-response-error.ts"() {
	"use strict";
	init_git_error();
	GitResponseError = class extends GitError {
		constructor(git, message) {
			super(void 0, message || String(git));
			this.git = git;
		}
	};
} });
var TaskConfigurationError;
var init_task_configuration_error = __esm({ "src/lib/errors/task-configuration-error.ts"() {
	"use strict";
	init_git_error();
	TaskConfigurationError = class extends GitError {
		constructor(message) {
			super(void 0, message);
		}
	};
} });
function asFunction(source) {
	if (typeof source !== "function") return NOOP;
	return source;
}
function isUserFunction(source) {
	return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
	const index = input.indexOf(char);
	if (index <= 0) return [input, ""];
	return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
	return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
	if (isArrayLike(input) && input.length > offset) return input[input.length - 1 - offset];
}
function isArrayLike(input) {
	return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = "\n") {
	return input.split(separator).reduce((output, line) => {
		const lineContent = trimmed2 ? line.trim() : line;
		if (lineContent) output.push(lineContent);
		return output;
	}, []);
}
function forEachLineWithContent(input, callback) {
	return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path) {
	return (0, import_dist.exists)(path, import_dist.FOLDER);
}
function append(target, item) {
	if (Array.isArray(target)) {
		if (!target.includes(item)) target.push(item);
	} else target.add(item);
	return item;
}
function including(target, item) {
	if (Array.isArray(target) && !target.includes(item)) target.push(item);
	return target;
}
function remove(target, item) {
	if (Array.isArray(target)) {
		const index = target.indexOf(item);
		if (index >= 0) target.splice(index, 1);
	} else target.delete(item);
	return item;
}
function asArray(source) {
	return Array.isArray(source) ? source : [source];
}
function asCamelCase(str) {
	return str.replace(/[\s-]+(.)/g, (_all, chr) => {
		return chr.toUpperCase();
	});
}
function asStringArray(source) {
	return asArray(source).map((item) => {
		return item instanceof String ? item : String(item);
	});
}
function asNumber(source, onNaN = 0) {
	if (source == null) return onNaN;
	const num = parseInt(source, 10);
	return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
	const output = [];
	for (let i = 0, max = input.length; i < max; i++) output.push(prefix, input[i]);
	return output;
}
function bufferToString(input) {
	return (Array.isArray(input) ? Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
	const out = {};
	properties.forEach((key) => {
		if (source[key] !== void 0) out[key] = source[key];
	});
	return out;
}
function delay(duration = 0) {
	return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
	if (input === false) return;
	return input;
}
var NULL, NOOP, objectToString;
var init_util = __esm({ "src/lib/utils/util.ts"() {
	"use strict";
	init_argument_filters();
	NULL = "\0";
	NOOP = () => {};
	objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
} });
function filterType(input, filter, def) {
	if (filter(input)) return input;
	return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
	const type = r(input) ? "string" : typeof input;
	return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
	return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
	return typeof input === "function";
}
var filterArray, filterNumber, filterString, filterStringOrStringArray, filterHasLength;
var init_argument_filters = __esm({ "src/lib/utils/argument-filters.ts"() {
	"use strict";
	init_util();
	filterArray = (input) => {
		return Array.isArray(input);
	};
	filterNumber = (input) => {
		return typeof input === "number";
	};
	filterString = (input) => {
		return typeof input === "string" || r(input);
	};
	filterStringOrStringArray = (input) => {
		return filterString(input) || Array.isArray(input) && input.every(filterString);
	};
	filterHasLength = (input) => {
		if (input == null || "number|boolean|function".includes(typeof input)) return false;
		return typeof input.length === "number";
	};
} });
var ExitCodes;
var init_exit_codes = __esm({ "src/lib/utils/exit-codes.ts"() {
	"use strict";
	ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
		ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
		ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
		ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
		ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
		return ExitCodes2;
	})(ExitCodes || {});
} });
var GitOutputStreams;
var init_git_output_streams = __esm({ "src/lib/utils/git-output-streams.ts"() {
	"use strict";
	GitOutputStreams = class _GitOutputStreams {
		constructor(stdOut, stdErr) {
			this.stdOut = stdOut;
			this.stdErr = stdErr;
		}
		asStrings() {
			return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
		}
	};
} });
function useMatchesDefault() {
	throw new Error(`LineParser:useMatches not implemented`);
}
var LineParser, RemoteLineParser;
var init_line_parser = __esm({ "src/lib/utils/line-parser.ts"() {
	"use strict";
	LineParser = class {
		constructor(regExp, useMatches) {
			this.matches = [];
			this.useMatches = useMatchesDefault;
			this.parse = (line, target) => {
				this.resetMatches();
				if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) return false;
				return this.useMatches(target, this.prepareMatches()) !== false;
			};
			this._regExp = Array.isArray(regExp) ? regExp : [regExp];
			if (useMatches) this.useMatches = useMatches;
		}
		resetMatches() {
			this.matches.length = 0;
		}
		prepareMatches() {
			return this.matches;
		}
		addMatch(reg, index, line) {
			const matched = line && reg.exec(line);
			if (matched) this.pushMatch(index, matched);
			return !!matched;
		}
		pushMatch(_index, matched) {
			this.matches.push(...matched.slice(1));
		}
	};
	RemoteLineParser = class extends LineParser {
		addMatch(reg, index, line) {
			return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
		}
		pushMatch(index, matched) {
			if (index > 0 || matched.length > 1) super.pushMatch(index, matched);
		}
	};
} });
function createInstanceConfig(...options) {
	const baseDir = process.cwd();
	const config = Object.assign({
		baseDir,
		...defaultOptions
	}, ...options.filter((o) => typeof o === "object" && o));
	config.baseDir = config.baseDir || baseDir;
	config.trimmed = config.trimmed === true;
	return config;
}
var defaultOptions;
var init_simple_git_options = __esm({ "src/lib/utils/simple-git-options.ts"() {
	"use strict";
	defaultOptions = {
		binary: "git",
		maxConcurrentProcesses: 5,
		config: [],
		trimmed: false
	};
} });
function appendTaskOptions(options, commands = []) {
	if (!filterPlainObject(options)) return commands;
	return Object.keys(options).reduce((commands2, key) => {
		const value = options[key];
		if (r(value)) commands2.push(value);
		else if (filterPrimitives(value, ["boolean"])) commands2.push(key + "=" + value);
		else if (Array.isArray(value)) {
			for (const v of value) if (!filterPrimitives(v, ["string", "number"])) commands2.push(key + "=" + v);
		} else commands2.push(key);
		return commands2;
	}, commands);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
	const command = [];
	for (let i = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i < max; i++) if ("string|number".includes(typeof args[i])) command.push(String(args[i]));
	appendTaskOptions(trailingOptionsArgument(args), command);
	if (!objectOnly) command.push(...trailingArrayArgument(args));
	return command;
}
function trailingArrayArgument(args) {
	return asStringArray(filterType(last(args, typeof last(args) === "function" ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
	return filterType(last(args, filterFunction(last(args)) ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
	const callback = asFunction(last(args));
	return includeNoop || isUserFunction(callback) ? callback : void 0;
}
var init_task_options = __esm({ "src/lib/utils/task-options.ts"() {
	"use strict";
	init_argument_filters();
	init_util();
} });
function callTaskParser(parser4, streams) {
	return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
	asArray(texts).forEach((text) => {
		for (let lines = toLinesWithContent(text, trim), i = 0, max = lines.length; i < max; i++) {
			const line = (offset = 0) => {
				if (i + offset >= max) return;
				return lines[i + offset];
			};
			parsers12.some(({ parse }) => parse(line, result));
		}
	});
	return result;
}
var init_task_parser = __esm({ "src/lib/utils/task-parser.ts"() {
	"use strict";
	init_util();
} });
var utils_exports = {};
__export(utils_exports, {
	ExitCodes: () => ExitCodes,
	GitOutputStreams: () => GitOutputStreams,
	LineParser: () => LineParser,
	NOOP: () => NOOP,
	NULL: () => NULL,
	RemoteLineParser: () => RemoteLineParser,
	append: () => append,
	appendTaskOptions: () => appendTaskOptions,
	asArray: () => asArray,
	asCamelCase: () => asCamelCase,
	asFunction: () => asFunction,
	asNumber: () => asNumber,
	asStringArray: () => asStringArray,
	bufferToString: () => bufferToString,
	callTaskParser: () => callTaskParser,
	createInstanceConfig: () => createInstanceConfig,
	delay: () => delay,
	filterArray: () => filterArray,
	filterFunction: () => filterFunction,
	filterHasLength: () => filterHasLength,
	filterNumber: () => filterNumber,
	filterPlainObject: () => filterPlainObject,
	filterPrimitives: () => filterPrimitives,
	filterString: () => filterString,
	filterStringOrStringArray: () => filterStringOrStringArray,
	filterType: () => filterType,
	first: () => first,
	folderExists: () => folderExists,
	forEachLineWithContent: () => forEachLineWithContent,
	getTrailingOptions: () => getTrailingOptions,
	including: () => including,
	isUserFunction: () => isUserFunction,
	last: () => last,
	objectToString: () => objectToString,
	orVoid: () => orVoid,
	parseStringResponse: () => parseStringResponse,
	pick: () => pick,
	prefixedArray: () => prefixedArray,
	remove: () => remove,
	splitOn: () => splitOn,
	toLinesWithContent: () => toLinesWithContent,
	trailingFunctionArgument: () => trailingFunctionArgument,
	trailingOptionsArgument: () => trailingOptionsArgument
});
var init_utils = __esm({ "src/lib/utils/index.ts"() {
	"use strict";
	init_argument_filters();
	init_exit_codes();
	init_git_output_streams();
	init_line_parser();
	init_simple_git_options();
	init_task_options();
	init_task_parser();
	init_util();
} });
var check_is_repo_exports = {};
__export(check_is_repo_exports, {
	CheckRepoActions: () => CheckRepoActions,
	checkIsBareRepoTask: () => checkIsBareRepoTask,
	checkIsRepoRootTask: () => checkIsRepoRootTask,
	checkIsRepoTask: () => checkIsRepoTask
});
function checkIsRepoTask(action) {
	switch (action) {
		case "bare": return checkIsBareRepoTask();
		case "root": return checkIsRepoRootTask();
	}
	return {
		commands: ["rev-parse", "--is-inside-work-tree"],
		format: "utf-8",
		onError,
		parser
	};
}
function checkIsRepoRootTask() {
	return {
		commands: ["rev-parse", "--git-dir"],
		format: "utf-8",
		onError,
		parser(path) {
			return /^\.(git)?$/.test(path.trim());
		}
	};
}
function checkIsBareRepoTask() {
	return {
		commands: ["rev-parse", "--is-bare-repository"],
		format: "utf-8",
		onError,
		parser
	};
}
function isNotRepoMessage(error) {
	return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
var CheckRepoActions, onError, parser;
var init_check_is_repo = __esm({ "src/lib/tasks/check-is-repo.ts"() {
	"use strict";
	init_utils();
	CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
		CheckRepoActions2["BARE"] = "bare";
		CheckRepoActions2["IN_TREE"] = "tree";
		CheckRepoActions2["IS_REPO_ROOT"] = "root";
		return CheckRepoActions2;
	})(CheckRepoActions || {});
	onError = ({ exitCode }, error, done, fail) => {
		if (exitCode === 128 && isNotRepoMessage(error)) return done(Buffer.from("false"));
		fail(error);
	};
	parser = (text) => {
		return text.trim() === "true";
	};
} });
function cleanSummaryParser(dryRun, text) {
	const summary = new CleanResponse(dryRun);
	const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
	toLinesWithContent(text).forEach((line) => {
		const removed = line.replace(regexp, "");
		summary.paths.push(removed);
		(isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
	});
	return summary;
}
var CleanResponse, removalRegexp, dryRunRemovalRegexp, isFolderRegexp;
var init_CleanSummary = __esm({ "src/lib/responses/CleanSummary.ts"() {
	"use strict";
	init_utils();
	CleanResponse = class {
		constructor(dryRun) {
			this.dryRun = dryRun;
			this.paths = [];
			this.files = [];
			this.folders = [];
		}
	};
	removalRegexp = /^[a-z]+\s*/i;
	dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
	isFolderRegexp = /\/$/;
} });
var task_exports = {};
__export(task_exports, {
	EMPTY_COMMANDS: () => EMPTY_COMMANDS,
	adhocExecTask: () => adhocExecTask,
	configurationErrorTask: () => configurationErrorTask,
	isBufferTask: () => isBufferTask,
	isEmptyTask: () => isEmptyTask,
	straightThroughBufferTask: () => straightThroughBufferTask,
	straightThroughStringTask: () => straightThroughStringTask
});
function adhocExecTask(parser4) {
	return {
		commands: EMPTY_COMMANDS,
		format: "empty",
		parser: parser4
	};
}
function configurationErrorTask(error) {
	return {
		commands: EMPTY_COMMANDS,
		format: "empty",
		parser() {
			throw typeof error === "string" ? new TaskConfigurationError(error) : error;
		}
	};
}
function straightThroughStringTask(commands, trimmed2 = false) {
	return {
		commands,
		format: "utf-8",
		parser(text) {
			return trimmed2 ? String(text).trim() : text;
		}
	};
}
function straightThroughBufferTask(commands) {
	return {
		commands,
		format: "buffer",
		parser(buffer) {
			return buffer;
		}
	};
}
function isBufferTask(task) {
	return task.format === "buffer";
}
function isEmptyTask(task) {
	return task.format === "empty" || !task.commands.length;
}
var EMPTY_COMMANDS;
var init_task = __esm({ "src/lib/tasks/task.ts"() {
	"use strict";
	init_task_configuration_error();
	EMPTY_COMMANDS = [];
} });
var clean_exports = {};
__export(clean_exports, {
	CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
	CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
	CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
	CleanOptions: () => CleanOptions,
	cleanTask: () => cleanTask,
	cleanWithOptionsTask: () => cleanWithOptionsTask,
	isCleanOptionsArray: () => isCleanOptionsArray
});
function cleanWithOptionsTask(mode, customArgs) {
	const { cleanMode, options, valid } = getCleanOptions(mode);
	if (!cleanMode) return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
	if (!valid.options) return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
	options.push(...customArgs);
	if (options.some(isInteractiveMode)) return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
	return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
	return {
		commands: [
			"clean",
			`-${mode}`,
			...customArgs
		],
		format: "utf-8",
		parser(text) {
			return cleanSummaryParser(mode === "n", text);
		}
	};
}
function isCleanOptionsArray(input) {
	return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
	let cleanMode;
	let options = [];
	let valid = {
		cleanMode: false,
		options: true
	};
	input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
		if (isCleanMode(char)) {
			cleanMode = char;
			valid.cleanMode = true;
		} else valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
	});
	return {
		cleanMode,
		options,
		valid
	};
}
function isCleanMode(cleanMode) {
	return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
	return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
	if (/^-[^\-]/.test(option)) return option.indexOf("i") > 0;
	return option === "--interactive";
}
var CONFIG_ERROR_INTERACTIVE_MODE, CONFIG_ERROR_MODE_REQUIRED, CONFIG_ERROR_UNKNOWN_OPTION, CleanOptions, CleanOptionValues;
var init_clean = __esm({ "src/lib/tasks/clean.ts"() {
	"use strict";
	init_CleanSummary();
	init_utils();
	init_task();
	CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
	CONFIG_ERROR_MODE_REQUIRED = "Git clean mode parameter (\"n\" or \"f\") is required";
	CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
	CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
		CleanOptions2["DRY_RUN"] = "n";
		CleanOptions2["FORCE"] = "f";
		CleanOptions2["IGNORED_INCLUDED"] = "x";
		CleanOptions2["IGNORED_ONLY"] = "X";
		CleanOptions2["EXCLUDING"] = "e";
		CleanOptions2["QUIET"] = "q";
		CleanOptions2["RECURSIVE"] = "d";
		return CleanOptions2;
	})(CleanOptions || {});
	CleanOptionValues = /* @__PURE__ */ new Set(["i", ...asStringArray(Object.values(CleanOptions))]);
} });
function configListParser(text) {
	const config = new ConfigList();
	for (const item of configParser(text)) config.addValue(item.file, String(item.key), item.value);
	return config;
}
function configGetParser(text, key) {
	let value = null;
	const values = [];
	const scopes = /* @__PURE__ */ new Map();
	for (const item of configParser(text, key)) {
		if (item.key !== key) continue;
		values.push(value = item.value);
		if (!scopes.has(item.file)) scopes.set(item.file, []);
		scopes.get(item.file).push(value);
	}
	return {
		key,
		paths: Array.from(scopes.keys()),
		scopes,
		value,
		values
	};
}
function configFilePath(filePath) {
	return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
	const lines = text.split("\0");
	for (let i = 0, max = lines.length - 1; i < max;) {
		const file = configFilePath(lines[i++]);
		let value = lines[i++];
		let key = requestedKey;
		if (value.includes("\n")) {
			const line = splitOn(value, "\n");
			key = line[0];
			value = line[1];
		}
		yield {
			file,
			key,
			value
		};
	}
}
var ConfigList;
var init_ConfigList = __esm({ "src/lib/responses/ConfigList.ts"() {
	"use strict";
	init_utils();
	ConfigList = class {
		constructor() {
			this.files = [];
			this.values = /* @__PURE__ */ Object.create(null);
		}
		get all() {
			if (!this._all) this._all = this.files.reduce((all, file) => {
				return Object.assign(all, this.values[file]);
			}, {});
			return this._all;
		}
		addFile(file) {
			if (!(file in this.values)) {
				const latest = last(this.files);
				this.values[file] = latest ? Object.create(this.values[latest]) : {};
				this.files.push(file);
			}
			return this.values[file];
		}
		addValue(file, key, value) {
			const values = this.addFile(file);
			if (!Object.hasOwn(values, key)) values[key] = value;
			else if (Array.isArray(values[key])) values[key].push(value);
			else values[key] = [values[key], value];
			this._all = void 0;
		}
	};
} });
function asConfigScope(scope, fallback) {
	if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) return scope;
	return fallback;
}
function addConfigTask(key, value, append2, scope) {
	const commands = ["config", `--${scope}`];
	if (append2) commands.push("--add");
	commands.push(key, value);
	return {
		commands,
		format: "utf-8",
		parser(text) {
			return text;
		}
	};
}
function getConfigTask(key, scope) {
	const commands = [
		"config",
		"--null",
		"--show-origin",
		"--get-all",
		key
	];
	if (scope) commands.splice(1, 0, `--${scope}`);
	return {
		commands,
		format: "utf-8",
		parser(text) {
			return configGetParser(text, key);
		}
	};
}
function listConfigTask(scope) {
	const commands = [
		"config",
		"--list",
		"--show-origin",
		"--null"
	];
	if (scope) commands.push(`--${scope}`);
	return {
		commands,
		format: "utf-8",
		parser(text) {
			return configListParser(text);
		}
	};
}
function config_default() {
	return {
		addConfig(key, value, ...rest) {
			return this._runTask(addConfigTask(key, value, rest[0] === true, asConfigScope(rest[1], "local")), trailingFunctionArgument(arguments));
		},
		getConfig(key, scope) {
			return this._runTask(getConfigTask(key, asConfigScope(scope, void 0)), trailingFunctionArgument(arguments));
		},
		listConfig(...rest) {
			return this._runTask(listConfigTask(asConfigScope(rest[0], void 0)), trailingFunctionArgument(arguments));
		}
	};
}
var GitConfigScope;
var init_config = __esm({ "src/lib/tasks/config.ts"() {
	"use strict";
	init_ConfigList();
	init_utils();
	GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
		GitConfigScope2["system"] = "system";
		GitConfigScope2["global"] = "global";
		GitConfigScope2["local"] = "local";
		GitConfigScope2["worktree"] = "worktree";
		return GitConfigScope2;
	})(GitConfigScope || {});
} });
function isDiffNameStatus(input) {
	return diffNameStatus.has(input);
}
var DiffNameStatus, diffNameStatus;
var init_diff_name_status = __esm({ "src/lib/tasks/diff-name-status.ts"() {
	"use strict";
	DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
		DiffNameStatus2["ADDED"] = "A";
		DiffNameStatus2["COPIED"] = "C";
		DiffNameStatus2["DELETED"] = "D";
		DiffNameStatus2["MODIFIED"] = "M";
		DiffNameStatus2["RENAMED"] = "R";
		DiffNameStatus2["CHANGED"] = "T";
		DiffNameStatus2["UNMERGED"] = "U";
		DiffNameStatus2["UNKNOWN"] = "X";
		DiffNameStatus2["BROKEN"] = "B";
		return DiffNameStatus2;
	})(DiffNameStatus || {});
	diffNameStatus = new Set(Object.values(DiffNameStatus));
} });
function grepQueryBuilder(...params) {
	return new GrepQuery().param(...params);
}
function parseGrep(grep) {
	const paths = /* @__PURE__ */ new Set();
	const results = {};
	forEachLineWithContent(grep, (input) => {
		const [path, line, preview] = input.split(NULL);
		paths.add(path);
		(results[path] = results[path] || []).push({
			line: asNumber(line),
			path,
			preview
		});
	});
	return {
		paths,
		results
	};
}
function grep_default() {
	return { grep(searchTerm) {
		const then = trailingFunctionArgument(arguments);
		const options = getTrailingOptions(arguments);
		for (const option of disallowedOptions) if (options.includes(option)) return this._runTask(configurationErrorTask(`git.grep: use of "${option}" is not supported.`), then);
		if (typeof searchTerm === "string") searchTerm = grepQueryBuilder().param(searchTerm);
		const commands = [
			"grep",
			"--null",
			"-n",
			"--full-name",
			...options,
			...searchTerm
		];
		return this._runTask({
			commands,
			format: "utf-8",
			parser(stdOut) {
				return parseGrep(stdOut);
			}
		}, then);
	} };
}
var disallowedOptions, Query, _a, GrepQuery;
var init_grep = __esm({ "src/lib/tasks/grep.ts"() {
	"use strict";
	init_utils();
	init_task();
	disallowedOptions = ["-h"];
	Query = Symbol("grepQuery");
	GrepQuery = class {
		constructor() {
			this[_a] = [];
		}
		*[(_a = Query, Symbol.iterator)]() {
			for (const query of this[Query]) yield query;
		}
		and(...and) {
			and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
			return this;
		}
		param(...param) {
			this[Query].push(...prefixedArray(param, "-e"));
			return this;
		}
	};
} });
var reset_exports = {};
__export(reset_exports, {
	ResetMode: () => ResetMode,
	getResetMode: () => getResetMode,
	resetTask: () => resetTask
});
function resetTask(mode, customArgs) {
	const commands = ["reset"];
	if (isValidResetMode(mode)) commands.push(`--${mode}`);
	commands.push(...customArgs);
	return straightThroughStringTask(commands);
}
function getResetMode(mode) {
	if (isValidResetMode(mode)) return mode;
	switch (typeof mode) {
		case "string":
		case "undefined": return "soft";
	}
}
function isValidResetMode(mode) {
	return typeof mode === "string" && validResetModes.includes(mode);
}
var ResetMode, validResetModes;
var init_reset = __esm({ "src/lib/tasks/reset.ts"() {
	"use strict";
	init_utils();
	init_task();
	ResetMode = /* @__PURE__ */ ((ResetMode2) => {
		ResetMode2["MIXED"] = "mixed";
		ResetMode2["SOFT"] = "soft";
		ResetMode2["HARD"] = "hard";
		ResetMode2["MERGE"] = "merge";
		ResetMode2["KEEP"] = "keep";
		return ResetMode2;
	})(ResetMode || {});
	validResetModes = asStringArray(Object.values(ResetMode));
} });
function createLog() {
	return (0, import_src.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
	if (!prefix || !String(prefix).replace(/\s*/, "")) return !forward ? to : (message, ...args) => {
		to(message, ...args);
		forward(message, ...args);
	};
	return (message, ...args) => {
		to(`%s ${message}`, prefix, ...args);
		if (forward) forward(message, ...args);
	};
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
	if (typeof name === "string") return name;
	const childNamespace = childDebugger && childDebugger.namespace || "";
	if (childNamespace.startsWith(parentNamespace)) return childNamespace.substr(parentNamespace.length + 1);
	return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
	const labelPrefix = label && `[${label}]` || "";
	const spawned = [];
	const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
	const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
	return step(initialStep);
	function sibling(name, initial) {
		return append(spawned, createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger));
	}
	function step(phase) {
		const stepPrefix = phase && `[${phase}]` || "";
		const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
		const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
		return Object.assign(debugDebugger ? debug2 : info, {
			label,
			sibling,
			info,
			step
		});
	}
}
var init_git_logger = __esm({ "src/lib/git-logger.ts"() {
	"use strict";
	init_utils();
	import_src.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
	import_src.default.formatters.B = (value) => {
		if (Buffer.isBuffer(value)) return value.toString("utf8");
		return objectToString(value);
	};
} });
var TasksPendingQueue;
var init_tasks_pending_queue = __esm({ "src/lib/runners/tasks-pending-queue.ts"() {
	"use strict";
	init_git_error();
	init_git_logger();
	TasksPendingQueue = class _TasksPendingQueue {
		constructor(logLabel = "GitExecutor") {
			this.logLabel = logLabel;
			this._queue = /* @__PURE__ */ new Map();
		}
		withProgress(task) {
			return this._queue.get(task);
		}
		createProgress(task) {
			const name = _TasksPendingQueue.getName(task.commands[0]);
			return {
				task,
				logger: createLogger(this.logLabel, name),
				name
			};
		}
		push(task) {
			const progress = this.createProgress(task);
			progress.logger("Adding task to the queue, commands = %o", task.commands);
			this._queue.set(task, progress);
			return progress;
		}
		fatal(err) {
			for (const [task, { logger }] of Array.from(this._queue.entries())) {
				if (task === err.task) {
					logger.info(`Failed %o`, err);
					logger(`Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`);
				} else logger.info(`A fatal exception occurred in a previous task, the queue has been purged: %o`, err.message);
				this.complete(task);
			}
			if (this._queue.size !== 0) throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
		}
		complete(task) {
			if (this.withProgress(task)) this._queue.delete(task);
		}
		attempt(task) {
			const progress = this.withProgress(task);
			if (!progress) throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
			progress.logger("Starting task");
			return progress;
		}
		static getName(name = "empty") {
			return `task:${name}:${++_TasksPendingQueue.counter}`;
		}
		static {
			this.counter = 0;
		}
	};
} });
function pluginContext(task, commands) {
	return {
		method: first(task.commands) || "",
		commands
	};
}
function onErrorReceived(target, logger) {
	return (err) => {
		logger(`[ERROR] child process exception %o`, err);
		target.push(Buffer.from(String(err.stack), "ascii"));
	};
}
function onDataReceived(target, name, logger, output) {
	return (buffer) => {
		logger(`%s received %L bytes`, name, buffer);
		output(`%B`, buffer);
		target.push(buffer);
	};
}
var GitExecutorChain;
var init_git_executor_chain = __esm({ "src/lib/runners/git-executor-chain.ts"() {
	"use strict";
	init_git_error();
	init_task();
	init_utils();
	init_tasks_pending_queue();
	GitExecutorChain = class {
		constructor(_executor, _scheduler, _plugins) {
			this._executor = _executor;
			this._scheduler = _scheduler;
			this._plugins = _plugins;
			this._chain = Promise.resolve();
			this._queue = new TasksPendingQueue();
		}
		get cwd() {
			return this._cwd || this._executor.cwd;
		}
		set cwd(cwd) {
			this._cwd = cwd;
		}
		get env() {
			return this._executor.env;
		}
		get outputHandler() {
			return this._executor.outputHandler;
		}
		chain() {
			return this;
		}
		push(task) {
			this._queue.push(task);
			return this._chain = this._chain.then(() => this.attemptTask(task));
		}
		async attemptTask(task) {
			const onScheduleComplete = await this._scheduler.next();
			const onQueueComplete = () => this._queue.complete(task);
			try {
				const { logger } = this._queue.attempt(task);
				return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
			} catch (e) {
				throw this.onFatalException(task, e);
			} finally {
				onQueueComplete();
				onScheduleComplete();
			}
		}
		onFatalException(task, e) {
			const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
			this._chain = Promise.resolve();
			this._queue.fatal(gitError);
			return gitError;
		}
		async attemptRemoteTask(task, logger) {
			const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
			const args = this._plugins.exec("spawn.args", [...task.commands], {
				...pluginContext(task, task.commands),
				env: { ...this.env }
			});
			const raw = await this.gitResponse(task, binary, args, this.outputHandler, logger.step("SPAWN"));
			const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
			logger(`passing response to task's parser as a %s`, task.format);
			if (isBufferTask(task)) return callTaskParser(task.parser, outputStreams);
			return callTaskParser(task.parser, outputStreams.asStrings());
		}
		async attemptEmptyTask(task, logger) {
			logger(`empty task bypassing child process to call to task's parser`);
			return task.parser(this);
		}
		handleTaskData(task, args, result, logger) {
			const { exitCode, rejection, stdOut, stdErr } = result;
			return new Promise((done, fail) => {
				logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
				const { error } = this._plugins.exec("task.error", { error: rejection }, {
					...pluginContext(task, args),
					...result
				});
				if (error && task.onError) {
					logger.info(`exitCode=%s handling with custom error handler`);
					return task.onError(result, error, (newStdOut) => {
						logger.info(`custom error handler treated as success`);
						logger(`custom error returned a %s`, objectToString(newStdOut));
						done(new GitOutputStreams(Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut, Buffer.concat(stdErr)));
					}, fail);
				}
				if (error) {
					logger.info(`handling as error: exitCode=%s stdErr=%s rejection=%o`, exitCode, stdErr.length, rejection);
					return fail(error);
				}
				logger.info(`retrieving task output complete`);
				done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
			});
		}
		async gitResponse(task, command, args, outputHandler, logger) {
			const outputLogger = logger.sibling("output");
			const spawnOptions = this._plugins.exec("spawn.options", {
				cwd: this.cwd,
				env: this.env,
				windowsHide: true
			}, pluginContext(task, task.commands));
			return new Promise((done) => {
				const stdOut = [];
				const stdErr = [];
				logger.info(`%s %o`, command, args);
				logger("%O", spawnOptions);
				let rejection = this._beforeSpawn(task, args);
				if (rejection) return done({
					stdOut,
					stdErr,
					exitCode: 9901,
					rejection
				});
				this._plugins.exec("spawn.before", void 0, {
					...pluginContext(task, args),
					kill(reason) {
						rejection = reason || rejection;
					}
				});
				const spawned = spawn(command, args, spawnOptions);
				spawned.stdout.on("data", onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut")));
				spawned.stderr.on("data", onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr")));
				spawned.on("error", onErrorReceived(stdErr, logger));
				if (outputHandler) {
					logger(`Passing child process stdOut/stdErr to custom outputHandler`);
					outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
				}
				this._plugins.exec("spawn.after", void 0, {
					...pluginContext(task, args),
					spawned,
					close(exitCode, reason) {
						done({
							stdOut,
							stdErr,
							exitCode,
							rejection: rejection || reason
						});
					},
					kill(reason) {
						if (spawned.killed) return;
						rejection = reason;
						spawned.kill("SIGINT");
					}
				});
			});
		}
		_beforeSpawn(task, args) {
			let rejection;
			this._plugins.exec("spawn.before", void 0, {
				...pluginContext(task, args),
				kill(reason) {
					rejection = reason || rejection;
				}
			});
			return rejection;
		}
	};
} });
var git_executor_exports = {};
__export(git_executor_exports, { GitExecutor: () => GitExecutor });
var GitExecutor;
var init_git_executor = __esm({ "src/lib/runners/git-executor.ts"() {
	"use strict";
	init_git_executor_chain();
	GitExecutor = class {
		constructor(cwd, _scheduler, _plugins) {
			this.cwd = cwd;
			this._scheduler = _scheduler;
			this._plugins = _plugins;
			this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
		}
		chain() {
			return new GitExecutorChain(this, this._scheduler, this._plugins);
		}
		push(task) {
			return this._chain.push(task);
		}
	};
} });
function taskCallback(task, response, callback = NOOP) {
	const onSuccess = (data) => {
		callback(null, data);
	};
	const onError2 = (err) => {
		if (err?.task === task) callback(err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err, void 0);
	};
	response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
	let log = (name) => {
		console.warn(`simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`);
		log = NOOP;
	};
	return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
	function descriptorReducer(all, name) {
		if (name in err) return all;
		all[name] = {
			enumerable: false,
			configurable: false,
			get() {
				log(name);
				return err.git[name];
			}
		};
		return all;
	}
}
var init_task_callback = __esm({ "src/lib/task-callback.ts"() {
	"use strict";
	init_git_response_error();
	init_utils();
} });
function changeWorkingDirectoryTask(directory, root) {
	return adhocExecTask((instance) => {
		if (!folderExists(directory)) throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
		return (root || instance).cwd = directory;
	});
}
var init_change_working_directory = __esm({ "src/lib/tasks/change-working-directory.ts"() {
	"use strict";
	init_utils();
	init_task();
} });
function checkoutTask(args) {
	const commands = ["checkout", ...args];
	if (commands[1] === "-b" && commands.includes("-B")) commands[1] = remove(commands, "-B");
	return straightThroughStringTask(commands);
}
function checkout_default() {
	return {
		checkout() {
			return this._runTask(checkoutTask(getTrailingOptions(arguments, 1)), trailingFunctionArgument(arguments));
		},
		checkoutBranch(branchName, startPoint) {
			return this._runTask(checkoutTask([
				"-b",
				branchName,
				startPoint,
				...getTrailingOptions(arguments)
			]), trailingFunctionArgument(arguments));
		},
		checkoutLocalBranch(branchName) {
			return this._runTask(checkoutTask([
				"-b",
				branchName,
				...getTrailingOptions(arguments)
			]), trailingFunctionArgument(arguments));
		}
	};
}
var init_checkout = __esm({ "src/lib/tasks/checkout.ts"() {
	"use strict";
	init_utils();
	init_task();
} });
function countObjectsResponse() {
	return {
		count: 0,
		garbage: 0,
		inPack: 0,
		packs: 0,
		prunePackable: 0,
		size: 0,
		sizeGarbage: 0,
		sizePack: 0
	};
}
function count_objects_default() {
	return { countObjects() {
		return this._runTask({
			commands: ["count-objects", "--verbose"],
			format: "utf-8",
			parser(stdOut) {
				return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
			}
		});
	} };
}
var parser2;
var init_count_objects = __esm({ "src/lib/tasks/count-objects.ts"() {
	"use strict";
	init_utils();
	parser2 = new LineParser(/([a-z-]+): (\d+)$/, (result, [key, value]) => {
		const property = asCamelCase(key);
		if (Object.hasOwn(result, property)) result[property] = asNumber(value);
	});
} });
function parseCommitResult(stdOut) {
	return parseStringResponse({
		author: null,
		branch: "",
		commit: "",
		root: false,
		summary: {
			changes: 0,
			insertions: 0,
			deletions: 0
		}
	}, parsers, stdOut);
}
var parsers;
var init_parse_commit = __esm({ "src/lib/parsers/parse-commit.ts"() {
	"use strict";
	init_utils();
	parsers = [
		new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
			result.branch = branch;
			result.commit = commit;
			result.root = !!root;
		}),
		new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
			const parts = author.split("<");
			const email = parts.pop();
			if (!email || !email.includes("@")) return;
			result.author = {
				email: email.substr(0, email.length - 1),
				name: parts.join("<").trim()
			};
		}),
		new LineParser(/(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g, (result, [changes, insertions, deletions]) => {
			result.summary.changes = parseInt(changes, 10) || 0;
			result.summary.insertions = parseInt(insertions, 10) || 0;
			result.summary.deletions = parseInt(deletions, 10) || 0;
		}),
		new LineParser(/^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/, (result, [changes, lines, direction]) => {
			result.summary.changes = parseInt(changes, 10) || 0;
			const count = parseInt(lines, 10) || 0;
			if (direction === "-") result.summary.deletions = count;
			else if (direction === "+") result.summary.insertions = count;
		})
	];
} });
function commitTask(message, files, customArgs) {
	return {
		commands: [
			"-c",
			"core.abbrev=40",
			"commit",
			...prefixedArray(message, "-m"),
			...files,
			...customArgs
		],
		format: "utf-8",
		parser: parseCommitResult
	};
}
function commit_default() {
	return { commit(message, ...rest) {
		const next = trailingFunctionArgument(arguments);
		const task = rejectDeprecatedSignatures(message) || commitTask(asArray(message), asArray(filterType(rest[0], filterStringOrStringArray, [])), [...asStringArray(filterType(rest[1], filterArray, [])), ...getTrailingOptions(arguments, 0, true)]);
		return this._runTask(task, next);
	} };
	function rejectDeprecatedSignatures(message) {
		return !filterStringOrStringArray(message) && configurationErrorTask(`git.commit: requires the commit message to be supplied as a string/string[]`);
	}
}
var init_commit = __esm({ "src/lib/tasks/commit.ts"() {
	"use strict";
	init_parse_commit();
	init_utils();
	init_task();
} });
function first_commit_default() {
	return { firstCommit() {
		return this._runTask(straightThroughStringTask([
			"rev-list",
			"--max-parents=0",
			"HEAD"
		], true), trailingFunctionArgument(arguments));
	} };
}
var init_first_commit = __esm({ "src/lib/tasks/first-commit.ts"() {
	"use strict";
	init_utils();
	init_task();
} });
function hashObjectTask(filePath, write) {
	const commands = ["hash-object", filePath];
	if (write) commands.push("-w");
	return straightThroughStringTask(commands, true);
}
var init_hash_object = __esm({ "src/lib/tasks/hash-object.ts"() {
	"use strict";
	init_task();
} });
function parseInit(bare, path, text) {
	const response = String(text).trim();
	let result;
	if (result = initResponseRegex.exec(response)) return new InitSummary(bare, path, false, result[1]);
	if (result = reInitResponseRegex.exec(response)) return new InitSummary(bare, path, true, result[1]);
	let gitDir = "";
	const tokens = response.split(" ");
	while (tokens.length) if (tokens.shift() === "in") {
		gitDir = tokens.join(" ");
		break;
	}
	return new InitSummary(bare, path, /^re/i.test(response), gitDir);
}
var InitSummary, initResponseRegex, reInitResponseRegex;
var init_InitSummary = __esm({ "src/lib/responses/InitSummary.ts"() {
	"use strict";
	InitSummary = class {
		constructor(bare, path, existing, gitDir) {
			this.bare = bare;
			this.path = path;
			this.existing = existing;
			this.gitDir = gitDir;
		}
	};
	initResponseRegex = /^Init.+ repository in (.+)$/;
	reInitResponseRegex = /^Rein.+ in (.+)$/;
} });
function hasBareCommand(command) {
	return command.includes(bareCommand);
}
function initTask(bare = false, path, customArgs) {
	const commands = ["init", ...customArgs];
	if (bare && !hasBareCommand(commands)) commands.splice(1, 0, bareCommand);
	return {
		commands,
		format: "utf-8",
		parser(text) {
			return parseInit(commands.includes("--bare"), path, text);
		}
	};
}
var bareCommand;
var init_init = __esm({ "src/lib/tasks/init.ts"() {
	"use strict";
	init_InitSummary();
	bareCommand = "--bare";
} });
function logFormatFromCommand(customArgs) {
	for (let i = 0; i < customArgs.length; i++) {
		const format = logFormatRegex.exec(customArgs[i]);
		if (format) return `--${format[1]}`;
	}
	return "";
}
function isLogFormat(customArg) {
	return logFormatRegex.test(customArg);
}
var logFormatRegex;
var init_log_format = __esm({ "src/lib/args/log-format.ts"() {
	"use strict";
	logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
} });
var DiffSummary;
var init_DiffSummary = __esm({ "src/lib/responses/DiffSummary.ts"() {
	"use strict";
	DiffSummary = class {
		constructor() {
			this.changed = 0;
			this.deletions = 0;
			this.insertions = 0;
			this.files = [];
		}
	};
} });
function getDiffParser(format = "") {
	const parser4 = diffSummaryParsers[format];
	return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
var statParser, numStatParser, nameOnlyParser, nameStatusParser, diffSummaryParsers;
var init_parse_diff_summary = __esm({ "src/lib/parsers/parse-diff-summary.ts"() {
	"use strict";
	init_log_format();
	init_DiffSummary();
	init_diff_name_status();
	init_utils();
	statParser = [
		new LineParser(/^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/, (result, [file, changes, alterations = ""]) => {
			result.files.push({
				file: file.trim(),
				changes: asNumber(changes),
				insertions: alterations.replace(/[^+]/g, "").length,
				deletions: alterations.replace(/[^-]/g, "").length,
				binary: false
			});
		}),
		new LineParser(/^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/, (result, [file, before, after]) => {
			result.files.push({
				file: file.trim(),
				before: asNumber(before),
				after: asNumber(after),
				binary: true
			});
		}),
		new LineParser(/(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/, (result, [changed, summary]) => {
			const inserted = /(\d+) i/.exec(summary);
			const deleted = /(\d+) d/.exec(summary);
			result.changed = asNumber(changed);
			result.insertions = asNumber(inserted?.[1]);
			result.deletions = asNumber(deleted?.[1]);
		})
	];
	numStatParser = [new LineParser(/(\d+)\t(\d+)\t(.+)$/, (result, [changesInsert, changesDelete, file]) => {
		const insertions = asNumber(changesInsert);
		const deletions = asNumber(changesDelete);
		result.changed++;
		result.insertions += insertions;
		result.deletions += deletions;
		result.files.push({
			file,
			changes: insertions + deletions,
			insertions,
			deletions,
			binary: false
		});
	}), new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
		result.changed++;
		result.files.push({
			file,
			after: 0,
			before: 0,
			binary: true
		});
	})];
	nameOnlyParser = [new LineParser(/(.+)$/, (result, [file]) => {
		result.changed++;
		result.files.push({
			file,
			changes: 0,
			insertions: 0,
			deletions: 0,
			binary: false
		});
	})];
	nameStatusParser = [new LineParser(/([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/, (result, [status, similarity, from, _to, to]) => {
		result.changed++;
		result.files.push({
			file: to ?? from,
			changes: 0,
			insertions: 0,
			deletions: 0,
			binary: false,
			status: orVoid(isDiffNameStatus(status) && status),
			from: orVoid(!!to && from !== to && from),
			similarity: asNumber(similarity)
		});
	})];
	diffSummaryParsers = {
		[""]: statParser,
		["--stat"]: statParser,
		["--numstat"]: numStatParser,
		["--name-status"]: nameStatusParser,
		["--name-only"]: nameOnlyParser
	};
} });
function lineBuilder(tokens, fields) {
	return fields.reduce((line, field, index) => {
		line[field] = tokens[index] || "";
		return line;
	}, /* @__PURE__ */ Object.create({ diff: null }));
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
	const parseDiffResult = getDiffParser(logFormat);
	return function(stdOut) {
		const all = toLinesWithContent(stdOut.trim(), false, START_BOUNDARY).map(function(item) {
			const lineDetail = item.split(COMMIT_BOUNDARY);
			const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
			if (lineDetail.length > 1 && !!lineDetail[1].trim()) listLogLine.diff = parseDiffResult(lineDetail[1]);
			return listLogLine;
		});
		return {
			all,
			latest: all.length && all[0] || null,
			total: all.length
		};
	};
}
var START_BOUNDARY, COMMIT_BOUNDARY, SPLITTER, defaultFieldNames;
var init_parse_list_log_summary = __esm({ "src/lib/parsers/parse-list-log-summary.ts"() {
	"use strict";
	init_utils();
	init_parse_diff_summary();
	init_log_format();
	START_BOUNDARY = "òòòòòò ";
	COMMIT_BOUNDARY = " òò";
	SPLITTER = " ò ";
	defaultFieldNames = [
		"hash",
		"date",
		"message",
		"refs",
		"author_name",
		"author_email"
	];
} });
var diff_exports = {};
__export(diff_exports, {
	diffSummaryTask: () => diffSummaryTask,
	validateLogFormatConfig: () => validateLogFormatConfig
});
function diffSummaryTask(customArgs) {
	let logFormat = logFormatFromCommand(customArgs);
	const commands = ["diff"];
	if (logFormat === "") {
		logFormat = "--stat";
		commands.push("--stat=4096");
	}
	commands.push(...customArgs);
	return validateLogFormatConfig(commands) || {
		commands,
		format: "utf-8",
		parser: getDiffParser(logFormat)
	};
}
function validateLogFormatConfig(customArgs) {
	const flags = customArgs.filter(isLogFormat);
	if (flags.length > 1) return configurationErrorTask(`Summary flags are mutually exclusive - pick one of ${flags.join(",")}`);
	if (flags.length && customArgs.includes("-z")) return configurationErrorTask(`Summary flag ${flags} parsing is not compatible with null termination option '-z'`);
}
var init_diff = __esm({ "src/lib/tasks/diff.ts"() {
	"use strict";
	init_log_format();
	init_parse_diff_summary();
	init_task();
} });
function prettyFormat(format, splitter) {
	const fields = [];
	const formatStr = [];
	Object.keys(format).forEach((field) => {
		fields.push(field);
		formatStr.push(String(format[field]));
	});
	return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
	return Object.keys(input).reduce((out, key) => {
		if (!(key in excludeOptions)) out[key] = input[key];
		return out;
	}, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
	const splitter = filterType(opt.splitter, filterString, SPLITTER);
	const [fields, formatStr] = prettyFormat(filterPlainObject(opt.format) ? opt.format : {
		hash: "%H",
		date: opt.strictDate === false ? "%ai" : "%aI",
		message: "%s",
		refs: "%D",
		body: opt.multiLine ? "%B" : "%b",
		author_name: opt.mailMap !== false ? "%aN" : "%an",
		author_email: opt.mailMap !== false ? "%aE" : "%ae"
	}, splitter);
	const suffix = [];
	const command = [`--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`, ...customArgs];
	const maxCount = opt.n || opt["max-count"] || opt.maxCount;
	if (maxCount) command.push(`--max-count=${maxCount}`);
	if (opt.from || opt.to) {
		const rangeOperator = opt.symmetric !== false ? "..." : "..";
		suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
	}
	if (filterString(opt.file)) command.push("--follow", c$1(opt.file));
	appendTaskOptions(userOptions(opt), command);
	return {
		fields,
		splitter,
		commands: [...command, ...suffix]
	};
}
function logTask(splitter, fields, customArgs) {
	const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
	return {
		commands: ["log", ...customArgs],
		format: "utf-8",
		parser: parser4
	};
}
function log_default() {
	return { log(...rest) {
		const next = trailingFunctionArgument(arguments);
		const options = parseLogOptions(trailingOptionsArgument(arguments), asStringArray(filterType(arguments[0], filterArray, [])));
		const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
		return this._runTask(task, next);
	} };
	function createLogTask(options) {
		return logTask(options.splitter, options.fields, options.commands);
	}
	function rejectDeprecatedSignatures(from, to) {
		return filterString(from) && filterString(to) && configurationErrorTask(`git.log(string, string) should be replaced with git.log({ from: string, to: string })`);
	}
}
var excludeOptions;
var init_log = __esm({ "src/lib/tasks/log.ts"() {
	"use strict";
	init_log_format();
	init_parse_list_log_summary();
	init_utils();
	init_task();
	init_diff();
	excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
		excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
		excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
		excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
		excludeOptions2[excludeOptions2["n"] = 3] = "n";
		excludeOptions2[excludeOptions2["file"] = 4] = "file";
		excludeOptions2[excludeOptions2["format"] = 5] = "format";
		excludeOptions2[excludeOptions2["from"] = 6] = "from";
		excludeOptions2[excludeOptions2["to"] = 7] = "to";
		excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
		excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
		excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
		excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
		excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
		return excludeOptions2;
	})(excludeOptions || {});
} });
var MergeSummaryConflict, MergeSummaryDetail;
var init_MergeSummary = __esm({ "src/lib/responses/MergeSummary.ts"() {
	"use strict";
	MergeSummaryConflict = class {
		constructor(reason, file = null, meta) {
			this.reason = reason;
			this.file = file;
			this.meta = meta;
		}
		toString() {
			return `${this.file}:${this.reason}`;
		}
	};
	MergeSummaryDetail = class {
		constructor() {
			this.conflicts = [];
			this.merges = [];
			this.result = "success";
		}
		get failed() {
			return this.conflicts.length > 0;
		}
		get reason() {
			return this.result;
		}
		toString() {
			if (this.conflicts.length) return `CONFLICTS: ${this.conflicts.join(", ")}`;
			return "OK";
		}
	};
} });
var PullSummary, PullFailedSummary;
var init_PullSummary = __esm({ "src/lib/responses/PullSummary.ts"() {
	"use strict";
	PullSummary = class {
		constructor() {
			this.remoteMessages = { all: [] };
			this.created = [];
			this.deleted = [];
			this.files = [];
			this.deletions = {};
			this.insertions = {};
			this.summary = {
				changes: 0,
				deletions: 0,
				insertions: 0
			};
		}
	};
	PullFailedSummary = class {
		constructor() {
			this.remote = "";
			this.hash = {
				local: "",
				remote: ""
			};
			this.branch = {
				local: "",
				remote: ""
			};
			this.message = "";
		}
		toString() {
			return this.message;
		}
	};
} });
function objectEnumerationResult(remoteMessages) {
	return remoteMessages.objects = remoteMessages.objects || {
		compressing: 0,
		counting: 0,
		enumerating: 0,
		packReused: 0,
		reused: {
			count: 0,
			delta: 0
		},
		total: {
			count: 0,
			delta: 0
		}
	};
}
function asObjectCount(source) {
	const count = /^\s*(\d+)/.exec(source);
	const delta = /delta (\d+)/i.exec(source);
	return {
		count: asNumber(count && count[1] || "0"),
		delta: asNumber(delta && delta[1] || "0")
	};
}
var remoteMessagesObjectParsers;
var init_parse_remote_objects = __esm({ "src/lib/parsers/parse-remote-objects.ts"() {
	"use strict";
	init_utils();
	remoteMessagesObjectParsers = [
		new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i, (result, [action, count]) => {
			const key = action.toLowerCase();
			const enumeration = objectEnumerationResult(result.remoteMessages);
			Object.assign(enumeration, { [key]: asNumber(count) });
		}),
		new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i, (result, [action, count]) => {
			const key = action.toLowerCase();
			const enumeration = objectEnumerationResult(result.remoteMessages);
			Object.assign(enumeration, { [key]: asNumber(count) });
		}),
		new RemoteLineParser(/total ([^,]+), reused ([^,]+), pack-reused (\d+)/i, (result, [total, reused, packReused]) => {
			const objects = objectEnumerationResult(result.remoteMessages);
			objects.total = asObjectCount(total);
			objects.reused = asObjectCount(reused);
			objects.packReused = asNumber(packReused);
		})
	];
} });
function parseRemoteMessages(_stdOut, stdErr) {
	return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
var parsers2, RemoteMessageSummary;
var init_parse_remote_messages = __esm({ "src/lib/parsers/parse-remote-messages.ts"() {
	"use strict";
	init_utils();
	init_parse_remote_objects();
	parsers2 = [
		new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
			result.remoteMessages.all.push(text.trim());
			return false;
		}),
		...remoteMessagesObjectParsers,
		new RemoteLineParser([/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/], (result, [pullRequestUrl]) => {
			result.remoteMessages.pullRequestUrl = pullRequestUrl;
		}),
		new RemoteLineParser([/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/], (result, [count, summary, url]) => {
			result.remoteMessages.vulnerabilities = {
				count: asNumber(count),
				summary,
				url
			};
		})
	];
	RemoteMessageSummary = class {
		constructor() {
			this.all = [];
		}
	};
} });
function parsePullErrorResult(stdOut, stdErr) {
	const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
	return pullError.message && pullError;
}
var FILE_UPDATE_REGEX, SUMMARY_REGEX, ACTION_REGEX, parsers3, errorParsers, parsePullDetail, parsePullResult;
var init_parse_pull = __esm({ "src/lib/parsers/parse-pull.ts"() {
	"use strict";
	init_PullSummary();
	init_utils();
	init_parse_remote_messages();
	FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
	SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
	ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
	parsers3 = [
		new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
			result.files.push(file);
			if (insertions) result.insertions[file] = insertions.length;
			if (deletions) result.deletions[file] = deletions.length;
		}),
		new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
			if (insertions !== void 0 || deletions !== void 0) {
				result.summary.changes = +changes || 0;
				result.summary.insertions = +insertions || 0;
				result.summary.deletions = +deletions || 0;
				return true;
			}
			return false;
		}),
		new LineParser(ACTION_REGEX, (result, [action, file]) => {
			append(result.files, file);
			append(action === "create" ? result.created : result.deleted, file);
		})
	];
	errorParsers = [
		new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
		new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
		new LineParser(/([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/, (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
			result.branch.local = branchLocal;
			result.hash.local = hashLocal;
			result.branch.remote = branchRemote;
			result.hash.remote = hashRemote;
		})
	];
	parsePullDetail = (stdOut, stdErr) => {
		return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
	};
	parsePullResult = (stdOut, stdErr) => {
		return Object.assign(new PullSummary(), parsePullDetail(stdOut, stdErr), parseRemoteMessages(stdOut, stdErr));
	};
} });
var parsers4, parseMergeResult, parseMergeDetail;
var init_parse_merge = __esm({ "src/lib/parsers/parse-merge.ts"() {
	"use strict";
	init_MergeSummary();
	init_utils();
	init_parse_pull();
	parsers4 = [
		new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
			summary.merges.push(autoMerge);
		}),
		new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
			summary.conflicts.push(new MergeSummaryConflict(reason, file));
		}),
		new LineParser(/^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/, (summary, [reason, file, deleteRef]) => {
			summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
		}),
		new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
			summary.conflicts.push(new MergeSummaryConflict(reason, null));
		}),
		new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
			summary.result = result;
		})
	];
	parseMergeResult = (stdOut, stdErr) => {
		return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
	};
	parseMergeDetail = (stdOut) => {
		return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
	};
} });
function mergeTask(customArgs) {
	if (!customArgs.length) return configurationErrorTask("Git.merge requires at least one option");
	return {
		commands: ["merge", ...customArgs],
		format: "utf-8",
		parser(stdOut, stdErr) {
			const merge = parseMergeResult(stdOut, stdErr);
			if (merge.failed) throw new GitResponseError(merge);
			return merge;
		}
	};
}
var init_merge = __esm({ "src/lib/tasks/merge.ts"() {
	"use strict";
	init_git_response_error();
	init_parse_merge();
	init_task();
} });
function pushResultPushedItem(local, remote, status) {
	const deleted = status.includes("deleted");
	const tag = status.includes("tag") || /^refs\/tags/.test(local);
	const alreadyUpdated = !status.includes("new");
	return {
		deleted,
		tag,
		branch: !tag,
		new: !alreadyUpdated,
		alreadyUpdated,
		local,
		remote
	};
}
var parsers5, parsePushResult, parsePushDetail;
var init_parse_push = __esm({ "src/lib/parsers/parse-push.ts"() {
	"use strict";
	init_utils();
	init_parse_remote_messages();
	parsers5 = [
		new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
			result.repo = repo;
		}),
		new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
			result.ref = {
				...result.ref || {},
				local
			};
		}),
		new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
			result.pushed.push(pushResultPushedItem(local, remote, type));
		}),
		new LineParser(/^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/, (result, [local, remote, remoteName]) => {
			result.branch = {
				...result.branch || {},
				local,
				remote,
				remoteName
			};
		}),
		new LineParser(/^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/, (result, [local, remote, from, to]) => {
			result.update = {
				head: {
					local,
					remote
				},
				hash: {
					from,
					to
				}
			};
		})
	];
	parsePushResult = (stdOut, stdErr) => {
		const pushDetail = parsePushDetail(stdOut, stdErr);
		const responseDetail = parseRemoteMessages(stdOut, stdErr);
		return {
			...pushDetail,
			...responseDetail
		};
	};
	parsePushDetail = (stdOut, stdErr) => {
		return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
	};
} });
var push_exports = {};
__export(push_exports, {
	pushTagsTask: () => pushTagsTask,
	pushTask: () => pushTask
});
function pushTagsTask(ref = {}, customArgs) {
	append(customArgs, "--tags");
	return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
	const commands = ["push", ...customArgs];
	if (ref.branch) commands.splice(1, 0, ref.branch);
	if (ref.remote) commands.splice(1, 0, ref.remote);
	remove(commands, "-v");
	append(commands, "--verbose");
	append(commands, "--porcelain");
	return {
		commands,
		format: "utf-8",
		parser: parsePushResult
	};
}
var init_push = __esm({ "src/lib/tasks/push.ts"() {
	"use strict";
	init_parse_push();
	init_utils();
} });
function show_default() {
	return {
		showBuffer() {
			const commands = ["show", ...getTrailingOptions(arguments, 1)];
			if (!commands.includes("--binary")) commands.splice(1, 0, "--binary");
			return this._runTask(straightThroughBufferTask(commands), trailingFunctionArgument(arguments));
		},
		show() {
			const commands = ["show", ...getTrailingOptions(arguments, 1)];
			return this._runTask(straightThroughStringTask(commands), trailingFunctionArgument(arguments));
		}
	};
}
var init_show = __esm({ "src/lib/tasks/show.ts"() {
	"use strict";
	init_utils();
	init_task();
} });
var fromPathRegex, FileStatusSummary;
var init_FileStatusSummary = __esm({ "src/lib/responses/FileStatusSummary.ts"() {
	"use strict";
	fromPathRegex = /^(.+)\0(.+)$/;
	FileStatusSummary = class {
		constructor(path, index, working_dir) {
			this.path = path;
			this.index = index;
			this.working_dir = working_dir;
			if (index === "R" || working_dir === "R") {
				const detail = fromPathRegex.exec(path) || [
					null,
					path,
					path
				];
				this.from = detail[2] || "";
				this.path = detail[1] || "";
			}
		}
	};
} });
function renamedFile(line) {
	const [to, from] = line.split(NULL);
	return {
		from: from || to,
		to
	};
}
function parser3(indexX, indexY, handler) {
	return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
	return indexY.map((y) => parser3(indexX, y, (result, file) => result.conflicted.push(file)));
}
function splitLine(result, lineStr) {
	const trimmed2 = lineStr.trim();
	switch (" ") {
		case trimmed2.charAt(2): return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.slice(3));
		case trimmed2.charAt(1): return data(" ", trimmed2.charAt(0), trimmed2.slice(2));
		default: return;
	}
	function data(index, workingDir, path) {
		const raw = `${index}${workingDir}`;
		const handler = parsers6.get(raw);
		if (handler) handler(result, path);
		if (raw !== "##" && raw !== "!!") result.files.push(new FileStatusSummary(path, index, workingDir));
	}
}
var StatusSummary, parsers6, parseStatusSummary;
var init_StatusSummary = __esm({ "src/lib/responses/StatusSummary.ts"() {
	"use strict";
	init_utils();
	init_FileStatusSummary();
	StatusSummary = class {
		constructor() {
			this.not_added = [];
			this.conflicted = [];
			this.created = [];
			this.deleted = [];
			this.ignored = void 0;
			this.modified = [];
			this.renamed = [];
			this.files = [];
			this.staged = [];
			this.ahead = 0;
			this.behind = 0;
			this.current = null;
			this.tracking = null;
			this.detached = false;
			this.isClean = () => {
				return !this.files.length;
			};
		}
	};
	parsers6 = new Map([
		parser3(" ", "A", (result, file) => result.created.push(file)),
		parser3(" ", "D", (result, file) => result.deleted.push(file)),
		parser3(" ", "M", (result, file) => result.modified.push(file)),
		parser3("A", " ", (result, file) => {
			result.created.push(file);
			result.staged.push(file);
		}),
		parser3("A", "M", (result, file) => {
			result.created.push(file);
			result.staged.push(file);
			result.modified.push(file);
		}),
		parser3("D", " ", (result, file) => {
			result.deleted.push(file);
			result.staged.push(file);
		}),
		parser3("M", " ", (result, file) => {
			result.modified.push(file);
			result.staged.push(file);
		}),
		parser3("M", "M", (result, file) => {
			result.modified.push(file);
			result.staged.push(file);
		}),
		parser3("R", " ", (result, file) => {
			result.renamed.push(renamedFile(file));
		}),
		parser3("R", "M", (result, file) => {
			const renamed = renamedFile(file);
			result.renamed.push(renamed);
			result.modified.push(renamed.to);
		}),
		parser3("!", "!", (_result, _file) => {
			(_result.ignored = _result.ignored || []).push(_file);
		}),
		parser3("?", "?", (result, file) => result.not_added.push(file)),
		...conflicts("A", "A", "U"),
		...conflicts("D", "D", "U"),
		...conflicts("U", "A", "D", "U"),
		["##", (result, line) => {
			const aheadReg = /ahead (\d+)/;
			const behindReg = /behind (\d+)/;
			const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
			const trackingReg = /\.{3}(\S*)/;
			const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
			let regexResult = aheadReg.exec(line);
			result.ahead = regexResult && +regexResult[1] || 0;
			regexResult = behindReg.exec(line);
			result.behind = regexResult && +regexResult[1] || 0;
			regexResult = currentReg.exec(line);
			result.current = filterType(regexResult?.[1], filterString, null);
			regexResult = trackingReg.exec(line);
			result.tracking = filterType(regexResult?.[1], filterString, null);
			regexResult = onEmptyBranchReg.exec(line);
			if (regexResult) result.current = filterType(regexResult?.[1], filterString, result.current);
			result.detached = /\(no branch\)/.test(line);
		}]
	]);
	parseStatusSummary = function(text) {
		const lines = text.split(NULL);
		const status = new StatusSummary();
		for (let i = 0, l = lines.length; i < l;) {
			let line = lines[i++].trim();
			if (!line) continue;
			if (line.charAt(0) === "R") line += NULL + (lines[i++] || "");
			splitLine(status, line);
		}
		return status;
	};
} });
function statusTask(customArgs) {
	return {
		format: "utf-8",
		commands: [
			"status",
			"--porcelain",
			"-b",
			"-u",
			"--null",
			...customArgs.filter((arg) => !ignoredOptions.includes(arg))
		],
		parser(text) {
			return parseStatusSummary(text);
		}
	};
}
var ignoredOptions;
var init_status = __esm({ "src/lib/tasks/status.ts"() {
	"use strict";
	init_StatusSummary();
	ignoredOptions = ["--null", "-z"];
} });
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
	return Object.defineProperty({
		major,
		minor,
		patch,
		agent,
		installed
	}, "toString", {
		value() {
			return `${this.major}.${this.minor}.${this.patch}`;
		},
		configurable: false,
		enumerable: false
	});
}
function notInstalledResponse() {
	return versionResponse(0, 0, 0, "", false);
}
function version_default() {
	return { version() {
		return this._runTask({
			commands: ["--version"],
			format: "utf-8",
			parser: versionParser,
			onError(result, error, done, fail) {
				if (result.exitCode === -2) return done(Buffer.from(NOT_INSTALLED));
				fail(error);
			}
		});
	} };
}
function versionParser(stdOut) {
	if (stdOut === NOT_INSTALLED) return notInstalledResponse();
	return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
var NOT_INSTALLED, parsers7;
var init_version = __esm({ "src/lib/tasks/version.ts"() {
	"use strict";
	init_utils();
	NOT_INSTALLED = "installed=false";
	parsers7 = [new LineParser(/version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/, (result, [major, minor, patch, agent = ""]) => {
		Object.assign(result, versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent));
	}), new LineParser(/version (\d+)\.(\d+)\.(\D+)(.+)?$/, (result, [major, minor, patch, agent = ""]) => {
		Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
	})];
} });
function createCloneTask(api, task, repoPath, ...args) {
	if (!filterString(repoPath)) return configurationErrorTask(`git.${api}() requires a string 'repoPath'`);
	return task(repoPath, filterType(args[0], filterString), getTrailingOptions(arguments));
}
function clone_default() {
	return {
		clone(repo, ...rest) {
			return this._runTask(createCloneTask("clone", cloneTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
		},
		mirror(repo, ...rest) {
			return this._runTask(createCloneTask("mirror", cloneMirrorTask, filterType(repo, filterString), ...rest), trailingFunctionArgument(arguments));
		}
	};
}
var cloneTask, cloneMirrorTask;
var init_clone = __esm({ "src/lib/tasks/clone.ts"() {
	"use strict";
	init_task();
	init_utils();
	cloneTask = (repo, directory, customArgs) => {
		const commands = ["clone", ...customArgs];
		filterString(repo) && commands.push(c$1(repo));
		filterString(directory) && commands.push(c$1(directory));
		return straightThroughStringTask(commands);
	};
	cloneMirrorTask = (repo, directory, customArgs) => {
		append(customArgs, "--mirror");
		return cloneTask(repo, directory, customArgs);
	};
} });
var simple_git_api_exports = {};
__export(simple_git_api_exports, { SimpleGitApi: () => SimpleGitApi });
var SimpleGitApi;
var init_simple_git_api = __esm({ "src/lib/simple-git-api.ts"() {
	"use strict";
	init_task_callback();
	init_change_working_directory();
	init_checkout();
	init_count_objects();
	init_commit();
	init_config();
	init_first_commit();
	init_grep();
	init_hash_object();
	init_init();
	init_log();
	init_merge();
	init_push();
	init_show();
	init_status();
	init_task();
	init_version();
	init_utils();
	init_clone();
	SimpleGitApi = class {
		constructor(_executor) {
			this._executor = _executor;
		}
		_runTask(task, then) {
			const chain = this._executor.chain();
			const promise = chain.push(task);
			if (then) taskCallback(task, promise, then);
			return Object.create(this, {
				then: { value: promise.then.bind(promise) },
				catch: { value: promise.catch.bind(promise) },
				_executor: { value: chain }
			});
		}
		add(files) {
			return this._runTask(straightThroughStringTask(["add", ...asArray(files)]), trailingFunctionArgument(arguments));
		}
		cwd(directory) {
			const next = trailingFunctionArgument(arguments);
			if (typeof directory === "string") return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
			if (typeof directory?.path === "string") return this._runTask(changeWorkingDirectoryTask(directory.path, directory.root && this._executor || void 0), next);
			return this._runTask(configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"), next);
		}
		hashObject(path, write) {
			return this._runTask(hashObjectTask(path, write === true), trailingFunctionArgument(arguments));
		}
		init(bare) {
			return this._runTask(initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
		}
		merge() {
			return this._runTask(mergeTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
		}
		mergeFromTo(remote, branch) {
			if (!(filterString(remote) && filterString(branch))) return this._runTask(configurationErrorTask(`Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`));
			return this._runTask(mergeTask([
				remote,
				branch,
				...getTrailingOptions(arguments)
			]), trailingFunctionArgument(arguments, false));
		}
		outputHandler(handler) {
			this._executor.outputHandler = handler;
			return this;
		}
		push() {
			const task = pushTask({
				remote: filterType(arguments[0], filterString),
				branch: filterType(arguments[1], filterString)
			}, getTrailingOptions(arguments));
			return this._runTask(task, trailingFunctionArgument(arguments));
		}
		stash() {
			return this._runTask(straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
		}
		status() {
			return this._runTask(statusTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
		}
	};
	Object.assign(SimpleGitApi.prototype, checkout_default(), clone_default(), commit_default(), config_default(), count_objects_default(), first_commit_default(), grep_default(), log_default(), show_default(), version_default());
} });
var scheduler_exports = {};
__export(scheduler_exports, { Scheduler: () => Scheduler });
var createScheduledTask, Scheduler;
var init_scheduler = __esm({ "src/lib/runners/scheduler.ts"() {
	"use strict";
	init_utils();
	init_git_logger();
	createScheduledTask = /* @__PURE__ */ (() => {
		let id = 0;
		return () => {
			id++;
			const { promise, done } = (0, import_dist$1.createDeferred)();
			return {
				promise,
				done,
				id
			};
		};
	})();
	Scheduler = class {
		constructor(concurrency = 2) {
			this.concurrency = concurrency;
			this.logger = createLogger("", "scheduler");
			this.pending = [];
			this.running = [];
			this.logger(`Constructed, concurrency=%s`, concurrency);
		}
		schedule() {
			if (!this.pending.length || this.running.length >= this.concurrency) {
				this.logger(`Schedule attempt ignored, pending=%s running=%s concurrency=%s`, this.pending.length, this.running.length, this.concurrency);
				return;
			}
			const task = append(this.running, this.pending.shift());
			this.logger(`Attempting id=%s`, task.id);
			task.done(() => {
				this.logger(`Completing id=`, task.id);
				remove(this.running, task);
				this.schedule();
			});
		}
		next() {
			const { promise, id } = append(this.pending, createScheduledTask());
			this.logger(`Scheduling id=%s`, id);
			this.schedule();
			return promise;
		}
	};
} });
var apply_patch_exports = {};
__export(apply_patch_exports, { applyPatchTask: () => applyPatchTask });
function applyPatchTask(patches, customArgs) {
	return straightThroughStringTask([
		"apply",
		...customArgs,
		...patches
	]);
}
var init_apply_patch = __esm({ "src/lib/tasks/apply-patch.ts"() {
	"use strict";
	init_task();
} });
function branchDeletionSuccess(branch, hash) {
	return {
		branch,
		hash,
		success: true
	};
}
function branchDeletionFailure(branch) {
	return {
		branch,
		hash: null,
		success: false
	};
}
var BranchDeletionBatch;
var init_BranchDeleteSummary = __esm({ "src/lib/responses/BranchDeleteSummary.ts"() {
	"use strict";
	BranchDeletionBatch = class {
		constructor() {
			this.all = [];
			this.branches = {};
			this.errors = [];
		}
		get success() {
			return !this.errors.length;
		}
	};
} });
function hasBranchDeletionError(data, processExitCode) {
	return processExitCode === 1 && deleteErrorRegex.test(data);
}
var deleteSuccessRegex, deleteErrorRegex, parsers8, parseBranchDeletions;
var init_parse_branch_delete = __esm({ "src/lib/parsers/parse-branch-delete.ts"() {
	"use strict";
	init_BranchDeleteSummary();
	init_utils();
	deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
	deleteErrorRegex = /^error[^']+'([^']+)'/m;
	parsers8 = [new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
		const deletion = branchDeletionSuccess(branch, hash);
		result.all.push(deletion);
		result.branches[branch] = deletion;
	}), new LineParser(deleteErrorRegex, (result, [branch]) => {
		const deletion = branchDeletionFailure(branch);
		result.errors.push(deletion);
		result.all.push(deletion);
		result.branches[branch] = deletion;
	})];
	parseBranchDeletions = (stdOut, stdErr) => {
		return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
	};
} });
var BranchSummaryResult;
var init_BranchSummary = __esm({ "src/lib/responses/BranchSummary.ts"() {
	"use strict";
	BranchSummaryResult = class {
		constructor() {
			this.all = [];
			this.branches = {};
			this.current = "";
			this.detached = false;
		}
		push(status, detached, name, commit, label) {
			if (status === "*") {
				this.detached = detached;
				this.current = name;
			}
			this.all.push(name);
			this.branches[name] = {
				current: status === "*",
				linkedWorkTree: status === "+",
				name,
				commit,
				label
			};
		}
	};
} });
function branchStatus(input) {
	return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
	return parseStringResponse(new BranchSummaryResult(), currentOnly ? [currentBranchParser] : parsers9, stdOut);
}
var parsers9, currentBranchParser;
var init_parse_branch = __esm({ "src/lib/parsers/parse-branch.ts"() {
	"use strict";
	init_BranchSummary();
	init_utils();
	parsers9 = [new LineParser(/^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/, (result, [current, name, commit, label]) => {
		result.push(branchStatus(current), true, name, commit, label);
	}), new LineParser(/^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s, (result, [current, name, commit, label]) => {
		result.push(branchStatus(current), false, name, commit, label);
	})];
	currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
		result.push("*", false, name, "", "");
	});
} });
var branch_exports = {};
__export(branch_exports, {
	branchLocalTask: () => branchLocalTask,
	branchTask: () => branchTask,
	containsDeleteBranchCommand: () => containsDeleteBranchCommand,
	deleteBranchTask: () => deleteBranchTask,
	deleteBranchesTask: () => deleteBranchesTask
});
function containsDeleteBranchCommand(commands) {
	const deleteCommands = [
		"-d",
		"-D",
		"--delete"
	];
	return commands.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
	const isDelete = containsDeleteBranchCommand(customArgs);
	const isCurrentOnly = customArgs.includes("--show-current");
	const commands = ["branch", ...customArgs];
	if (commands.length === 1) commands.push("-a");
	if (!commands.includes("-v")) commands.splice(1, 0, "-v");
	return {
		format: "utf-8",
		commands,
		parser(stdOut, stdErr) {
			if (isDelete) return parseBranchDeletions(stdOut, stdErr).all[0];
			return parseBranchSummary(stdOut, isCurrentOnly);
		}
	};
}
function branchLocalTask() {
	return {
		format: "utf-8",
		commands: ["branch", "-v"],
		parser(stdOut) {
			return parseBranchSummary(stdOut);
		}
	};
}
function deleteBranchesTask(branches, forceDelete = false) {
	return {
		format: "utf-8",
		commands: [
			"branch",
			"-v",
			forceDelete ? "-D" : "-d",
			...branches
		],
		parser(stdOut, stdErr) {
			return parseBranchDeletions(stdOut, stdErr);
		},
		onError({ exitCode, stdOut }, error, done, fail) {
			if (!hasBranchDeletionError(String(error), exitCode)) return fail(error);
			done(stdOut);
		}
	};
}
function deleteBranchTask(branch, forceDelete = false) {
	const task = {
		format: "utf-8",
		commands: [
			"branch",
			"-v",
			forceDelete ? "-D" : "-d",
			branch
		],
		parser(stdOut, stdErr) {
			return parseBranchDeletions(stdOut, stdErr).branches[branch];
		},
		onError({ exitCode, stdErr, stdOut }, error, _, fail) {
			if (!hasBranchDeletionError(String(error), exitCode)) return fail(error);
			throw new GitResponseError(task.parser(bufferToString(stdOut), bufferToString(stdErr)), String(error));
		}
	};
	return task;
}
var init_branch = __esm({ "src/lib/tasks/branch.ts"() {
	"use strict";
	init_git_response_error();
	init_parse_branch_delete();
	init_parse_branch();
	init_utils();
} });
function toPath(input) {
	const path = input.trim().replace(/^["']|["']$/g, "");
	return path && normalize(path);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm({ "src/lib/responses/CheckIgnore.ts"() {
	"use strict";
	parseCheckIgnore = (text) => {
		return text.split(/\n/g).map(toPath).filter(Boolean);
	};
} });
var check_ignore_exports = {};
__export(check_ignore_exports, { checkIgnoreTask: () => checkIgnoreTask });
function checkIgnoreTask(paths) {
	return {
		commands: ["check-ignore", ...paths],
		format: "utf-8",
		parser: parseCheckIgnore
	};
}
var init_check_ignore = __esm({ "src/lib/tasks/check-ignore.ts"() {
	"use strict";
	init_CheckIgnore();
} });
function parseFetchResult(stdOut, stdErr) {
	return parseStringResponse({
		raw: stdOut,
		remote: null,
		branches: [],
		tags: [],
		updated: [],
		deleted: []
	}, parsers10, [stdOut, stdErr]);
}
var parsers10;
var init_parse_fetch = __esm({ "src/lib/parsers/parse-fetch.ts"() {
	"use strict";
	init_utils();
	parsers10 = [
		new LineParser(/From (.+)$/, (result, [remote]) => {
			result.remote = remote;
		}),
		new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
			result.branches.push({
				name,
				tracking
			});
		}),
		new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
			result.tags.push({
				name,
				tracking
			});
		}),
		new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
			result.deleted.push({ tracking });
		}),
		new LineParser(/\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/, (result, [from, to, name, tracking]) => {
			result.updated.push({
				name,
				tracking,
				to,
				from
			});
		})
	];
} });
var fetch_exports = {};
__export(fetch_exports, { fetchTask: () => fetchTask });
function disallowedCommand(command) {
	return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
	const commands = ["fetch", ...customArgs];
	if (remote && branch) commands.push(remote, branch);
	if (commands.find(disallowedCommand)) return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
	return {
		commands,
		format: "utf-8",
		parser: parseFetchResult
	};
}
var init_fetch = __esm({ "src/lib/tasks/fetch.ts"() {
	"use strict";
	init_parse_fetch();
	init_task();
} });
function parseMoveResult(stdOut) {
	return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm({ "src/lib/parsers/parse-move.ts"() {
	"use strict";
	init_utils();
	parsers11 = [new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
		result.moves.push({
			from,
			to
		});
	})];
} });
var move_exports = {};
__export(move_exports, { moveTask: () => moveTask });
function moveTask(from, to) {
	return {
		commands: [
			"mv",
			"-v",
			...asArray(from),
			to
		],
		format: "utf-8",
		parser: parseMoveResult
	};
}
var init_move = __esm({ "src/lib/tasks/move.ts"() {
	"use strict";
	init_parse_move();
	init_utils();
} });
var pull_exports = {};
__export(pull_exports, { pullTask: () => pullTask });
function pullTask(remote, branch, customArgs) {
	const commands = ["pull", ...customArgs];
	if (remote && branch) commands.splice(1, 0, remote, branch);
	return {
		commands,
		format: "utf-8",
		parser(stdOut, stdErr) {
			return parsePullResult(stdOut, stdErr);
		},
		onError(result, _error, _done, fail) {
			const pullError = parsePullErrorResult(bufferToString(result.stdOut), bufferToString(result.stdErr));
			if (pullError) return fail(new GitResponseError(pullError));
			fail(_error);
		}
	};
}
var init_pull = __esm({ "src/lib/tasks/pull.ts"() {
	"use strict";
	init_git_response_error();
	init_parse_pull();
	init_utils();
} });
function parseGetRemotes(text) {
	const remotes = {};
	forEach(text, ([name]) => remotes[name] = { name });
	return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
	const remotes = {};
	forEach(text, ([name, url, purpose]) => {
		if (!Object.hasOwn(remotes, name)) remotes[name] = {
			name,
			refs: {
				fetch: "",
				push: ""
			}
		};
		if (purpose && url) remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
	});
	return Object.values(remotes);
}
function forEach(text, handler) {
	forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
var init_GetRemoteSummary = __esm({ "src/lib/responses/GetRemoteSummary.ts"() {
	"use strict";
	init_utils();
} });
var remote_exports = {};
__export(remote_exports, {
	addRemoteTask: () => addRemoteTask,
	getRemotesTask: () => getRemotesTask,
	listRemotesTask: () => listRemotesTask,
	remoteTask: () => remoteTask,
	removeRemoteTask: () => removeRemoteTask
});
function addRemoteTask(remoteName, remoteRepo, customArgs) {
	return straightThroughStringTask([
		"remote",
		"add",
		...customArgs,
		remoteName,
		remoteRepo
	]);
}
function getRemotesTask(verbose) {
	const commands = ["remote"];
	if (verbose) commands.push("-v");
	return {
		commands,
		format: "utf-8",
		parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
	};
}
function listRemotesTask(customArgs) {
	const commands = [...customArgs];
	if (commands[0] !== "ls-remote") commands.unshift("ls-remote");
	return straightThroughStringTask(commands);
}
function remoteTask(customArgs) {
	const commands = [...customArgs];
	if (commands[0] !== "remote") commands.unshift("remote");
	return straightThroughStringTask(commands);
}
function removeRemoteTask(remoteName) {
	return straightThroughStringTask([
		"remote",
		"remove",
		remoteName
	]);
}
var init_remote = __esm({ "src/lib/tasks/remote.ts"() {
	"use strict";
	init_GetRemoteSummary();
	init_task();
} });
var stash_list_exports = {};
__export(stash_list_exports, { stashListTask: () => stashListTask });
function stashListTask(opt = {}, customArgs) {
	const options = parseLogOptions(opt);
	const commands = [
		"stash",
		"list",
		...options.commands,
		...customArgs
	];
	const parser4 = createListLogSummaryParser(options.splitter, options.fields, logFormatFromCommand(commands));
	return validateLogFormatConfig(commands) || {
		commands,
		format: "utf-8",
		parser: parser4
	};
}
var init_stash_list = __esm({ "src/lib/tasks/stash-list.ts"() {
	"use strict";
	init_log_format();
	init_parse_list_log_summary();
	init_diff();
	init_log();
} });
var sub_module_exports = {};
__export(sub_module_exports, {
	addSubModuleTask: () => addSubModuleTask,
	initSubModuleTask: () => initSubModuleTask,
	subModuleTask: () => subModuleTask,
	updateSubModuleTask: () => updateSubModuleTask
});
function addSubModuleTask(repo, path) {
	return subModuleTask([
		"add",
		repo,
		path
	]);
}
function initSubModuleTask(customArgs) {
	return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
	const commands = [...customArgs];
	if (commands[0] !== "submodule") commands.unshift("submodule");
	return straightThroughStringTask(commands);
}
function updateSubModuleTask(customArgs) {
	return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm({ "src/lib/tasks/sub-module.ts"() {
	"use strict";
	init_task();
} });
function singleSorted(a, b) {
	const aIsNum = Number.isNaN(a);
	if (aIsNum !== Number.isNaN(b)) return aIsNum ? 1 : -1;
	return aIsNum ? sorted(a, b) : 0;
}
function sorted(a, b) {
	return a === b ? 0 : a > b ? 1 : -1;
}
function trimmed(input) {
	return input.trim();
}
function toNumber(input) {
	if (typeof input === "string") return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
	return 0;
}
var TagList, parseTagList;
var init_TagList = __esm({ "src/lib/responses/TagList.ts"() {
	"use strict";
	TagList = class {
		constructor(all, latest) {
			this.all = all;
			this.latest = latest;
		}
	};
	parseTagList = function(data, customSort = false) {
		const tags = data.split("\n").map(trimmed).filter(Boolean);
		if (!customSort) tags.sort(function(tagA, tagB) {
			const partsA = tagA.split(".");
			const partsB = tagB.split(".");
			if (partsA.length === 1 || partsB.length === 1) return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
			for (let i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
				const diff = sorted(toNumber(partsA[i]), toNumber(partsB[i]));
				if (diff) return diff;
			}
			return 0;
		});
		const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
		return new TagList(tags, latest);
	};
} });
var tag_exports = {};
__export(tag_exports, {
	addAnnotatedTagTask: () => addAnnotatedTagTask,
	addTagTask: () => addTagTask,
	tagListTask: () => tagListTask
});
function tagListTask(customArgs = []) {
	const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
	return {
		format: "utf-8",
		commands: [
			"tag",
			"-l",
			...customArgs
		],
		parser(text) {
			return parseTagList(text, hasCustomSort);
		}
	};
}
function addTagTask(name) {
	return {
		format: "utf-8",
		commands: ["tag", name],
		parser() {
			return { name };
		}
	};
}
function addAnnotatedTagTask(name, tagMessage) {
	return {
		format: "utf-8",
		commands: [
			"tag",
			"-a",
			"-m",
			tagMessage,
			name
		],
		parser() {
			return { name };
		}
	};
}
var init_tag = __esm({ "src/lib/tasks/tag.ts"() {
	"use strict";
	init_TagList();
} });
var require_git = __commonJS({ "src/git.js"(exports, module) {
	"use strict";
	var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS(git_executor_exports));
	var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS(simple_git_api_exports));
	var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
	var { adhocExecTask: adhocExecTask2, configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS(task_exports));
	var { asArray: asArray2, filterArray: filterArray2, filterPrimitives: filterPrimitives2, filterString: filterString2, filterStringOrStringArray: filterStringOrStringArray2, filterType: filterType2, getTrailingOptions: getTrailingOptions2, trailingFunctionArgument: trailingFunctionArgument2, trailingOptionsArgument: trailingOptionsArgument2 } = (init_utils(), __toCommonJS(utils_exports));
	var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS(apply_patch_exports));
	var { branchTask: branchTask2, branchLocalTask: branchLocalTask2, deleteBranchesTask: deleteBranchesTask2, deleteBranchTask: deleteBranchTask2 } = (init_branch(), __toCommonJS(branch_exports));
	var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS(check_ignore_exports));
	var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS(check_is_repo_exports));
	var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS(clean_exports));
	var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS(diff_exports));
	var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS(fetch_exports));
	var { moveTask: moveTask2 } = (init_move(), __toCommonJS(move_exports));
	var { pullTask: pullTask2 } = (init_pull(), __toCommonJS(pull_exports));
	var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS(push_exports));
	var { addRemoteTask: addRemoteTask2, getRemotesTask: getRemotesTask2, listRemotesTask: listRemotesTask2, remoteTask: remoteTask2, removeRemoteTask: removeRemoteTask2 } = (init_remote(), __toCommonJS(remote_exports));
	var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS(reset_exports));
	var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS(stash_list_exports));
	var { addSubModuleTask: addSubModuleTask2, initSubModuleTask: initSubModuleTask2, subModuleTask: subModuleTask2, updateSubModuleTask: updateSubModuleTask2 } = (init_sub_module(), __toCommonJS(sub_module_exports));
	var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS(tag_exports));
	var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS(task_exports));
	function Git2(options, plugins) {
		this._plugins = plugins;
		this._executor = new GitExecutor2(options.baseDir, new Scheduler2(options.maxConcurrentProcesses), plugins);
		this._trimmed = options.trimmed;
	}
	(Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
	Git2.prototype.customBinary = function(command) {
		this._plugins.reconfigure("binary", command);
		return this;
	};
	Git2.prototype.env = function(name, value) {
		if (arguments.length === 1 && typeof name === "object") this._executor.env = name;
		else (this._executor.env = this._executor.env || {})[name] = value;
		return this;
	};
	Git2.prototype.stashList = function(options) {
		return this._runTask(stashListTask2(trailingOptionsArgument2(arguments) || {}, filterArray2(options) && options || []), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.mv = function(from, to) {
		return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.checkoutLatestTag = function(then) {
		var git = this;
		return this.pull(function() {
			git.tags(function(err, tags) {
				git.checkout(tags.latest, then);
			});
		});
	};
	Git2.prototype.pull = function(remote, branch, options, then) {
		return this._runTask(pullTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.fetch = function(remote, branch) {
		return this._runTask(fetchTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.silent = function(silence) {
		return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this method will be removed.")));
	};
	Git2.prototype.tags = function(options, then) {
		return this._runTask(tagListTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.rebase = function() {
		return this._runTask(straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.reset = function(mode) {
		return this._runTask(resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.revert = function(commit) {
		const next = trailingFunctionArgument2(arguments);
		if (typeof commit !== "string") return this._runTask(configurationErrorTask2("Commit must be a string"), next);
		return this._runTask(straightThroughStringTask2([
			"revert",
			...getTrailingOptions2(arguments, 0, true),
			commit
		]), next);
	};
	Git2.prototype.addTag = function(name) {
		const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
		return this._runTask(task, trailingFunctionArgument2(arguments));
	};
	Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
		return this._runTask(addAnnotatedTagTask2(tagName, tagMessage), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
		return this._runTask(deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
		return this._runTask(deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.branch = function(options, then) {
		return this._runTask(branchTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.branchLocal = function(then) {
		return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.raw = function(commands) {
		const createRestCommands = !Array.isArray(commands);
		const command = [].slice.call(createRestCommands ? arguments : commands, 0);
		for (let i = 0; i < command.length && createRestCommands; i++) if (!filterPrimitives2(command[i])) {
			command.splice(i, command.length - i);
			break;
		}
		command.push(...getTrailingOptions2(arguments, 0, true));
		var next = trailingFunctionArgument2(arguments);
		if (!command.length) return this._runTask(configurationErrorTask2("Raw: must supply one or more command to execute"), next);
		return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
	};
	Git2.prototype.submoduleAdd = function(repo, path, then) {
		return this._runTask(addSubModuleTask2(repo, path), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.submoduleUpdate = function(args, then) {
		return this._runTask(updateSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.submoduleInit = function(args, then) {
		return this._runTask(initSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.subModule = function(options, then) {
		return this._runTask(subModuleTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.listRemote = function() {
		return this._runTask(listRemotesTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
		return this._runTask(addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.removeRemote = function(remoteName, then) {
		return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.getRemotes = function(verbose, then) {
		return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.remote = function(options, then) {
		return this._runTask(remoteTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.tag = function(options, then) {
		const command = getTrailingOptions2(arguments);
		if (command[0] !== "tag") command.unshift("tag");
		return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.updateServerInfo = function(then) {
		return this._runTask(straightThroughStringTask2(["update-server-info"]), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.pushTags = function(remote, then) {
		const task = pushTagsTask2({ remote: filterType2(remote, filterString2) }, getTrailingOptions2(arguments));
		return this._runTask(task, trailingFunctionArgument2(arguments));
	};
	Git2.prototype.rm = function(files) {
		return this._runTask(straightThroughStringTask2([
			"rm",
			"-f",
			...asArray2(files)
		]), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.rmKeepLocal = function(files) {
		return this._runTask(straightThroughStringTask2([
			"rm",
			"--cached",
			...asArray2(files)
		]), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.catFile = function(options, then) {
		return this._catFile("utf-8", arguments);
	};
	Git2.prototype.binaryCatFile = function() {
		return this._catFile("buffer", arguments);
	};
	Git2.prototype._catFile = function(format, args) {
		var handler = trailingFunctionArgument2(args);
		var command = ["cat-file"];
		var options = args[0];
		if (typeof options === "string") return this._runTask(configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"), handler);
		if (Array.isArray(options)) command.push.apply(command, options);
		const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
		return this._runTask(task, handler);
	};
	Git2.prototype.diff = function(options, then) {
		const task = filterString2(options) ? configurationErrorTask2("git.diff: supplying options as a single string is no longer supported, switch to an array of strings") : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
		return this._runTask(task, trailingFunctionArgument2(arguments));
	};
	Git2.prototype.diffSummary = function() {
		return this._runTask(diffSummaryTask2(getTrailingOptions2(arguments, 1)), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.applyPatch = function(patches) {
		const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(`git.applyPatch requires one or more string patches as the first argument`) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
		return this._runTask(task, trailingFunctionArgument2(arguments));
	};
	Git2.prototype.revparse = function() {
		const commands = ["rev-parse", ...getTrailingOptions2(arguments, true)];
		return this._runTask(straightThroughStringTask2(commands, true), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.clean = function(mode, options, then) {
		const usingCleanOptionsArray = isCleanOptionsArray2(mode);
		const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
		const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
		return this._runTask(cleanWithOptionsTask2(cleanMode, customArgs), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.exec = function(then) {
		return this._runTask({
			commands: [],
			format: "utf-8",
			parser() {
				if (typeof then === "function") then();
			}
		});
	};
	Git2.prototype.clearQueue = function() {
		return this._runTask(adhocExecTask2(() => console.warn("simple-git deprecation notice: clearQueue() is deprecated and will be removed, switch to using the abortPlugin instead.")));
	};
	Git2.prototype.checkIgnore = function(pathnames, then) {
		return this._runTask(checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))), trailingFunctionArgument2(arguments));
	};
	Git2.prototype.checkIsRepo = function(checkType, then) {
		return this._runTask(checkIsRepoTask2(filterType2(checkType, filterString2)), trailingFunctionArgument2(arguments));
	};
	module.exports = Git2;
} });
init_git_error();
var GitConstructError = class extends GitError {
	constructor(config, message) {
		super(void 0, message);
		this.config = config;
	}
};
init_git_error();
init_git_error();
var GitPluginError = class extends GitError {
	constructor(task, plugin, message) {
		super(task, message);
		this.task = task;
		this.plugin = plugin;
		Object.setPrototypeOf(this, new.target.prototype);
	}
};
init_git_response_error();
init_task_configuration_error();
init_check_is_repo();
init_clean();
init_config();
init_diff_name_status();
init_grep();
init_reset();
function abortPlugin(signal) {
	if (!signal) return;
	return [{
		type: "spawn.before",
		action(_data, context) {
			if (signal.aborted) context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
		}
	}, {
		type: "spawn.after",
		action(_data, context) {
			function kill() {
				context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
			}
			signal.addEventListener("abort", kill);
			context.spawned.on("close", () => signal.removeEventListener("abort", kill));
		}
	}];
}
function blockUnsafeOperationsPlugin(options = {}) {
	return {
		type: "spawn.args",
		action(args, { env }) {
			for (const vulnerability of ne(args, env)) if (options[vulnerability.category] !== true) throw new GitPluginError(void 0, "unsafe", vulnerability.message);
			return args;
		}
	};
}
init_utils();
function commandConfigPrefixingPlugin(configuration) {
	const prefix = prefixedArray(configuration, "-c");
	return {
		type: "spawn.args",
		action(data) {
			return [...prefix, ...data];
		}
	};
}
init_utils();
var never = (0, import_dist$1.deferred)().promise;
function completionDetectionPlugin({ onClose = true, onExit = 50 } = {}) {
	function createEvents() {
		let exitCode = -1;
		const events = {
			close: (0, import_dist$1.deferred)(),
			closeTimeout: (0, import_dist$1.deferred)(),
			exit: (0, import_dist$1.deferred)(),
			exitTimeout: (0, import_dist$1.deferred)()
		};
		const result = Promise.race([onClose === false ? never : events.closeTimeout.promise, onExit === false ? never : events.exitTimeout.promise]);
		configureTimeout(onClose, events.close, events.closeTimeout);
		configureTimeout(onExit, events.exit, events.exitTimeout);
		return {
			close(code) {
				exitCode = code;
				events.close.done();
			},
			exit(code) {
				exitCode = code;
				events.exit.done();
			},
			get exitCode() {
				return exitCode;
			},
			result
		};
	}
	function configureTimeout(flag, event, timeout) {
		if (flag === false) return;
		(flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
	}
	return {
		type: "spawn.after",
		async action(_data, { spawned, close }) {
			const events = createEvents();
			let deferClose = true;
			let quickClose = () => void (deferClose = false);
			spawned.stdout?.on("data", quickClose);
			spawned.stderr?.on("data", quickClose);
			spawned.on("error", quickClose);
			spawned.on("close", (code) => events.close(code));
			spawned.on("exit", (code) => events.exit(code));
			try {
				await events.result;
				if (deferClose) await delay(50);
				close(events.exitCode);
			} catch (err) {
				close(events.exitCode, err);
			}
		}
	};
}
init_utils();
var WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
var WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
function isBadArgument(arg) {
	return !arg || !/^([a-z]:)?([a-z0-9/.\\_~-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
	if (input.length < 1 || input.length > 2) throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
	if (input.some(isBadArgument)) if (allowUnsafe) console.warn(WRONG_CHARS_ERR);
	else throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
	const [binary, prefix] = input;
	return {
		binary,
		prefix
	};
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
	let config = toBinaryConfig(asArray(input), allowUnsafe);
	plugins.on("binary", (input2) => {
		config = toBinaryConfig(asArray(input2), allowUnsafe);
	});
	plugins.append("spawn.binary", () => {
		return config.binary;
	});
	plugins.append("spawn.args", (data) => {
		return config.prefix ? [config.prefix, ...data] : data;
	});
}
init_git_error();
function isTaskError(result) {
	return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
	return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
	return (error, result) => {
		if (!overwrite && error || !isError(result)) return error;
		return errorMessage(result);
	};
}
function errorDetectionPlugin(config) {
	return {
		type: "task.error",
		action(data, context) {
			const error = config(data.error, {
				stdErr: context.stdErr,
				stdOut: context.stdOut,
				exitCode: context.exitCode
			});
			if (Buffer.isBuffer(error)) return { error: new GitError(void 0, error.toString("utf-8")) };
			return { error };
		}
	};
}
init_utils();
var PluginStore = class {
	constructor() {
		this.plugins = /* @__PURE__ */ new Set();
		this.events = new EventEmitter();
	}
	on(type, listener) {
		this.events.on(type, listener);
	}
	reconfigure(type, data) {
		this.events.emit(type, data);
	}
	append(type, action) {
		const plugin = append(this.plugins, {
			type,
			action
		});
		return () => this.plugins.delete(plugin);
	}
	add(plugin) {
		const plugins = [];
		asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
		return () => {
			plugins.forEach((plugin2) => this.plugins.delete(plugin2));
		};
	}
	exec(type, data, context) {
		let output = data;
		const contextual = Object.freeze(Object.create(context));
		for (const plugin of this.plugins) if (plugin.type === type) output = plugin.action(output, contextual);
		return output;
	}
};
init_utils();
function progressMonitorPlugin(progress) {
	const progressCommand = "--progress";
	const progressMethods = [
		"checkout",
		"clone",
		"fetch",
		"pull",
		"push"
	];
	return [{
		type: "spawn.args",
		action(args, context) {
			if (!progressMethods.includes(context.method)) return args;
			return including(args, progressCommand);
		}
	}, {
		type: "spawn.after",
		action(_data, context) {
			if (!context.commands.includes(progressCommand)) return;
			context.spawned.stderr?.on("data", (chunk) => {
				const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
				if (!message) return;
				progress({
					method: context.method,
					stage: progressEventStage(message[1]),
					progress: asNumber(message[2]),
					processed: asNumber(message[3]),
					total: asNumber(message[4])
				});
			});
		}
	}];
}
function progressEventStage(input) {
	return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
init_utils();
function spawnOptionsPlugin(spawnOptions) {
	const options = pick(spawnOptions, ["uid", "gid"]);
	return {
		type: "spawn.options",
		action(data) {
			return {
				...options,
				...data
			};
		}
	};
}
function timeoutPlugin({ block, stdErr = true, stdOut = true }) {
	if (block > 0) return {
		type: "spawn.after",
		action(_data, context) {
			let timeout;
			function wait() {
				timeout && clearTimeout(timeout);
				timeout = setTimeout(kill, block);
			}
			function stop() {
				context.spawned.stdout?.off("data", wait);
				context.spawned.stderr?.off("data", wait);
				context.spawned.off("exit", stop);
				context.spawned.off("close", stop);
				timeout && clearTimeout(timeout);
			}
			function kill() {
				stop();
				context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
			}
			stdOut && context.spawned.stdout?.on("data", wait);
			stdErr && context.spawned.stderr?.on("data", wait);
			context.spawned.on("exit", stop);
			context.spawned.on("close", stop);
			wait();
		}
	};
}
function suffixPathsPlugin() {
	return {
		type: "spawn.args",
		action(data) {
			const prefix = [];
			let suffix;
			function append2(args) {
				(suffix = suffix || []).push(...args);
			}
			for (let i = 0; i < data.length; i++) {
				const param = data[i];
				if (r(param)) {
					append2(o(param));
					continue;
				}
				if (param === "--") {
					append2(data.slice(i + 1).flatMap((item) => r(item) && o(item) || item));
					break;
				}
				prefix.push(param);
			}
			return !suffix ? prefix : [
				...prefix,
				"--",
				...suffix.map(String)
			];
		}
	};
}
init_utils();
var Git = require_git();
function gitInstanceFactory(baseDir, options) {
	const plugins = new PluginStore();
	const config = createInstanceConfig(baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {}, options);
	if (!folderExists(config.baseDir)) throw new GitConstructError(config, `Cannot use simple-git on a directory that does not exist`);
	if (Array.isArray(config.config)) plugins.add(commandConfigPrefixingPlugin(config.config));
	plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
	plugins.add(completionDetectionPlugin(config.completion));
	config.abort && plugins.add(abortPlugin(config.abort));
	config.progress && plugins.add(progressMonitorPlugin(config.progress));
	config.timeout && plugins.add(timeoutPlugin(config.timeout));
	config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
	plugins.add(suffixPathsPlugin());
	plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
	config.errors && plugins.add(errorDetectionPlugin(config.errors));
	customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
	return new Git(config, plugins);
}
init_git_response_error();
var esm_default = gitInstanceFactory;
//#endregion
//#region electron/main.js
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var vaultPath = path.join(process.cwd(), "vault");
var git = esm_default(process.cwd());
var mainWindow;
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(path.join(process.cwd(), "dist/index.html"));
}
function parseVault() {
	const data = {
		dreams: [],
		projects: [],
		manuscripts: [],
		figures: [],
		experiments: [],
		protocols: [],
		inventory: []
	};
	Object.keys(data).forEach((tier) => {
		const tierDir = path.join(vaultPath, tier);
		if (fs.existsSync(tierDir)) fs.readdirSync(tierDir).filter((f) => f.endsWith(".md")).forEach((file) => {
			const filePath = path.join(tierDir, file);
			const { data: frontmatter, content } = (0, import_gray_matter.default)(fs.readFileSync(filePath, "utf8"));
			let parsedFrontmatter = frontmatter;
			data[tier].push({
				...parsedFrontmatter,
				description: content.trim() || frontmatter.description
			});
		});
	});
	return data;
}
app.whenReady().then(() => {
	createWindow();
	ipcMain.handle("get-vault-data", () => {
		return parseVault();
	});
	ipcMain.handle("update-vault-data", async (event, { tier, id, updates }) => {
		const filePath = path.join(vaultPath, tier, `${id}.md`);
		if (fs.existsSync(filePath)) {
			const { data: frontmatter, content } = (0, import_gray_matter.default)(fs.readFileSync(filePath, "utf8"));
			const newFrontmatter = {
				...frontmatter,
				...updates
			};
			let newContent = content;
			if (updates.description !== void 0) {
				newContent = updates.description + "\n";
				delete newFrontmatter.description;
			}
			const newFileContent = import_gray_matter.default.stringify(newContent, newFrontmatter);
			fs.writeFileSync(filePath, newFileContent);
			return { success: true };
		}
		return {
			success: false,
			error: "File not found"
		};
	});
	ipcMain.handle("create-vault-data", async (event, { tier, id, data }) => {
		const tierDir = path.join(vaultPath, tier);
		if (!fs.existsSync(tierDir)) fs.mkdirSync(tierDir, { recursive: true });
		const filePath = path.join(tierDir, `${id}.md`);
		const newFileContent = import_gray_matter.default.stringify("", data);
		fs.writeFileSync(filePath, newFileContent);
		return {
			success: true,
			id
		};
	});
	ipcMain.handle("git-sync", async () => {
		try {
			if (!await git.checkIsRepo()) await git.init();
			await git.add("./*");
			if ((await git.status()).staged.length > 0) await git.commit("Auto-sync from Scidream Desktop");
			if ((await git.getRemotes()).length > 0) {
				await git.pull("origin", "main", { "--rebase": "true" });
				await git.push("origin", "main");
			}
			return { success: true };
		} catch (err) {
			console.error("Git sync error:", err);
			return {
				success: false,
				error: err.message
			};
		}
	});
	const watcher = chokidar_default.watch(vaultPath, {
		ignored: /(^|[\/\\])\../,
		persistent: true
	});
	const notifyFrontend = () => {
		if (mainWindow) mainWindow.webContents.send("data-updated", parseVault());
	};
	watcher.on("add", notifyFrontend).on("change", notifyFrontend).on("unlink", notifyFrontend);
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
