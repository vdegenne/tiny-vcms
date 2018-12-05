export const loggers: Logger[] = [];

export class Logger {
  name: string;
  display: boolean;

  constructor(name: string) {
    this.name = name;
    this.display = true;

    loggers.push(this);
  }

  setDisplay(display: boolean) {
    this.display = display;
  }

  log(message: string) {
    this.display && console.info(`[\x1b[36m${this.name}\x1b[0m]`, message);
  }

  info(message: string) {
    this.display && console.log(`[\x1b[36m${this.name}\x1b[0m]`, message);
  }

  warn(message: string) {
    this.display && console.log(`[\x1b[36m${this.name}\x1b[0m]`, `\x1b[33m${message}\x1b[0m`);
  }

  debug(message: string) {
    this.display && console.log(`[\x1b[36m${this.name}\x1b[0m]`, message);
  }

  success(message: string) {
    this.display && console.log(`[\x1b[36m${this.name}\x1b[0m]`, `\x1b[32m${message}\x1b[0m`);
  }

  error(message: string) {
    this.display && console.log(`[\x1b[36m${this.name}\x1b[0m]`, `\x1b[31m${message}\x1b[0m`);
  }
}
