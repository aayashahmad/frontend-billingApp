import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Keyboard, Platform, TextInput } from 'react-native';

/** Breathing room between the focused field and the keyboard's top edge. */
const CLEARANCE = 24;

/**
 * Scrolls the focused input clear of the keyboard when it opens.
 *
 * The padding that `useKeyboardHeight` adds makes room to scroll, but under
 * edge-to-edge the window never resizes, so Android's usual scroll-to-the-
 * focused-view never fires — a field in the lower half of a form stayed
 * hidden behind the keyboard while the user typed blind.
 *
 * Returns an `onScroll` handler that must be attached to the same ScrollView
 * (with `scrollEventThrottle`), so the correction knows the current offset.
 */
export const useKeyboardInputScroll = (scrollRef) => {
  const offsetRef = useRef(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const subscription = Keyboard.addListener(showEvent, (event) => {
      const keyboardTop =
        event?.endCoordinates?.screenY ??
        Dimensions.get('window').height - (event?.endCoordinates?.height ?? 0);
      const input = TextInput.State.currentlyFocusedInput?.();
      if (!input || !scrollRef.current || !keyboardTop) return;

      // Wait a frame so the keyboard padding has landed before measuring.
      requestAnimationFrame(() => {
        input.measureInWindow((x, y, width, height) => {
          const overlap = y + height + CLEARANCE - keyboardTop;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({
              y: offsetRef.current + overlap,
              animated: true,
            });
          }
        });
      });
    });

    return () => subscription.remove();
  }, [scrollRef]);

  return useCallback((event) => {
    offsetRef.current = event?.nativeEvent?.contentOffset?.y ?? 0;
  }, []);
};

export default useKeyboardInputScroll;
