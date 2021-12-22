import sample from './routes/sample.mjs';
import sampleQL from "./graphql/sample.mjs";

export default (app, graphQLFields) => {

  sample(app)
  
  sampleQL.registerQueries(graphQLFields)

  return app
}