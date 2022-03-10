const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');


const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(`SELECT id, name, email, password
  FROM users
  WHERE email = $1;`, [email])
    .then((result)=> {
      return result.rows[0];
    })
    .catch((error) => {
      console.log(error.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  // return Promise.resolve(users[id]);

  return pool.query(`
    SELECT id, name, email, password
    FROM users
    WHERE id = $1`, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((error) => console.log(error.message));
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const {name, email, password} = user;

  return pool.query(`
      INSERT INTO users(name, email, password)
      VALUES ($1,$2,$3)
      RETURNING *;
      `, [name, email, password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((error) => {
      console.log(error);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
      SELECT reservations.id, reservations.start_date, avg(rating) as average_rating, properties.*
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT 10;
  `, [guest_id])
    .then((result) => {
      return result.rows;
    })
    .catch((error)=> {
      console.log(error.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  // console.log("🚀 ~ file: database.js ~ line 112 ~ getAllProperties ~ options", options);

  const queryParams = [];
  const {city, owner_id, minimum_price_per_night, maximum_price_per_night} = options;

  // HEADER FOR QUERY STRING
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    WHERE 1=1
  `;

  // Check if owner ID was passed-in
  if (owner_id) {
    queryParams.push(`${owner_id}`);
    queryString += `AND owner_id = $${queryParams.length}`;
  }

  // Check if min/max price
  if (minimum_price_per_night && maximum_price_per_night) {
    const min = parseInt(minimum_price_per_night,10) * 100;
    const max = parseInt(maximum_price_per_night,10) * 100;
    queryParams.push(min);
    queryString += `AND cost_per_night > $${queryParams.length}`;
    queryParams.push(max);
    queryString += `AND cost_per_night < $${queryParams.length}`;
  }

  // Check if city was added
  if (city) {
    queryParams.push(`%${city.toLowerCase()}%`);
    queryString += `AND LOWER(city) LIKE $${queryParams.length} `;
  }

  // FOOTER FOR QUERY STRING
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // console.log(queryString, queryParams);
  // console.log("🚀 ~ file: database.js ~ line 145 ~ getAllProperties ~ queryString", queryString);
  // console.log("queryParams", queryParams);

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;
