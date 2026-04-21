import analytics from '@react-native-firebase/analytics';

export function trackLogActivity(taskName: string, points: number): void {
  analytics().logEvent('log_activity', { task_name: taskName, points }).catch(() => {});
}

export function trackCreateTask(taskName: string, points: number): void {
  analytics().logEvent('create_task', { task_name: taskName, points }).catch(() => {});
}

export function trackCreateHouse(): void {
  analytics().logEvent('create_house').catch(() => {});
}

export function trackJoinHouse(): void {
  analytics().logEvent('join_house').catch(() => {});
}

export function trackCompleteOnboarding(): void {
  analytics().logEvent('complete_onboarding').catch(() => {});
}

export function trackScreen(screenName: string): void {
  analytics().logScreenView({ screen_name: screenName, screen_class: screenName }).catch(() => {});
}
