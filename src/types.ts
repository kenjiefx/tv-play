export type TrustedVendorsParams = {
  appKey: string;
  secretKey: string;
  productId: string;
  reviewerEmail: string;
  reviewerType: "verified_buyer" | "verified_reviewer";
  digestAlgorithm: "HMAC" | "SHA256";
  signature: string;
  timestamp: number;
};

export type MainScope = TrustedVendorsParams & {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onUpdate: () => void;
};

export type SignatureViewerScope = TrustedVendorsParams & {
  copyMessage: () => void;
};

export type SignatureViewer = {
  setSignature: (signature: string, params: TrustedVendorsParams) => void;
};

export type SubmissionMethodType =
  | "landing_page"
  | "reviews_widget"
  | "api_endpoint";
export type SubmissionMethodScope = TrustedVendorsParams & {
  method: SubmissionMethodType;
  handleSelectMethod: (method: SubmissionMethodType) => void;
  getButtonStyle: (method: SubmissionMethodType) => string;
};

export type SubmissionMethod = {
  setParams: (params: TrustedVendorsParams) => void;
};

export type SignatureService = {
  generateHMAC: (
    p: {
      reviewerEmail: string;
      reviewerType: "verified_buyer" | "verified_reviewer";
      productId: string;
      timestamp: number;
    },
    secretKey: string,
  ) => Promise<string>;
  generateSHA256: (p: {
    reviewerEmail: string;
    reviewerType: "verified_buyer" | "verified_reviewer";
    productId: string;
    timestamp: number;
    secretKey: string;
  }) => Promise<string>;
};

/** All configuration you can pass when creating an instance of the app. */
export type PluncAppConfiguration = {
  /**
   * Prefix for Plunc-related HTML attributes.
   * By default, the application assumes using `plunc-`,
   * i.e., `plunc-if`, `plunc-repeat`.
   **/
  prefix?: string;
  /**
   * You can hook a function that will execute before the app kernel
   * starts booting. The function should return a Promise,
   * and must return `true`, otherwise, the kernel will not start.
   * @returns Promise that resolves to boolean value
   */
  startFn?: () => Promise<boolean>;
  /**
   * Hook a function that executes after the app completes
   * rendering.
   */
  endFn?: () => Promise<void>;
};

/**
 * Requires all fields of a type to be non-optional.
 */
export type RequireAllFields<T> = {
  [K in keyof T]-?: T[K];
};

/**
 * All expected return types of handler functions
 */
export type ResolvedHandlers =
  | null
  | (new (...args: any[]) => any)
  | { [key: string]: any }
  | void;

/** Service and component handler functions */
export type HandlerFunction<TDependecies extends any[], TObject> = (
  ...args: TDependecies
) => TObject;

/** Factory handler function */
export type FactoryHandlerFunction<TDependecies extends any[]> = (
  ...args: TDependecies
) => new (...args: any[]) => any;

/** Helper handler function */
export type HelperHandlerFunction<
  TDependecies extends any[],
  TObject,
> = HandlerFunction<TDependecies, TObject | void>;

/** All types of handlers */
export type PluncHandlers = {
  [K in keyof PluncAppInstance]: PluncAppInstance[K] extends (
    ...args: any[]
  ) => any
    ? K
    : never;
}[keyof PluncAppInstance];

export type PluncAppInstance = {
  /**
   * Registers a component in your application. You can pass the type or interface of the
   * component `<TComponent>`.
   * @param name - The name of the component
   * @param handler - The callback function that returns methods and properties implemented by `TComponent`
   */
  component: <TComponent>(
    name: string,
    handler: HandlerFunction<any[], TComponent>,
  ) => void;

  /**
   * Registers a service in your application. You can pass the type or interface
   * of the service `<TService>`
   * @param name  - The name of the service
   * @param handler - The callback function that returns methods and properties implemented by `TService`
   */
  service: <TService>(
    name: string,
    handler: HandlerFunction<any[], TService>,
  ) => void;

  /**
   * Registers a factory in your application. You can pass the type or interface
   * of the factory `<TFactory>`
   * @param name - The name of the factory
   * @param handler - The callback function that returns methods and properties implemented by `TFactory`
   */
  factory: <TFactory>(
    name: string,
    handler: FactoryHandlerFunction<any[]>,
  ) => void;

  /**
   * Registers a helper in your application. You can pass the type or interface
   * of the service `<THelper>`
   * @param name  - The name of the service
   * @param handler - The callback function that returns methods and properties implemented by `THelper`
   */
  helper: <THelper>(
    name: string,
    handler: HelperHandlerFunction<unknown[], THelper>,
  ) => void;
};

// The type of the plunc object itself
export interface Plunc {
  create(
    applicationName: string,
    configuration?: PluncAppConfiguration | null,
  ): PluncAppInstance;
}

export interface PluncElementInterface<TElement extends HTMLElement> {
  /**
   * A reference to the element itself.
   * (Shouldn't be minified, as publicly-accessible)
   */
  $element: TElement;
  /**
   * A reference to parent element, wrapped in this `PluncElement` object
   * (Shouldn't be minified, as publicly-accessible)
   */
  $parent: PluncElementInterface<TElement>;
  /** Retrieves the $element */
  get(): TElement;
  /** Retrieves the state */
  getState(): string | null;
  /** Sets the state */
  setState(state: string): void;
  /** Adds a class */
  addClass(className: string): void;
  /** List existing classes */
  listClass(): Array<string>;
  /** Removes a class */
  removeClass(className: string): void;
  /** Toggle class names */
  toggleClass(className: string): void;
}

/** Block API requires call back function */
export type BlockCallback<TElement extends HTMLElement> = (
  element: PluncElementInterface<TElement> | null,
) => void;

export type PatchAPI = (blockName?: string) => Promise<void>;

export type AppAPI = {
  ready: (callback: () => void) => void;
};

export type BlockAPI = <TElement extends HTMLElement>(
  elementName: string,
  callback: BlockCallback<TElement>,
) => void;

declare const plunc: Plunc;
export default plunc;
