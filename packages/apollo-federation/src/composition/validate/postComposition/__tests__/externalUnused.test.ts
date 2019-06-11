import gql from 'graphql-tag';
import { composeServices } from '../../../compose';
import { externalUnused as validateExternalUnused } from '../';
import { graphqlErrorSerializer } from '../../../../snapshotSerializers';

expect.addSnapshotSerializer(graphqlErrorSerializer);

describe('externalUnused', () => {
  it('warns when there is an unused @external field', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "id") {
          sku: String!
          upc: String!
          id: ID!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product {
          sku: String! @external
          id: ID! @external
          price: Int! @requires(fields: "id")
        }
      `,
      name: 'serviceB',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toMatchInlineSnapshot(`
      Array [
        Object {
          "code": "EXTERNAL_UNUSED",
          "message": "[serviceB] Product.sku -> is marked as @external but is not used by a @requires, @key, or @provides directive.",
        },
      ]
    `);
  });

  it('does not warn when @external is selected by a @key', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "sku") {
          sku: String!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product @key(fields: "sku") {
          sku: String! @external
          price: Float!
        }
      `,
      name: 'serviceB',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });

  it('does not warn when @external is selected by a @requires', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "sku") {
          sku: String!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product {
          sku: String! @external
          price: Int! @requires(fields: "sku")
        }
      `,
      name: 'serviceB',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });

  it('does not warn when @external is selected by a @provides', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "sku") {
          sku: String!
          id: String!
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product @key(fields: "sku") {
          sku: String! @external
          price: Int! @provides(fields: "id")
        }
      `,
      name: 'serviceB',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });

  fit('does not warn when @external is selected by a @provides used from another type', () => {
    const serviceA = {
      typeDefs: gql`
        type User @key(fields: "id") {
          id: ID!
          username: String
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        type Review {
          author: User @provides(fields: "username")
        }

        extend type User @key(fields: "id") {
          username: String @external
        }
      `,
      name: 'serviceB',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });

  it('does not warn when @external is used on type with multiple @key directives', () => {
    const serviceA = {
      typeDefs: gql`
        type Product @key(fields: "upc") @key(fields: "sku") {
          upc: String
          sku: String
        }
      `,
      name: 'serviceA',
    };

    const serviceB = {
      typeDefs: gql`
        extend type Product @key(fields: "upc") {
          upc: String @external
        }
      `,
      name: 'serviceB',
    };

    const serviceC = {
      typeDefs: gql`
        extend type Product @key(fields: "sku") {
          sku: String @external
        }
      `,
      name: 'serviceC',
    };

    const { schema, errors } = composeServices([serviceA, serviceB, serviceC]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });

  xit('doesnt warn when valid @external fields are the only fields in a type', () => {
    const serviceB = {
      typeDefs: gql`
        extend type Query {
          kitchen: Kitchen
        }

        type Kitchen @key(fields: "id") {
          id: ID!
          name: String
        }
      `,
      name: 'serviceB',
    };
    const serviceA = {
      typeDefs: gql`
        extend type Query {
          me: User
        }

        extend type Kitchen @key(fields: "id") {
          id: ID! @external
          name: String @external
        }

        type User @key(fields: "username") {
          username: ID!
          firstName: String!
          kitchen: Kitchen @provides(fields: "name")
          lastName: String!
        }
      `,
      name: 'serviceA',
    };

    const { schema, errors } = composeServices([serviceA, serviceB]); //serviceB, serviceC]);
    const warnings = validateExternalUnused(schema);
    expect(warnings).toEqual([]);
  });
});
