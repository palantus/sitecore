import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql'

export const SampleType = new GraphQLObjectType({
  name: 'SampleType',
  description: 'This represents a Sample',
  fields: () => ({
    message: { type: GraphQLNonNull(GraphQLString) },
  })
})

export default {
  registerQueries: (fields) => {
    fields.sample = {
      type: SampleType,
      description: "Gets sample",
      resolve: (parent, args, context) => ({ message: "Hello World" })
    }
  }
  
}