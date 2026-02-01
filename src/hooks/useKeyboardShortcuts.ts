import { useEffect } from 'react';


type Handler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
    [combo: string]: Handler;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const modifiers = [];
            if (event.ctrlKey) modifiers.push('ctrl');
            if (event.altKey) modifiers.push('alt');
            if (event.shiftKey) modifiers.push('shift');
            if (event.metaKey) modifiers.push('meta');

            const key = event.key.toLowerCase();
            const combo = [...modifiers, key].join('+');

            // Also check for simple key matches if no modifiers (e.g. '?')
            const simpleKey = event.key;

            if (shortcuts[combo]) {
                event.preventDefault();
                shortcuts[combo](event);
            } else if (shortcuts[simpleKey]) {
                // Don't prevent default for single keys unless strictly necessary
                // to avoid blocking typing in inputs
                const target = event.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

                if (!isInput) {
                    event.preventDefault();
                    shortcuts[simpleKey](event);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}
