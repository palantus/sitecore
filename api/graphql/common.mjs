import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt
} from 'graphql'

export let PageableResultInfo = new GraphQLObjectType({
  name: 'PageInfo',
  description: 'Page info',
  fields: () => ({
    totalCount: { type: GraphQLNonNull(GraphQLInt) }
  })
})

export const PageableSearchArgsType = new GraphQLInputObjectType({
  name: 'PageableSearchArgsType',
  fields: {
    query: { type: GraphQLString },
    last: { type: GraphQLInt },
    first: { type: GraphQLInt },
    start: { type: GraphQLInt },
    end: { type: GraphQLInt },
    after: { type: GraphQLInt },
    before: { type: GraphQLInt },
    reverse: { type: GraphQLBoolean },
    sort: { type: GraphQLString }
  }
});

export const HistoryType = new GraphQLObjectType({
  name: 'HistoryType',
  description: 'This represents a History entry',
  fields: () => ({
    type: { type: GraphQLString },
    timestamp: { type: GraphQLNonNull(GraphQLString) },
    typeName: { type: GraphQLString },
    typeText: { type: GraphQLString },
    text: { type: GraphQLString },
    valueFrom: { type: GraphQLString },
    valueTo: { type: GraphQLString },
    ref: { type: GraphQLString },
  })
})
