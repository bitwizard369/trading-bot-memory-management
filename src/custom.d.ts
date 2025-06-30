declare module 'react' {
  export = React;
  export as namespace React;
  
  namespace React {
    interface FC<P = {}> {
      (props: P): JSX.Element | null;
    }
    
    function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
    function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  }
}
