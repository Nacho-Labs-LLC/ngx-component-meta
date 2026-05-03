export interface ExtractCliOptions {
  command: 'extract';
  files: string[];
  project: string | undefined;
  output: string | undefined;
  format: 'json' | 'compodoc' | 'markdown' | 'props-json';
  pretty: boolean;
  split: boolean;
  watch: boolean;
  noMethods: boolean;
  noInherited: boolean;
  help: boolean;
  version: boolean;
}

export interface DiffCliOptions {
  command: 'diff';
  base: string;
  head: string | undefined;
  project: string | undefined;
  output: string | undefined;
  format: 'text' | 'json' | 'markdown';
  noMethods: boolean;
  noInherited: boolean;
  help: boolean;
  version: boolean;
}

export interface LintCliOptions {
  command: 'lint';
  files: string[];
  project: string | undefined;
  output: string | undefined;
  format: 'text' | 'json' | 'stylish';
  noMethods: boolean;
  noInherited: boolean;
  help: boolean;
  version: boolean;
}

export interface StatsCliOptions {
  command: 'stats';
  files: string[];
  project: string | undefined;
  output: string | undefined;
  format: 'text' | 'json' | 'markdown';
  noMethods: boolean;
  noInherited: boolean;
  help: boolean;
  version: boolean;
}

export type CliOptions = ExtractCliOptions | DiffCliOptions | LintCliOptions | StatsCliOptions;

const HELP_TEXT = `
ngx-component-meta - Angular component API toolkit

Usage:
  ngx-component-meta [options] <glob|files...>
  ngx-component-meta diff [options]
  ngx-component-meta lint [options] <glob|files...>
  ngx-component-meta stats [options] <glob|files...>

Commands:
  (default)             Extract component metadata
  diff                  Compare two metadata snapshots and report breaking changes
  lint                  Enforce component documentation and quality rules
  stats                 Report signal migration progress

Extract Options:
  -p, --project <path>  Path to tsconfig.json (default: auto-detect)
  -o, --output <file>   Write output to file instead of stdout
  -f, --format <fmt>    Output format: json (default), compodoc, markdown, props-json
      --pretty          Pretty-print JSON (default when stdout is a TTY)
      --split           Write one file per component (markdown + --output)
  -w, --watch           Watch for file changes and rebuild automatically
      --no-methods      Exclude methods from output
      --no-inherited    Exclude inherited members
      --version         Show version
  -h, --help            Show this help

Diff Options:
      --base <file>     Base JSON file to compare from (required)
      --head <file>     Head JSON file to compare to (omit to parse current project)
  -p, --project <path>  Path to tsconfig.json (used when --head is omitted)
  -o, --output <file>   Write output to file instead of stdout
  -f, --format <fmt>    Output format: text (default), json, markdown
      --no-methods      Exclude methods when parsing current project
      --no-inherited    Exclude inherited members when parsing current project
  -h, --help            Show this help

Lint Options:
  -p, --project <path>  Path to tsconfig.json (default: auto-detect)
  -o, --output <file>   Write output to file instead of stdout
  -f, --format <fmt>    Output format: stylish (default), text, json
  -h, --help            Show this help

Stats Options:
  -p, --project <path>  Path to tsconfig.json (default: auto-detect)
  -o, --output <file>   Write output to file instead of stdout
  -f, --format <fmt>    Output format: text (default), json, markdown
  -h, --help            Show this help

Examples:
  ngx-component-meta "src/**/*.component.ts"
  ngx-component-meta -f props-json -o docs/api.json "src/**/*.ts"
  ngx-component-meta -f compodoc "src/**/*.ts" > documentation.json
  ngx-component-meta diff --base v1.json --head v2.json
  ngx-component-meta lint "src/**/*.ts"
  ngx-component-meta stats -p tsconfig.lib.json "src/**/*.ts"
`.trim();

export function parseArgs(argv: string[]): CliOptions {
  if (argv[0] === 'diff') {
    return parseDiffArgs(argv.slice(1));
  }
  if (argv[0] === 'lint') {
    return parseLintArgs(argv.slice(1));
  }
  if (argv[0] === 'stats') {
    return parseStatsArgs(argv.slice(1));
  }
  return parseExtractArgs(argv);
}

function parseDiffArgs(argv: string[]): DiffCliOptions {
  const options: DiffCliOptions = {
    command: 'diff',
    base: '',
    head: undefined,
    project: undefined,
    output: undefined,
    format: 'text',
    noMethods: false,
    noInherited: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      case '--base':
        options.base = argv[++i];
        break;
      case '--head':
        options.head = argv[++i];
        break;
      case '-p':
      case '--project':
        options.project = argv[++i];
        break;
      case '-o':
      case '--output':
        options.output = argv[++i];
        break;
      case '-f':
      case '--format':
        options.format = argv[++i] as 'text' | 'json' | 'markdown';
        break;
      case '--no-methods':
        options.noMethods = true;
        break;
      case '--no-inherited':
        options.noInherited = true;
        break;
      default:
        break;
    }
    i++;
  }

  return options;
}

function parseLintArgs(argv: string[]): LintCliOptions {
  const options: LintCliOptions = {
    command: 'lint',
    files: [],
    project: undefined,
    output: undefined,
    format: 'stylish',
    noMethods: false,
    noInherited: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      case '-p':
      case '--project':
        options.project = argv[++i];
        break;
      case '-o':
      case '--output':
        options.output = argv[++i];
        break;
      case '-f':
      case '--format':
        options.format = argv[++i] as 'text' | 'json' | 'stylish';
        break;
      case '--no-methods':
        options.noMethods = true;
        break;
      case '--no-inherited':
        options.noInherited = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.files.push(arg);
        }
        break;
    }
    i++;
  }

  return options;
}

function parseStatsArgs(argv: string[]): StatsCliOptions {
  const options: StatsCliOptions = {
    command: 'stats',
    files: [],
    project: undefined,
    output: undefined,
    format: 'text',
    noMethods: false,
    noInherited: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      case '-p':
      case '--project':
        options.project = argv[++i];
        break;
      case '-o':
      case '--output':
        options.output = argv[++i];
        break;
      case '-f':
      case '--format':
        options.format = argv[++i] as 'text' | 'json' | 'markdown';
        break;
      case '--no-methods':
        options.noMethods = true;
        break;
      case '--no-inherited':
        options.noInherited = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.files.push(arg);
        }
        break;
    }
    i++;
  }

  return options;
}

function parseExtractArgs(argv: string[]): ExtractCliOptions {
  const options: ExtractCliOptions = {
    command: 'extract',
    files: [],
    project: undefined,
    output: undefined,
    format: 'json',
    pretty: process.stdout.isTTY ?? false,
    split: false,
    watch: false,
    noMethods: false,
    noInherited: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--version':
        options.version = true;
        break;
      case '-p':
      case '--project':
        options.project = argv[++i];
        break;
      case '-o':
      case '--output':
        options.output = argv[++i];
        break;
      case '-f':
      case '--format':
        options.format = argv[++i] as 'json' | 'compodoc' | 'markdown';
        break;
      case '--pretty':
        options.pretty = true;
        break;
      case '--split':
        options.split = true;
        break;
      case '-w':
      case '--watch':
        options.watch = true;
        break;
      case '--no-methods':
        options.noMethods = true;
        break;
      case '--no-inherited':
        options.noInherited = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          options.files.push(arg);
        }
        break;
    }
    i++;
  }

  return options;
}

export function printHelp(): void {
  console.log(HELP_TEXT);
}
