const fetch = require('node-fetch');

const toJson = (response) => response.json();
const toQueryParams = (params) => Object.entries(params).map(entry => entry.join('=')).join('&');
const createPackRepository = ({ token }) => {
  const baseUrl = `https://datoji.dev/packs`;
  const headers = {
    Authorization: `Token ${ token }`,
    'Content-Type': 'application/json',
  }
  return {
    createOne: (data) => fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entry: data,
      }),
    }).then(toJson),
    findOne: (id) => fetch(
      `${ baseUrl }/${ id }`,
      {
        method: 'GET',
        headers,
      }
    ).then(toJson),
    clearOne: (id) => fetch(
      `${ baseUrl }/${ id }/clear`,
      {
        method: 'POST',
        headers,
      }
    ).then(toJson),
    deleteOne: (id) => fetch(
      `${ baseUrl }/${ id }`,
      {
        method: 'DELETE',
        headers,
      }
    ),
  };
};
const createEntryRepository = ({ token, packId }) => {
  const baseUrl = `https://datoji.dev/packs/${ packId }/entries`;
  const headers = {
    Authorization: `Token ${ token }`,
    'Content-Type': 'application/json',
  }
  return {
    createOne: (data) => fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entry: data,
      }),
    }).then(toJson),
    createMany: (data) => fetch(`${ baseUrl }/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        entries: data,
      }),
    }).then(toJson),
    findAll: ({ page = 1, order = 'DESC' } = {}) => fetch(
      `${ baseUrl }?${ toQueryParams({ page, order }) }`,
      {
        method: 'GET',
        headers,
      },
    ).then(toJson),
    findOne: (id) => fetch(
      `${ baseUrl }/${ id }`,
      {
        method: 'GET',
        headers,
      }
    ).then(toJson),
    updateOne: (id, data) => fetch(
      `${ baseUrl }/${ id }`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          entry: data,
        }),
      }
    ).then(toJson),
    deleteOne: (id) => fetch(
      `${ baseUrl }/${ id }`,
      {
        method: 'DELETE',
        headers,
      }
    ),
  };
};

module.exports = {
  createPackRepository,
  createEntryRepository,
}
