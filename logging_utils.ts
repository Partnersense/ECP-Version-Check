export function logGreen(message: string) {
    console.log(`%c${message}`,"color: green; font-weight: bold;");
  }
  
export function logRed(message: string) {
    console.log(`%c${message}`,"color: red; font-weight: bold;");
  }

export function logPinkIndend(message: string) {
    console.log(`%c\t${message}`,"color: pink; font-weight: bold; font-style: italic; margin-left: 20px;");
  }