export class CreateLogger {
  serviceName: string
  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  private startMessage() {
    console.info(`Service: ${this.serviceName} at ${new Date()}`)
  }

  public info(output: any) {
    this.startMessage()
    console.info(output)
  }

  public warn(output: any) {
    this.startMessage()
    console.warn(output)
  }

  public error(output: any) {
    this.startMessage()
    console.log(output)
  }

  public table(output: any) {
    this.startMessage()
    console.table(output)
  }
}
