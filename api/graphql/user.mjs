import User from "../../models/user.mjs"
import MSUser from "../../models/msuser.mjs"
import userService from "../../services/user.mjs"
import { validateAccess } from "../../services/auth.mjs"
import { sanitize } from "entitystorage"

import {
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLBoolean
  } from 'graphql'

export const MSUserType = new GraphQLObjectType({
    name: 'MSUser',
    description: 'This represents a Microsoft user',
    fields: () => ({
      id: { type: GraphQLString },
      name: { type: GraphQLString },
      email: { type: GraphQLNonNull(GraphQLString) },
      user: { type: UserType, resolve: ms => User.from(ms.related.user) },
      vsts: { type: GraphQLNonNull(GraphQLBoolean), resolve: u => u.tags.includes("vsts") },
    })
  })

export const UserType = new GraphQLObjectType({
    name: 'User',
    description: 'This represents a user',
    fields: () => ({
      id: { type: GraphQLNonNull(GraphQLString) },
      name: { type: GraphQLNonNull(GraphQLString) },
      passwordSet: { type: GraphQLNonNull(GraphQLBoolean), resolve: u => u.password ? true : false },
      msUsers: {
          type: GraphQLList(MSUserType),
          resolve: (user => MSUser.search(`tag:msuser rel:${User.lookup(user.id)}=user`))
      },
      activeMSUser: {type: GraphQLString, resolve: (parent, args, context) => context.user.activeMSUser},
      isDeveloper: { type: GraphQLNonNull(GraphQLBoolean), resolve: u => u.tags.includes("developer") },
      isTester: { type: GraphQLNonNull(GraphQLBoolean), resolve: u => u.tags.includes("tester") },
      forumName: { type: GraphQLString },
      vstsUserId: { type: GraphQLString },
      email: { type: GraphQLString },
      home: { type: GraphQLString, resolve: u => u.setup.home||null },
      roles: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
      permissions: {type: GraphQLNonNull(GraphQLList(GraphQLString))},
      active: {type: GraphQLNonNull(GraphQLBoolean)}
    })
  })

export const updateNameOperation = {
    type: UserType,
    description: 'Set name of user',
    args: {
      id: { type: GraphQLNonNull(GraphQLString) },
      name: { type: GraphQLNonNull(GraphQLString) }
    },
    resolve: (parent, args) => {
        const user = User.lookup(args.id)
        if(user){
            user.name = args.name
        }
        return user;
    }
  }


export const addNewUserOperation = {
  type: UserType,
  description: 'Add new user',
  args: {
    id: { type: GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLNonNull(GraphQLString) },
    msUsers: {type: GraphQLList(MSUserType)}
  },
  resolve: (parent, args) => {
      const user = User.lookup(args.id)
      if(user){
          user.name = args.name
      }
      return user;
  }
}



export default {
    UserType,
    MSUser,
    registerQueries: (fields) => {
      fields.me = {
          type: UserType,
          description: "Gets me",
          resolve: (parent, args, context) => userService(context).me()
      }
      fields.unassignedMSUsers = {
        type: GraphQLList(MSUserType),
        description: "Gets all MS users not assigned",
        resolve: (parent, args, context) => {
          if(!validateAccess(null, context, {permission: "user.read"})) return;
          return userService().getUnassignedMSUsers()
        }
      }
      fields.users = {
        type: GraphQLList(UserType),
        description: "Gets all users",
        resolve: (parent, args, context) => {
          if(!validateAccess(null, context, {permission: "user.read"})) return;
          return User.all()
        }
      }
      fields.usersActive = {
        type: GraphQLList(UserType),
        description: "Gets all users",
        resolve: (parent, args, context) => {
          if(!validateAccess(null, context, {permission: "user.read"})) return;
          return User.active()
        }
      }
      fields.user = {
        type: UserType,
        args: {
          id: { type: GraphQLString }
        },
        description: "Get user",
        resolve: (parent, args, context) => {
          if(!validateAccess(null, context, {permission: "user.read"})) return;
          return User.lookup(args.id)
        }
      }
      fields.msUsers = {
        type: GraphQLList(MSUserType),
        description: "Get ms users",
        resolve: (parent, args, context) => {
          if(!validateAccess(null, context, {permission: "user.read"})) return;
          return MSUser.all()
        }
      }
    }
}