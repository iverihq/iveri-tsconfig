export interface Greeting {
    readonly text: string;
}

export function greet(name: string): Greeting {
    return { text: `Hello, ${name}` };
}
