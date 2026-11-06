import { ROOT_ID } from './constants';

export function rootElement(): HTMLElement | null {
    return document.getElementById(ROOT_ID);
}
