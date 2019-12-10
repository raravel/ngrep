#!/usr/bin/env node

import * as fs from 'fs';

const fg_color = (c:Number) => `\x1b[38;5;${c}m`;
const bg_color = (c:Number) => `\x1b[48;5;${c}m`;
const BOLD = "\x1b[1m";
const RESET = "\x1b[0;0;0m";

const color = (str: String, fg: Number, bg: Number = 0) => {
	return fg_color(fg) + bg_color(bg) + str + RESET;
};

const options = {
	"ignore-case" : false,
	"recursive"   : false,
	"line-number" : false
};

const printErrorExit = (msg: String) => {
	console.error(msg, "\n");
	console.error("Usage: ngrep [search] [file] [options...]");
	console.error("       search: javascript regex pattern string for search.");
	console.error("       file:   file pattern javascript regex string");
	console.error("");
	console.error("Options");
	console.error("  -i, --ignore-case       Ignore case distinctions in both the PATTERN and the input files.");
	console.error("  -r, --recursive         Read  all  files  under each directory.");
	console.error("  -n, --line-number       Prefix each line of output with the 1-based line number within its input file.");
	process.exit();
};

const parsingArgv = (argv: Array<String>) => {
	let i = 0, len = argv.length;
	for (i=0;i < len;i++) {
		switch ( argv[i] ) {
			case "-i":
			case "--ignore-case":
				options["ignore-case"] = true;
				break;
			case "-r":
			case "--recursive":
				options["recursive"] = true;
				break;
			case "-n":
			case "--line-number":
				options["line-number"] = true;
				break;
			default:
				if ( argv[i][0] === "-" )
					printErrorExit(`Invalid options ${argv[i]}`);
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
			f = color(file, 5) + color(':', 6) + color((lineNumber).toString(), 28) + color(':', 6) + " ";
		}
		return f + m;
	}
};

const realRunGrep = (file: string, searchPattern: string, options: Object) => {
	let buf = fs.readFileSync(file, {encoding: 'utf8'});
	buf.split('\n').forEach((line, idx) => {
		let m = matchingLine(line, searchPattern, options, file, idx+1);
		if ( m && m.length > 0 ) {
			console.log(m);
		}
	});
};

const grep = (pattern: string, searchPattern: string, path: String, options: Object) => {
	if ( pattern === undefined ) return;
	let fRegex = new RegExp(pattern, 'i');
	const matchFile = (_path: String, _recursive: Boolean) => {
		let dirs = fs.readdirSync(_path as fs.PathLike);
		let retDirs = [];
		dirs.forEach(d => {
			let target = pathJoin(_path, d);
			let stat = fs.lstatSync(target as fs.PathLike);
			if ( stat.isDirectory() ) {
				retDirs.push(target);
			} else {
				if ( d.match(fRegex) ) {
					// real run grep
					realRunGrep(target, searchPattern, options);
				}
			}

			if ( _recursive ) {
				retDirs.forEach(r => {
					matchFile(r, _recursive);
				});
			}
		});
		return retDirs;
	};
	return new Promise((resolve, reject) => {
		resolve(matchFile(path, options['recursive']) as Array<String>);
	});
};

let argv = process.argv.splice(2);

if ( argv.length < 1 ) {
	printErrorExit("There are few arguments.");
}

let searchPattern = argv[0];
let filePattern = argv[1];
let readStream = null;

let regex = new RegExp(searchPattern, 'g');

if ( filePattern === undefined ) {
	readStream = process.stdin;
	readStream.on('data', (chunk: String) => {
		let str = chunk.toString();
		str.split('\n').forEach(c => {
			let m = matchingLine(c, searchPattern, options);
			if ( m && m.length > 0 ) {
				console.log(m);
			}
		});
	});
} else {
	grep(filePattern, searchPattern, './', options);
}

