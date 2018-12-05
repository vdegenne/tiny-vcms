import { Request } from 'express';
import User from '../models/User';
import Role from '../models/Role';



export interface AuthorizationDetails {
  pass: boolean;
  as: string | undefined;
  user: User | null;
}


export const getAuthorizationDetails = async (req: Request): Promise<AuthorizationDetails> => {

  let auth: AuthorizationDetails = { pass: false, as: undefined, user: null };

  auth.user = new User();

  if (req.session && req.session.user) {
    Object.assign(auth.user, req.session.user);
  }
  else {
    auth.user.logged = false;
    auth.user.roles = [new Role('GUEST')];
    auth.as = 'GUEST';
  }

  if (auth.user.hasRole('GUEST')) {
    auth.as = 'GUEST';
  }

  if (!auth.user.logged) {
    return auth;
  }

  if (auth.user.hasRole('ADMIN')) {
    return { ...auth, pass: true, as: 'ADMIN' };
  }

  if (auth.user.hasRole('USER') && auth.user.id) {
    auth.as = 'USER';

    if (!await auth.user.verifyExistence()) {
      return auth;  // user doesn't exist.
    }

    auth.pass = true;
    return auth;  // authorized. may need further verification though.
  }

  return auth;
};
