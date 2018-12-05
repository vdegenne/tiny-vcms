import { CreamModel, RelationMappings } from '../vcms';

import Role from './Role';


class User extends CreamModel {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;

  logged: boolean;

  roles?: Role[];

  static tableName = 'users';
  static relationMappings: RelationMappings = {
    roles: {
      relation: CreamModel.ManyToManyRelation,
      modelClass: `${__dirname}/Role`,
      join: { from: 'users.id', through: { from: 'users_roles.user_id', to: 'users_roles.role_id' }, to: 'roles.id' }
    }
  }

  static jsonSchema = {
    type: 'object',
    required: ['username', 'firstname', 'lastname', 'email', 'password'],

    properties: {
      id: { type: 'integer' },
      username: { type: 'string' },
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      email: { type: 'string' },
      password: { type: 'string' }
    }
  }

  /* helpers */
  async verifyExistence() {
    if (!this.id) {
      throw new Error('the id property needs to be resolved before calling this function');
    }
    const user = await User.get(this.id);
    return (user ? true : false);
  }

  hasRole(role: string) {
    if (this.roles === undefined) {
      throw new Error('the roles need to be fetched before calling this function');
    }
    return this.roles.findIndex(r => r.name === role) > -1;
  }

  /* getters */
  static get = async (id: number, eager: string = '') => {
    return (await User.query().where('id', id).eager(eager))[0];
  };

  static getByUsername = async (username: string, eager: string = '') => {
    return (await User.query().where('username', username).eager(eager))[0];
  };
}


export default User;
