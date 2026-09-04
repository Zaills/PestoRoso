import { onMounted, onUnmounted } from 'vue'

export interface InputHandlers {
  onLeft: () => void
  onRight: () => void
  onDown: () => void
  onRotate: () => void
  onHardDrop: () => void
  onHold: () => void
}

/**
 * Binds the keyboard controls required by the subject to the game actions:
 * left/right to move, up to rotate, down to soft drop, space to hard drop,
 * plus "c" to hold the current piece.
 */
export function useInputHandler(handlers: InputHandlers) {
  const keyMap: Record<string, () => void> = {
    ArrowLeft: handlers.onLeft,
    ArrowRight: handlers.onRight,
    ArrowDown: handlers.onDown,
    ArrowUp: handlers.onRotate,
    ' ': handlers.onHardDrop,
    c: handlers.onHold,
    C: handlers.onHold,
  }

  function handleKey(event: KeyboardEvent) {
    const action = keyMap[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  onMounted(() => window.addEventListener('keydown', handleKey))
  onUnmounted(() => window.removeEventListener('keydown', handleKey))
}
