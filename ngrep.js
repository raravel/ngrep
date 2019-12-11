#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var fs = require("fs");
var fg_color = function (c) { return "\u001B[38;5;" + c + "m"; };
var bg_color = function (c) { return "\u001B[48;5;" + c + "m"; };
var BOLD = "\x1b[1m";
var RESET = "\x1b[0;0;0m";
var searchPattern = null;
var filePattern = [];
var readStream = null;
var color = function (str, fg, bg) {
    if (bg === void 0) { bg = 0; }
    return fg_color(fg) + bg_color(bg) + str + RESET;
};
var g_options = {
    "ignore-case": false,
    "recursive": false,
    "line-number": false,
    "no-messages": false,
    "exclude": null,
    "exclude-dir": null
};
var errorMsg = function (msg) {
    if (g_options['no-messages'] === false) {
        console.error(msg);
    }
};
var printErrorExit = function (msg) {
    errorMsg(msg + "\n");
    errorMsg("Usage: ngrep [search] [file] [options...]");
    errorMsg("       search: javascript regex pattern string for search.");
    errorMsg("       file:   file pattern javascript regex string");
    errorMsg("");
    errorMsg("Options");
    errorMsg("  -i, --ignore-case       Ignore case distinctions in both the PATTERN and the input files.");
    errorMsg("  -r, --recursive         Read  all  files  under each directory.");
    errorMsg("  -n, --line-number       Prefix each line of output with the 1-based line number within its input file.");
    errorMsg("  -s, --no-messages       Suppress error messages.");
    errorMsg("  --exclude FILE_PATTERN  skip files and directories matching FILE_PATTERN");
    errorMsg("  --exclude-dir PATTERN   directories that match PATTERN will be skipped.");
    process.exit();
};
var parsingArgv = function (argv) {
    var i = 0, len = argv.length;
    for (i = 0; i < len; i++) {
        if (argv[i][0] === "-") {
            if (argv[i][1] && argv[i][1] === "-") {
                // --[option]
                switch (argv[i]) {
                    case "--ignore-case":
                        g_options['ignore-case'] = true;
                        break;
                    case "--recursive":
                        g_options['recursive'] = true;
                        break;
                    case "--line-number":
                        g_options['line-number'] = true;
                        break;
                    case "--no-messages":
                        g_options['no-messages'] = true;
                        break;
                    case "--exclude":
                        g_options['exclude'] = argv[++i];
                        break;
                    case "--exclude-dir":
                        g_options['exclude-dir'] = argv[++i];
                        break;
                    default: printErrorExit('Invalid Options');
                }
            }
            else {
                // -[options]
                var len_1 = argv[i].length;
                for (var idx = 1; idx < len_1; idx++) {
                    switch (argv[i][idx]) {
                        case "i":
                            g_options['ignore-case'] = true;
                            break;
                        case "r":
                            g_options['recursive'] = true;
                            break;
                        case "n":
                            g_options['line-number'] = true;
                            break;
                        case "s":
                            g_options['no-messages'] = true;
                            break;
                        default: printErrorExit('Invalid Options');
                    }
                }
            }
        }
        else {
            if (searchPattern === null) {
                searchPattern = argv[i];
            }
            else {
                filePattern.push(argv[i]);
            }
        }
    }
};
var pathJoin = function (p1, p2) {
    if (p1[p1.length - 1] === "/") {
        if (p2[0] === "/") {
            return p1.substr(0, p1.length - 1) + p2;
        }
        return p1 + "" + p2;
    }
    if (p2[0] === "/") {
        return p1 + "" + p2;
    }
    return p1 + "/" + p2;
};
var matchingLine = function (line, searchPattern, options, file, lineNumber) {
    if (file === void 0) { file = undefined; }
    if (lineNumber === void 0) { lineNumber = undefined; }
    var flag = 'g';
    if (options['ignore-case']) {
        flag += 'i';
    }
    var regex = new RegExp(searchPattern, flag);
    if (line.match(regex)) {
        var m = line.replace(regex, BOLD + fg_color(11) + "$&" + RESET);
        var f = "";
        if (typeof file === "string" && typeof lineNumber === "number") {
            f = color(file, 5) + color(':', 6) + color((lineNumber).toString(), 28) + color(':', 6) + " ";
        }
        return f + m;
    }
};
var realRunGrep = function (file, searchPattern, options) {
    var buf = fs.readFileSync(file, { encoding: 'utf8' });
    buf.split('\n').forEach(function (line, idx) {
        var m = matchingLine(line, searchPattern, options, file, idx + 1);
        if (m && m.length > 0) {
            console.log(m);
        }
    });
};
var matchFile = function (fRegex, path, recursive) {
    var dirs = fs.readdirSync(path);
    var retDirs = [];
    dirs.forEach(function (d) {
        var target = pathJoin(path, d);
        var stat = fs.lstatSync(target);
        if (stat.isDirectory()) {
            var excludeDir = g_options['exclude-dir'];
            var isExclude = false;
            if (excludeDir) {
                var eRegex = new RegExp(excludeDir, 'i');
                if (d.match(eRegex)) {
                    isExclude = true;
                }
            }
            if (isExclude === false) {
                retDirs.push(target);
            }
        }
        else {
            var exclude = g_options['exclude'];
            var isExclude = false;
            if (exclude) {
                var eRegex = new RegExp(exclude, 'i');
                if (d.match(eRegex)) {
                    isExclude = true;
                }
            }
            if (isExclude === false) {
                if (d.match(fRegex)) {
                    // real run grep
                    realRunGrep(target, searchPattern, g_options);
                }
            }
        }
    });
    if (recursive) {
        retDirs.forEach(function (r) {
            matchFile(fRegex, r, recursive);
        });
    }
    return retDirs;
};
var grep = function (pattern, searchPattern, path, options) {
    if (pattern === undefined)
        return;
    pattern.forEach(function (p) {
        var fRegex = new RegExp(p, 'i');
        matchFile(fRegex, path, options['recursive']);
    });
};
var argv = process.argv.splice(2);
if (argv.length < 1) {
    printErrorExit("There are few arguments.");
}
parsingArgv(argv);
var regex = new RegExp(searchPattern, 'g');
if (filePattern === undefined) {
    readStream = process.stdin;
    readStream.on('data', function (chunk) {
        var str = chunk.toString();
        str.split('\n').forEach(function (c) {
            var m = matchingLine(c, searchPattern, g_options);
            if (m && m.length > 0) {
                console.log(m);
            }
        });
    });
}
else {
    grep(filePattern, searchPattern, './', g_options);
}
