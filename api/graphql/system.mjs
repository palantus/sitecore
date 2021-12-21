import System from "../../models/system.mjs"

import {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLInputObjectType,
    GraphQLBoolean,
    GraphQLScalarType
  } from 'graphql'


export const FeatureFlagsType = new GraphQLObjectType({
    name: 'FeatureFlags',
    description: 'This represents system feature flags',
    fields: () => ({
        azure: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.azure || false},
        tasks: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.tasks || false},
        relay: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.relay || false},
        forumUpdater: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.forumUpdater || false},
        changesetUpdater: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.changesetUpdater || false},
        vstsUpdater: {type: GraphQLNonNull(GraphQLBoolean), resolve: flags => flags.vstsUpdater || false},
    })
})

export const SystemType = new GraphQLObjectType({
    name: 'System',
    description: 'This represents system setup',
    fields: () => ({
        azureClientId: {type: GraphQLString, resolve: system => system.azureClientId || null},
        azureTenant: {type: GraphQLString, resolve: system => system.azureTenant || null},
        azureSecret: {type: GraphQLString, resolve: system => system.azureSecret || null},
        azureSubscriptionId: {type: GraphQLString, resolve: system => system.azureSubscriptionId || null},
        relayURL: {type: GraphQLString, resolve: system => system.relayURL || null},
        relayUserId: {type: GraphQLString, resolve: system => system.relayUserId || null},
        relayKey: {type: GraphQLString, resolve: system => system.relayKey || null},
        flags: {type: FeatureFlagsType}
    })
  })

export default {
    SystemType,
    registerQueries: (fields) => {
        fields.system = {
            type: SystemType,
            description: "Get system setup",
            resolve: (parent, args, context) => System.lookup()
        }
    }
}