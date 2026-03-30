export const haptics = {
  light:   () => navigator.vibrate?.(30),
  medium:  () => navigator.vibrate?.(60),
  success: () => navigator.vibrate?.([40, 30, 80]),
  error:   () => navigator.vibrate?.([80, 40, 80]),
}
