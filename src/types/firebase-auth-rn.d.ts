// Makes this file a module so declare module below is treated as augmentation, not replacement.
export {};

// Firebase v12 doesn't include getReactNativePersistence in its default TS types,
// but it IS exported in the React Native bundle resolved by Metro at runtime.
declare module 'firebase/auth' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getReactNativePersistence(storage: any): any;
}
