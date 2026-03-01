import { createSignal, createEffect, onCleanup } from 'solid-js';

/**
 * A reactive counter component built with Solid.js
 * Demonstrates signals, effects, and cleanup patterns
 */
export default function ReactiveCounter() {
  const [count, setCount] = createSignal(0);
  const [isAnimating, setIsAnimating] = createSignal(false);
  const [autoIncrement, setAutoIncrement] = createSignal(false);

  let intervalId: number | undefined;

  createEffect(() => {
    if (autoIncrement()) {
      intervalId = window.setInterval(() => {
        setCount(prev => prev + 1);
        triggerAnimation();
      }, 1000);
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const increment = () => {
    setCount(prev => prev + 1);
    triggerAnimation();
  };

  const decrement = () => {
    setCount(prev => prev - 1);
    triggerAnimation();
  };

  const reset = () => {
    setCount(0);
    triggerAnimation();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case '+':
        increment();
        break;
      case 'ArrowDown':
      case '-':
        decrement();
        break;
      case 'Escape':
        reset();
        break;
    }
  };

  return (
    <div
      className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-blue-500"
      role="application"
      aria-label="Interactive counter"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="relative z-10 text-center text-white">
        <h3 className="mb-4 text-xl font-semibold" id="counter-title">
          Solid.js Reactive Counter
        </h3>

        <output
          className={`mb-6 block text-6xl font-bold tabular-nums transition-all duration-300 ${
            isAnimating() ? 'scale-110 text-yellow-300' : 'scale-100'
          }`}
          aria-live="polite"
          aria-atomic="true"
          aria-describedby="counter-title"
        >
          {count()}
        </output>

        <div className="space-x-4" role="group" aria-label="Counter controls">
          <button
            onClick={decrement}
            className="rounded-lg border border-white/30 bg-white/20 px-6 py-2 backdrop-blur-md transition-all duration-200 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
            aria-label="Decrease count by 1"
          >
            <span aria-hidden="true">-</span>
          </button>

          <button
            onClick={increment}
            className="rounded-lg border border-green-400/50 bg-green-500/80 px-6 py-2 backdrop-blur-md transition-all duration-200 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 focus:ring-offset-transparent"
            aria-label="Increase count by 1"
          >
            <span aria-hidden="true">+</span>
          </button>

          <button
            onClick={reset}
            className="rounded-lg border border-red-400/50 bg-red-500/80 px-6 py-2 backdrop-blur-md transition-all duration-200 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-transparent"
            aria-label="Reset count to zero"
          >
            Reset
          </button>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setAutoIncrement(!autoIncrement())}
            className={`rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
              autoIncrement()
                ? 'border border-yellow-400/50 bg-yellow-500/80 focus:ring-yellow-300'
                : 'border border-white/30 bg-white/20 focus:ring-white'
            }`}
            aria-pressed={autoIncrement() ? 'true' : 'false'}
            aria-label={`Auto increment: ${autoIncrement() ? 'enabled' : 'disabled'}`}
          >
            Auto: {autoIncrement() ? 'ON' : 'OFF'}
          </button>
        </div>

        <p className="mt-4 text-xs text-white/70">
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-xs">↑</kbd> /{' '}
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-xs">↓</kbd> to
          change,{' '}
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</kbd>{' '}
          to reset
        </p>
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 opacity-50 ${isAnimating() ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
    </div>
  );
}
