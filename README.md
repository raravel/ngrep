#  🇰🇷  ngrep

## Getting Started

First install ngrep:
``` bash
git clone https://github.com/mobbing/ngrep.git
cd ngrep
npm install
```

Compile ngrep.ts
``` bash
npm run compile
```

Compile and Run ngrep.js
``` bash
npm run start
```


You should have [nodejs](https://nodejs.org/ko/download/package-manager/) at least 8.x.

## How to use

Help:
```
Usage: ngrep [search] [file] [options...]
       search: javascript regex pattern string for search.
       file:   file pattern javascript regex string

Options
  -i, --ignore-case       Ignore case distinctions in both the PATTERN and the input files.
  -r, --recursive         Read  all  files  under each directory.
  -n, --line-number       Prefix each line of output with the 1-based line number within its input file.
  -s, --no-messages       Suppress error messages.
  --exclude FILE_PATTERN  skip files and directories matching FILE_PATTERN
  --exclude-dir PATTERN   directories that match PATTERN will be skipped.
```

Default:
``` bash
ngrep console '.*js'
```
![img1](./picture/ngrep-file.gif)

Stdin:
``` bash
cat ngrep.ts | ngrep console
```
![img2](./picture/ngrep-stdin.gif)

Javascript Regex
``` bash
cat ngrep.ts | ngrep "con.*err.*\ {2}.*directory"
```
![img3](./picture/ngrep-regex.gif)

## License
[MIT](./LICENSE)


