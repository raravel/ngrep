#!/usr/bin/env node

import * as fs from 'fs';

const fg_color = (c:Number) => `\x1b[38;5;${c}m`;
const bg_color = (c:Number) => `\x1b[48;5;${c}m`;
const BOLD = "\x1b[1m";
const RESET = "\x1b[0;0;0m";

let searchPattern = null; 
let filePattern = [];
let readStream = null;
let beforeQ = [];
let afterQ = [];

const color = (str: String, fg: Number, bg: Number = 0) => {
	return fg_color(fg) + bg_color(bg) + str + RESET;
};

const g_options = {
	"ignore-case"    : false,
	"recursive"      : false,
	"line-number"    : false,
	"no-messages"    : false,
	"exclude"        : null,
	"exclude-dir"    : null,
	"before-context" : 0,
	"after-context"  : 0,
	"include-hidden" : false,
	"include"        : null,
};

const errorMsg = (msg: String) => {
	if ( g_options['no-messages'] === false ) {
		console.error(msg);
	}
};

const printErrorExit = (msg: String) => {
	errorMsg(msg+"\n");
	errorMsg("Usage: ngrep [search] [file] [options...]");
	errorMsg("       search: javascript regex pattern string for search.");
	errorMsg("       file:   file pattern javascript regex string");
	errorMsg("");
	errorMsg("Options");
	errorMsg("  -i, --ignore-case          Ignore case distinctions in both the PATTERN and the input files.");
	errorMsg("  -r, --recursive            Read  all  files  under each directory.");
	errorMsg("  -n, --line-number          Prefix each line of output with the 1-based line number within its input file.");
	errorMsg("  -s, --no-messages          Suppress error messages.");
	errorMsg("  --include=FILE_PATTERN     skip files and directories matching FILE_PATTERN");
	errorMsg("  --exclude=FILE_PATTERN     skip files and directories matching FILE_PATTERN");
	errorMsg("  --exclude-dir=PATTERN      directories that match PATTERN will be skipped.");
	errorMsg("  -b, --before-context NUM   print NUM lines of leading context.");
	errorMsg("  -a, --after-context NUM    print NUM lines of trailing context.");
	errorMsg("  -H, --include-hidden       Include search pattern, hidden file or folder.");
	process.exit();
};

const parsingArgv = (argv: Array<String>) => {
	let i = 0, len = argv.length;
	for (i=0;i < len;i++) {
		if ( argv[i][0] === "-" ) {
			if ( argv[i][1] && argv[i][1] === "-" ) {
				// --[option]

				if ( argv[i].match(/--exclude=/) ) {
					g_options['exclude'] = argv[i].replace(/--exclude=/, "");
				} else if ( argv[i].match(/--exclude-dir=/) ) {
					g_options['exclude-dir'] = argv[i].replace(/--exclude-dir=/, "");
				} else if ( argv[i].match(/--include=/) ) {
					g_options['include'] = argv[i].replace(/--include=/, "");
				} else {
					switch ( argv[i] ) {
						case "--ignore-case": g_options['ignore-case'] = true; break;
						case "--recursive": g_options['recursive'] = true; break;
						case "--line-number": g_options['line-number'] = true; break;
						case "--no-messages": g_options['no-messages'] = true; break;
						case "--before-context" : g_options['before-context'] = parseInt(argv[++i] as string, 10); break;
						case "--after-context" : g_options['after-context'] = parseInt(argv[++i] as string, 10); break;
						case "--include-hidden" : g_options['include-hidden'] = true; break;
						default: printErrorExit('Invalid Options');
					}
				}

			} else {
				// -[options]
				let len = argv[i].length;
				for (let idx = 1;idx < len;idx++) {
					switch ( argv[i][idx] ) {
						case "i": g_options['ignore-case'] = true; break;
						case "r": g_options['recursive'] = true; break;
						case "n": g_options['line-number'] = true; break;
						case "s": g_options['no-messages'] = true; break;
						case "B": g_options['before-context'] = parseInt(argv[++i] as string, 10); break;
						case "A": g_options['after-context'] = parseInt(argv[++i] as string, 10); break;
						case "H": g_options['include-hidden'] = true; break;
						default: printErrorExit('Invalid Options');
					}
				}
			}
		} else {
			if ( searchPattern === null ) {
				searchPattern = argv[i];
			} else {
				filePattern.push(argv[i]);
			}
		}
	}
};

const pathJoin = (p1: String, p2: String) => {
	if ( p1[p1.length - 1] === "/" ) {
		if ( p2[0] === "/" ) {
			return p1.substr(0, p1.length-1)+p2;
		}
		return p1+""+p2;
	}

	if ( p2[0] === "/" ) {
		return p1 + "" + p2;
	}

	return p1+"/"+p2;
};

const mkLineStr = (line: Number, str: String, file?: String) => {
	let s = color((line).toString(), 28) + color(str, 6) + " ";
	if ( file ) {
		return color(file, 5) + color(':', 6) + s;
	}
	return s;
}

const matchingLine = (line: string, searchPattern: string, options: Object, file:String | undefined = undefined, lineNumber:Number | undefined = undefined) => {
	let flag = 'g';
	if ( options['ignore-case'] ) {
		flag+='i';
	}
	let regex = new RegExp(searchPattern, flag);
	if ( line.match(regex) ) {
		let m = line.replace(regex, BOLD + fg_color(11) + "$&" + RESET);
		let f = "";

		if ( typeof file === "string" && typeof lineNumber === "number" ) {
			// f = color(file, 5) + color(':', 6) + color((lineNumber).toString(), 28) + color(':', 6) + " ";
			f = mkLineStr(lineNumber, ':', file);
		}
		return f + m;
	}
};

