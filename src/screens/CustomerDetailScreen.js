/**
 * Route-level entry point — the implementation lives in /features/customers.
 *
 * Native stack mounts a screen's component only when the route is first
 * visited, so the detail screen is already lazily loaded by navigation.
 */
export { default } from '../features/customers/CustomerDetailScreen';
