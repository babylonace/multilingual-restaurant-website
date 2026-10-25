// The one piece of the Workers runtime this Worker uses, without pulling in @cloudflare/workers-types.
declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}