const realRunGrep = (file: string, searchPattern: string, options: Object) => {
	let buf = fs.readFileSync(file, {encoding: 'utf8'});
	let buf_s = buf.split('\n');
	let len = buf_s.length;
	for(let i=0;i < len;i++) {
		let m = matchingLine(buf_s[i], searchPattern, options, file, i+1);
		if ( m && m.length > 0 ) {
			// before print
			if ( g_options['before-context'] > 0 ) {
				if ( beforeQ.length > 0 ) {
					console.log(color('--', 6));
				}
				for (let bidx = 0;beforeQ.length > 0; bidx++ ) {
					let lineNumber = i - ( g_options['before-context'] - bidx );
					console.log(mkLineStr(lineNumber, '-', file) + beforeQ.shift()); // pop in Q
				}
			}

			// matching line print
			console.log(m);

			// after print set
			if ( g_options['after-context'] > 0 ) {
				g_force_print = g_options['after-context'];
			}
		} else if ( g_force_print > 0 ) {
			// after print
			console.log(mkLineStr(i, '-', file) + buf_s[i]);
			g_force_print--;
		} else {
			// before stack q
			if ( g_options['before-context'] > 0 ) {
				if ( beforeQ.length >= g_options['before-context'] ) {
					beforeQ.shift();
				}
				beforeQ.push(buf_s[i]);
			}
		}
	};
};

const isHiddenPath = (path: String) => {
	let tmp = path.replace(/(\.{0,1}\/|)/, "");
	return tmp[0] === ".";
};

const matchFile = (fRegex: RegExp, path: String, recursive: Boolean) => {
	let dirs = fs.readdirSync(path as fs.PathLike);
	let retDirs = [];
	dirs.forEach(d => {
		let target = pathJoin(path, d);

		if ( !g_options['include-hidden'] && isHiddenPath(target) ) {
			return;
		}

		let stat = fs.lstatSync(target as fs.PathLike);
		if ( stat.isDirectory() ) {
			let excludeDir = g_options['exclude-dir'];
			let isExclude = false;

			if ( excludeDir ) {
				let eRegex = new RegExp(excludeDir, 'i');
				if ( d.match(eRegex) ) {
					isExclude = true;
				}
			}

			if ( isExclude === false ) {
				retDirs.push(target);
			}
		} else {
			let exclude = g_options['exclude'];
			let isExclude = false;

			if ( exclude ) {
				let eRegex = new RegExp(exclude, 'i');
				if ( d.match(eRegex) ) {
					isExclude = true;
				}
			}

			let include = g_options['include'];
			if ( include ) {
				let iRegex = new RegExp(include, 'i');
				if ( !d.match(iRegex) ) {
					isExclude = true;
				}
			}

			if ( isExclude === false ) {
				if ( d.match(fRegex) ) {
					// real run grep
					realRunGrep(target, searchPattern, g_options);
				}
			}
		}
	});

	if ( recursive ) {
		retDirs.forEach(r => {
			matchFile(fRegex, r, recursive);
		});
	}
	return retDirs;
};

const grep = (pattern: Array<string>, searchPattern: string, path: String, options: Object) => {
	if ( pattern === undefined ) return;
	pattern.forEach(p => {
		let fRegex = new RegExp(p, 'i');
		matchFile(fRegex, path, options['recursive']);
	});
};

let argv = process.argv.splice(2);

if ( argv.length < 1 ) {
	printErrorExit("There are few arguments.");
}
parsingArgv(argv);

let g_force_print = 0;

if ( (filePattern === undefined || filePattern.length === 0) && !g_options['recursive'] ) {
	readStream = process.stdin;
	readStream.on('data', (chunk: String) => {
		let str = chunk.toString();
		let str_s = str.split('\n');
		let len = str_s.length;
		for (let i = 0;i < len;i++) {
			let m = matchingLine(str_s[i], searchPattern, g_options);
			if ( m && m.length > 0 ) {
				// before print
				if ( g_options['before-context'] > 0 ) {
					if ( beforeQ.length > 0 ) {
						console.log(color('--', 6));
					}
					for (let bidx = 0;beforeQ.length > 0; bidx++ ) {
						let lineNumber = (i+1) - ( g_options['before-context'] - bidx );
						console.log(mkLineStr(lineNumber, '-') + beforeQ.shift()); // pop in Q
					}
				}

				// matching line print
				console.log(mkLineStr(i+1, ':') + m);

				// after print set
				if ( g_options['after-context'] > 0 ) {
					g_force_print = g_options['after-context'];
				}
			} else if ( g_force_print > 0 ) {
				// after print
				console.log(mkLineStr(i+1, '-') + str_s[i]);
				g_force_print--;
			} else {
				// before stack q
				if ( g_options['before-context'] > 0 ) {
					if ( beforeQ.length >= g_options['before-context'] ) {
						beforeQ.shift();
					}
					beforeQ.push(str_s[i]);
				}
			}
		};
	});
} else {
	if ( (filePattern === undefined || filePattern.length === 0) ) {
		filePattern.push(".*");
	}
	grep(filePattern, searchPattern, './', g_options);
}

