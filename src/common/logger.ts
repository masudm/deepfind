export class CreateLogger {
  serviceName: string
  constructor(serviceName: string) {
    this.serviceName = serviceName
  }

  public info(output: any) {
    console.info(`[${this.serviceName}]: ${output}`)
  }

  public warn(output: any) {
    console.warn(`[${this.serviceName}]: ${output}`)
  }

  public error(output: any) {
    console.log(`[${this.serviceName}]: ${output}`)
  }

  public table(output: any) {
    console.table(`[${this.serviceName}]: ${output}`)
  }
}
