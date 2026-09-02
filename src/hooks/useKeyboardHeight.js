import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard, 0 when hidden.
 *
 * `KeyboardAvoidingView` derives its offset from the window resizing, which
 * no longer happens on Android under edge-to-edge — `adjustResize` leaves the
 * window full-screen and the view computes an inset of zero. Reading the
 * keyboard frame from the events themselves works the same way on both
 * platforms and needs no native module.
 */
export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS fires `Will` events ahead of the animation, so the layout lands in
    // step with the keyboard rather than a frame behind it.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setHeight(event?.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
};

export default useKeyboardHeight;
