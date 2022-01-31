import yargs from "yargs"

export default (mode) => {

  return {
    /**
     * Your favorite port
     */
    port: parseInt(yargs.argv.port || process.env[`PORT_${mode.toUpperCase()}`] || process.env.PORT || 8080),

    /**
     * API configs
     */
    api: {
      prefix: '',
    }
  }
}