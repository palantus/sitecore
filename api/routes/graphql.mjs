import user from "../graphql/user.mjs";
import system from "../graphql/system.mjs";

import expressGraphQL from 'express-graphql'
import {
  GraphQLSchema,
  GraphQLObjectType
} from 'graphql'

//https://github.com/WebDevSimplified/Learn-GraphQL/blob/master/server.js

export let fields = {}

export default (app) => {

  const RootQueryType = new GraphQLObjectType({
    name: 'Query',
    description: 'Root Query',
    fields: () => {

      //REGISTER ALL QUERIES HERE:
      user.registerQueries(fields)
      system.registerQueries(fields)

      return fields;
    }
  })

  const schema = new GraphQLSchema({
    query: RootQueryType
  })

    app.use("/graphql", (req, res, next) => {
      let gql = expressGraphQL({
        schema: schema,
        graphiql: true,
        context: {user: res.locals.user}
      })
      return gql(req, res, next)
    })
};
