export class Clock {
    now(): number {
        return Date.now();
    }
}

export function Injectable(): ClassDecorator {
    return () => undefined;
}

@Injectable()
export class Scheduler {
    constructor(readonly clock: Clock) {}
}
