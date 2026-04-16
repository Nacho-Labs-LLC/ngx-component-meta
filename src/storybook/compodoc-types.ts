/**
 * Compodoc JSON types as expected by Storybook's setCompodocJson().
 * These match what Storybook's code/frameworks/angular/src/client/compodoc.ts consumes.
 */

export interface CompodocJson {
  components: CompodocComponent[];
  directives: CompodocDirective[];
  pipes: CompodocPipe[];
  injectables: CompodocInjectable[];
  classes: CompodocClass[];
  miscellaneous?: {
    typealiases?: CompodocTypeAlias[];
    enumerations?: CompodocEnum[];
  };
}

export interface CompodocComponent {
  name: string;
  type: 'component';
  selector: string;
  exportAs?: string;
  inputsClass: CompodocProperty[];
  outputsClass: CompodocProperty[];
  propertiesClass: CompodocProperty[];
  methodsClass: CompodocMethod[];
  description?: string;
  rawdescription?: string;
}

export interface CompodocDirective {
  name: string;
  type: 'directive';
  selector: string;
  exportAs?: string;
  inputsClass: CompodocProperty[];
  outputsClass: CompodocProperty[];
  propertiesClass: CompodocProperty[];
  methodsClass: CompodocMethod[];
  description?: string;
  rawdescription?: string;
}

export interface CompodocPipe {
  name: string;
  type: 'pipe';
  description?: string;
  rawdescription?: string;
}

export interface CompodocInjectable {
  name: string;
  type: 'injectable';
}

export interface CompodocClass {
  name: string;
}

export interface CompodocProperty {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
  decorators?: CompodocDecorator[];
  description?: string;
  rawdescription?: string;
  jsdoctags?: CompodocJsDocTag[];
}

export interface CompodocDecorator {
  name: string;
  stringifiedArguments?: string;
}

export interface CompodocMethod {
  name: string;
  args: CompodocMethodArg[];
  returnType: string;
  description?: string;
  rawdescription?: string;
}

export interface CompodocMethodArg {
  name: string;
  type: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface CompodocJsDocTag {
  name: string;
  comment?: string;
}

export interface CompodocTypeAlias {
  name: string;
  rawtype: string;
}

export interface CompodocEnum {
  name: string;
  childs: { name: string; value: string }[];
}
