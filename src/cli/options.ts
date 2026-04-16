export interface CliOptions {
  files: string[];
  project: string | undefined;
  output: string | undefined;
  format: 'json' | 'compodoc';
  pretty: boolean;
  noMethods: boolean;
  noInherited: boolean;
  help: boolean;
  version: boolean;
}

const HELP_TEXT = `
ngx-component-meta - Extract Angular component metadata as structured JSON

Usage:
  ngx-component-meta [options] <glob|files...>

Options:
  -p, --project <path>  Path to tsconfig.json (default: auto-detect)
  -o, --output <file>   Write output to file instead of stdout
  -f, --format <fmt>    Output format: json (default), compodoc
      --pretty          Pretty-print JSON (default when stdout is a TTY)
      --no-methods      Exclude methods from output
      --no-inherited    Exclude inherited members
      --version         Show version
  -h, --help            Show this help

Examples:
  ngx-component-meta "src/**/*.component.ts"
  ngx-component-meta -p tsconfig.lib.json -o docs/api.json "src/**/*.ts"
  ngx-component-meta -f compodoc "src/**/*.ts" > documentation.json
`.trim();

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    files: [],
    project: undefined,
    output: undefined,
    format: 'json',
    pretty: process.stdout.isTTY ?? false,
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
        options.format = argv[++i] as 'json' | 'compodoc';
        break;
      case '--pretty':
        options.pretty = true;
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
