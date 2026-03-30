import { createContext, useContext } from 'react';

type OnboardingContextValue = {
  resetOnboarding: () => void;
};

export const OnboardingContext = createContext<OnboardingContextValue>({
  resetOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}
