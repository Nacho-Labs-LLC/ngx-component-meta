declare module 'virtual:ngx-component-meta' {
  import type { ComponentDoc, PipeDoc } from 'ngx-component-meta';
  export const components: ComponentDoc[];
  export const pipes: PipeDoc[];
}

declare module 'virtual:ngx-component-meta/compodoc' {
  import type { CompodocJson } from 'ngx-component-meta/storybook';
  const json: CompodocJson;
  export default json;
}
