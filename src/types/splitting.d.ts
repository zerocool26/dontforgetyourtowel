declare module 'splitting' {
  export type SplittingResult = unknown;

  export interface SplittingOptions {
    target?: Element | Element[] | NodeListOf<Element>;
    by?: string;
    key?: string;
    whitespace?: boolean;
  }

  export default function Splitting(
    options?: SplittingOptions
  ): SplittingResult;
}
